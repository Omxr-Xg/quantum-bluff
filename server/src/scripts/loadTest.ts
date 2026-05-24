/**
 * Stress test Socket.IO : crée des users réels en DB, ouvre N connexions authentifiées,
 * affiche un résumé et quitte proprement.
 *
 * Usage :
 *   npx tsx src/scripts/loadTest.ts
 *   LOAD_TEST_CLIENTS=500 LOAD_TEST_INTERVAL_MS=10 npx tsx src/scripts/loadTest.ts
 */
import dotenv from 'dotenv'
import bcrypt from 'bcryptjs'
import { io, type Socket } from 'socket.io-client'
import { prisma } from '../config/database.js'
import { generateToken } from '../auth/jwt.service.js'

dotenv.config()

const TARGET_URL = process.env.LOAD_TEST_TARGET_URL ?? 'http://localhost:3000'
const MAX_CLIENTS = Number(process.env.LOAD_TEST_CLIENTS ?? '2000')
const INTERVAL_MS = Number(process.env.LOAD_TEST_INTERVAL_MS ?? '25')
const CONNECT_TIMEOUT_MS = Number(process.env.LOAD_TEST_CONNECT_TIMEOUT_MS ?? '15000')
const USERNAME_PREFIX = 'loadtest_'
const PASSWORD_HASH_ROUNDS = 4

type Counters = {
  attempted: number
  connected: number
  failed: number
}

const counters: Counters = {
  attempted: 0,
  connected: 0,
  failed: 0,
}

const sockets: Socket[] = []
const failureSamples: string[] = []
const MAX_FAILURE_SAMPLES = 5

function logProgress(force = false): void {
  if (!force && counters.attempted % 50 !== 0 && counters.attempted !== MAX_CLIENTS) return
  console.log(
    `[progress] tentatives=${counters.attempted}/${MAX_CLIENTS} connectés=${counters.connected} échecs=${counters.failed}`,
  )
}

function recordFailure(message: string): void {
  counters.failed++
  if (failureSamples.length < MAX_FAILURE_SAMPLES) {
    failureSamples.push(message)
  }
}

async function ensureLoadTestUsers(count: number): Promise<Map<number, string>> {
  console.log(`[seed] création / vérification de ${count} users (${USERNAME_PREFIX}*)…`)
  const passwordHash = await bcrypt.hash('loadtest-secret', PASSWORD_HASH_ROUNDS)
  const batchSize = 100

  for (let start = 1; start <= count; start += batchSize) {
    const end = Math.min(start + batchSize - 1, count)
    const rows: Array<{ username: string; email: string; password: string }> = []
    for (let n = start; n <= end; n++) {
      rows.push({
        username: `${USERNAME_PREFIX}${n}`,
        email: `${USERNAME_PREFIX}${n}@load.test`,
        password: passwordHash,
      })
    }
    await prisma.user.createMany({ data: rows, skipDuplicates: true })
    console.log(`[seed] batch ${start}-${end} ok`)
  }

  const users = await prisma.user.findMany({
    where: { username: { startsWith: USERNAME_PREFIX } },
    select: { id: true, username: true },
    orderBy: { username: 'asc' },
  })

  const userIds = new Map<number, string>()
  for (const user of users) {
    const n = Number.parseInt(user.username.slice(USERNAME_PREFIX.length), 10)
    if (Number.isFinite(n) && n >= 1 && n <= count) {
      userIds.set(n, user.id)
    }
  }

  if (userIds.size < count) {
    throw new Error(
      `[seed] seulement ${userIds.size}/${count} users trouvés en base — vérifie Postgres et relance.`,
    )
  }

  console.log(`[seed] ${userIds.size} users prêts`)
  return userIds
}

