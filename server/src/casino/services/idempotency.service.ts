import { createHash } from 'node:crypto'
import redisClient, { isRedisHealthy } from '../../config/redis.config.js'

/**
 * Durée de rétention des entrées d'idempotence (Redis TTL + fenêtre GC mémoire).
 * Au-delà après une tentative acceptée mais abandonnée sans résultat stocké, une nouvelle
 * requête avec le même actionId obtient une nouvelle entrée : aucun rejeu serveur, le client
 * doit générer un nouvel actionId pour un nouveau spin. Après expiration, un retry « tardif »
 * avec le même actionId se comporte comme une première intention (même risque double débit
 * que sans idempotence — d’où l’importance du TTL côté ops et du client stable jusqu’à réponse HTTP OK).
 */
export const CASINO_IDEMPOTENCY_TTL_SEC = 15 * 60

const REDIS_PREFIX = 'casino:idem:'

type Stored = {
  fp?: string
  result?: unknown
  createdAt: number
}

const memoryStore = new Map<string, Stored>()

function gcMemory(): void {
  const now = Date.now()
  const maxAge = CASINO_IDEMPOTENCY_TTL_SEC * 1000
  for (const [k, v] of memoryStore.entries()) {
    if (now - v.createdAt > maxAge) memoryStore.delete(k)
  }
}

let redisOkCache: boolean | null = null
let redisCheckAt = 0
const REDIS_RECHECK_MS = 10_000

async function useRedis(): Promise<boolean> {
  const now = Date.now()
  if (redisOkCache !== null && now - redisCheckAt < REDIS_RECHECK_MS) {
    return redisOkCache
  }
  redisCheckAt = now
  try {
    redisOkCache = await isRedisHealthy()
  } catch {
    redisOkCache = false
  }
  return redisOkCache
}

function redisKey(fullKey: string): string {
  return `${REDIS_PREFIX}${fullKey}`
}

/** Canonique JSON (clés triées, tableaux triés par sérialisation) pour lier l'idempotence au payload. */
export function fingerprintStableJson(payload: unknown): string {
  const normalized = canonicalizeJson(payload)
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex')
}

function canonicalizeJson(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) {
    const items = value.map(canonicalizeJson)
    items.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    return items
  }
  const obj = value as Record<string, unknown>
  const keys = Object.keys(obj).sort()
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = canonicalizeJson(obj[k])
  return out
}

export function buildIdempotencyKey(input: {
  userId: string
  gameType: string
  actionId: string
}): string {
  return `${input.gameType}:${input.userId}:${input.actionId}`
}

export type TryBeginIdempotentResult =
  | { accepted: true }
  | { accepted: false; reason: 'DUPLICATE_ACTION'; storedResult?: unknown }
  | { accepted: false; reason: 'PAYLOAD_MISMATCH' }

function evaluateDuplicate(
  stored: Stored,
  incomingFp: string | undefined
): TryBeginIdempotentResult {
  if (stored.fp && incomingFp && stored.fp !== incomingFp) {
    return { accepted: false, reason: 'PAYLOAD_MISMATCH' }
  }
  if (stored.result !== undefined) {
    return { accepted: false, reason: 'DUPLICATE_ACTION', storedResult: stored.result }
  }
  return { accepted: false, reason: 'DUPLICATE_ACTION' }
}

async function tryBeginRedis(
  fullKey: string,
  incomingFp: string | undefined,
  depth = 0
): Promise<TryBeginIdempotentResult> {
  if (depth > 3) {
    return tryBeginMemory(fullKey, incomingFp)
  }
  const createdAt = Date.now()
  const initial: Stored = { ...(incomingFp ? { fp: incomingFp } : {}), createdAt }
  const ok = await redisClient.set(
    redisKey(fullKey),
    JSON.stringify(initial),
    'EX',
    CASINO_IDEMPOTENCY_TTL_SEC,
    'NX'
  )
  if (ok === 'OK') {
    memoryStore.set(fullKey, initial)
    return { accepted: true }
  }
  const raw = await redisClient.get(redisKey(fullKey))
  if (!raw) {
    return tryBeginRedis(fullKey, incomingFp, depth + 1)
  }
  let parsed: Stored
  try {
    parsed = JSON.parse(raw) as Stored
  } catch {
    return { accepted: false, reason: 'DUPLICATE_ACTION' }
  }
  memoryStore.set(fullKey, parsed)
  return evaluateDuplicate(parsed, incomingFp)
}

function tryBeginMemory(fullKey: string, incomingFp: string | undefined): TryBeginIdempotentResult {
  gcMemory()
  const existing = memoryStore.get(fullKey)
  if (existing) {
    return evaluateDuplicate(existing, incomingFp)
  }
  memoryStore.set(fullKey, {
    ...(incomingFp ? { fp: incomingFp } : {}),
    createdAt: Date.now(),
  })
  return { accepted: true }
}

export async function tryBeginIdempotentAction(
  fullKey: string,
  options?: { payloadFingerprint?: string }
): Promise<TryBeginIdempotentResult> {
  const incomingFp = options?.payloadFingerprint
  if (await useRedis()) {
    return tryBeginRedis(fullKey, incomingFp)
  }
  return tryBeginMemory(fullKey, incomingFp)
}

export async function saveIdempotentResult(fullKey: string, result: unknown): Promise<void> {
  const memoryEntry = memoryStore.get(fullKey)
  const base: Stored =
    memoryEntry ??
    ({
      createdAt: Date.now(),
    } as Stored)
  const next: Stored = { ...base, result }
  memoryStore.set(fullKey, next)

  if (await useRedis()) {
    const raw = await redisClient.get(redisKey(fullKey))
    let parsed: Stored = next
    if (raw) {
      try {
        const existing = JSON.parse(raw) as Stored
        parsed = { ...existing, result }
      } catch {
        parsed = next
      }
    }
    await redisClient.set(redisKey(fullKey), JSON.stringify(parsed), 'EX', CASINO_IDEMPOTENCY_TTL_SEC)
  }
}

export async function getIdempotentResult(fullKey: string): Promise<unknown | null> {
  gcMemory()
  const memEntry = memoryStore.get(fullKey)
  if (memEntry && memEntry.result !== undefined) return memEntry.result

  if (await useRedis()) {
    const raw = await redisClient.get(redisKey(fullKey))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Stored
      memoryStore.set(fullKey, parsed)
      return parsed.result !== undefined ? parsed.result : null
    } catch {
      return null
    }
  }
  return null
}

/** Libère la clé après une erreur avant persistance du résultat (validation, 5xx, etc.). */
export async function abortIdempotentAction(fullKey: string): Promise<void> {
  memoryStore.delete(fullKey)
  if (await useRedis()) {
    try {
      await redisClient.del(redisKey(fullKey))
    } catch {
      /* ignore */
    }
  }
}

/** Tests uniquement : vide le store mémoire (Redis non touché). */
export function __resetIdempotencyMemoryStoreForTests(): void {
  memoryStore.clear()
}