function createClient(id: number, userId: string): void {
  counters.attempted++
  const token = generateToken({ userId })

  const socket = io(TARGET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: false,
    timeout: CONNECT_TIMEOUT_MS,
  })

  sockets.push(socket)
  let settled = false

  const settle = (ok: boolean, detail?: string): void => {
    if (settled) return
    settled = true
    if (ok) {
      counters.connected++
    } else {
      recordFailure(detail ?? `client ${id}: échec inconnu`)
    }
    logProgress()
    maybeFinish()
  }

  socket.on('connect', () => {
    settle(true)
  })

  socket.on('connect_error', (err: Error) => {
    settle(false, `client ${id}: ${err.message}`)
  })

  setTimeout(() => {
    if (!settled) {
      settle(false, `client ${id}: timeout après ${CONNECT_TIMEOUT_MS}ms`)
      socket.close()
    }
  }, CONNECT_TIMEOUT_MS)
}

let finishStarted = false
let spawnDone = false

function maybeFinish(): void {
  if (!spawnDone) return
  if (counters.connected + counters.failed < MAX_CLIENTS) return
  if (finishStarted) return
  finishStarted = true
  void finish()
}

async function fetchActiveSocketMetric(): Promise<string | null> {
  try {
    const res = await fetch(`${TARGET_URL}/metrics`)
    if (!res.ok) return null
    const text = await res.text()
    const line = text
      .split('\n')
      .find((l) => l.startsWith('socket_io_connections_active ') && !l.startsWith('#'))
    return line ?? null
  } catch {
    return null
  }
}

async function finish(): Promise<void> {
  logProgress(true)

  const metricLine = await fetchActiveSocketMetric()
  const successRate =
    MAX_CLIENTS > 0 ? ((counters.connected / MAX_CLIENTS) * 100).toFixed(1) : '0'

  console.log('\n=== Résumé stress test ===')
  console.log(`Cible           : ${TARGET_URL}`)
  console.log(`Clients visés   : ${MAX_CLIENTS}`)
  console.log(`Connectés       : ${counters.connected}`)
  console.log(`Échecs          : ${counters.failed}`)
  console.log(`Taux de succès  : ${successRate}%`)
  if (metricLine) {
    console.log(`Métrique serveur: ${metricLine}`)
  }
  if (failureSamples.length > 0) {
    console.log('Exemples d’échecs :')
    for (const sample of failureSamples) {
      console.log(`  - ${sample}`)
    }
  }

  for (const socket of sockets) {
    socket.disconnect()
  }
  await prisma.$disconnect()

  if (counters.connected === MAX_CLIENTS) {
    console.log('\n✅ Stress test OK — toutes les connexions Socket.IO sont passées.')
    process.exit(0)
  }

  if (counters.connected > 0) {
    console.log('\n⚠️ Stress test partiel — certaines connexions ont échoué.')
    process.exit(1)
  }

  console.log('\n❌ Stress test échoué — aucune connexion établie.')
  process.exit(1)
}

async function main(): Promise<void> {
  if (!Number.isFinite(MAX_CLIENTS) || MAX_CLIENTS < 1) {
    throw new Error('LOAD_TEST_CLIENTS doit être un entier >= 1')
  }

  console.log(
    `🚀 Stress test Socket.IO — objectif ${MAX_CLIENTS} clients (intervalle ${INTERVAL_MS}ms)`,
  )

  const userIds = await ensureLoadTestUsers(MAX_CLIENTS)

  let currentId = 1
  const interval = setInterval(() => {
    const userId = userIds.get(currentId)
    if (!userId) {
      throw new Error(`userId manquant pour loadtest_${currentId}`)
    }
    createClient(currentId, userId)
    currentId++
    if (currentId > MAX_CLIENTS) {
      clearInterval(interval)
      spawnDone = true
      console.log(`[spawn] ${MAX_CLIENTS} tentatives lancées — attente des connexions…`)
      maybeFinish()
    }
  }, INTERVAL_MS)
}

main().catch(async (err) => {
  console.error('Stress test interrompu :', err instanceof Error ? err.message : err)
  for (const socket of sockets) {
    socket.disconnect()
  }
  await prisma.$disconnect().catch(() => {})
  process.exit(1)
})
