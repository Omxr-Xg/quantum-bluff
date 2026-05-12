import type { Server } from 'socket.io'
import { jest } from '@jest/globals'

/* -------------------------------------------------------------------------- */
/* In-memory DB (rejouée par les mocks Prisma ci-dessous).                    */
/* -------------------------------------------------------------------------- */

type Tournament = {
  id: string
  status: string
  initialStack: number
  blindSmall: number
  blindBig: number
  currentRoundNumber: number
  nextRoundReadyOpen: boolean
  nextRoundReadyDeadline: Date | null
  nextRoundReadyNumber: number | null
}

type Player = {
  tournamentId: string
  userId: string
  status: string
  eliminationOrder: number | null
}

type ReadyRow = {
  tournamentId: string
  roundNumber: number
  userId: string
  readyAt: Date
  autoReady: boolean
}

/* Préfixé `mock*` pour autoriser l'accès depuis les `jest.mock()` hoistés. */
const mockDb = {
  tournaments: new Map<string, Tournament>(),
  players: new Map<string, Player>(),
  ready: [] as ReadyRow[],
}
const db = mockDb

function pkPlayer(tournamentId: string, userId: string): string {
  return `${tournamentId}::${userId}`
}

function resetDb(): void {
  mockDb.tournaments.clear()
  mockDb.players.clear()
  mockDb.ready = []
}

/* -------------------------------------------------------------------------- */
/* Mocks Prisma (chargés AVANT l'import des services).                        */
/* -------------------------------------------------------------------------- */

jest.mock('../config/database.js', () => {
  const pk = (tournamentId: string, userId: string): string =>
    `${tournamentId}::${userId}`
  return {
    prisma: {
      tournament: {
        findUnique: jest.fn(async (args: { where: { id: string } }) => {
          const t = mockDb.tournaments.get(args.where.id)
          if (!t) return null
          return { ...t }
        }),
        update: jest.fn(
          async (args: { where: { id: string }; data: Partial<Tournament> }) => {
            const t = mockDb.tournaments.get(args.where.id)
            if (!t) throw new Error('Tournament not found')
            Object.assign(t, args.data)
            return { ...t }
          },
        ),
        updateMany: jest.fn(
          async (args: {
            where: { id: string; nextRoundReadyOpen?: boolean }
            data: Partial<Tournament>
          }) => {
            const t = mockDb.tournaments.get(args.where.id)
            if (!t) return { count: 0 }
            if (
              args.where.nextRoundReadyOpen != null &&
              t.nextRoundReadyOpen !== args.where.nextRoundReadyOpen
            ) {
              return { count: 0 }
            }
            Object.assign(t, args.data)
            return { count: 1 }
          },
        ),
        findMany: jest.fn(
          async (args: {
            where: {
              status?: string
              nextRoundReadyOpen?: boolean
              nextRoundReadyDeadline?: { lte: Date }
            }
          }) => {
            const out: Tournament[] = []
            for (const t of mockDb.tournaments.values()) {
              if (args.where.status && t.status !== args.where.status) continue
              if (
                args.where.nextRoundReadyOpen != null &&
                t.nextRoundReadyOpen !== args.where.nextRoundReadyOpen
              )
                continue
              if (
                args.where.nextRoundReadyDeadline?.lte &&
                (!t.nextRoundReadyDeadline ||
                  t.nextRoundReadyDeadline > args.where.nextRoundReadyDeadline.lte)
              )
                continue
              out.push({ ...t })
            }
            return out
          },
        ),
      },
      tournamentPlayer: {
        findUnique: jest.fn(
          async (args: {
            where: { tournamentId_userId: { tournamentId: string; userId: string } }
          }) => {
            const p = mockDb.players.get(
              pk(
                args.where.tournamentId_userId.tournamentId,
                args.where.tournamentId_userId.userId,
              ),
            )
            if (!p) return null
            return { ...p }
          },
        ),
        findMany: jest.fn(
          async (args: { where: { tournamentId: string; status?: string } }) => {
            const out: Player[] = []
            for (const p of mockDb.players.values()) {
              if (p.tournamentId !== args.where.tournamentId) continue
              if (args.where.status && p.status !== args.where.status) continue
              out.push({ ...p })
            }
            return out
          },
        ),
        updateMany: jest.fn(
          async (args: {
            where: { tournamentId: string; userId?: { in?: string[] }; status?: string }
            data: Partial<Player>
          }) => {
            let count = 0
            for (const p of mockDb.players.values()) {
              if (p.tournamentId !== args.where.tournamentId) continue
              if (
                args.where.userId?.in &&
                !args.where.userId.in.includes(p.userId)
              )
                continue
              if (args.where.status && p.status !== args.where.status) continue
              Object.assign(p, args.data)
              count += 1
            }
            return { count }
          },
        ),
      },
      tournamentRoundReady: {
        findMany: jest.fn(
          async (args: { where: { tournamentId: string; roundNumber: number } }) => {
            return mockDb.ready.filter(
              (r) =>
                r.tournamentId === args.where.tournamentId &&
                r.roundNumber === args.where.roundNumber,
            )
          },
        ),
        upsert: jest.fn(
          async (args: {
            where: {
              tournamentId_roundNumber_userId: {
                tournamentId: string
                roundNumber: number
                userId: string
              }
            }
            create: ReadyRow
            update: Partial<ReadyRow>
          }) => {
            const k = args.where.tournamentId_roundNumber_userId
            const existing = mockDb.ready.find(
              (r) =>
                r.tournamentId === k.tournamentId &&
                r.roundNumber === k.roundNumber &&
                r.userId === k.userId,
            )
            if (existing) {
              Object.assign(existing, args.update)
              return { ...existing }
            }
            const row: ReadyRow = {
              tournamentId: k.tournamentId,
              roundNumber: k.roundNumber,
              userId: k.userId,
              readyAt: args.create.readyAt ?? new Date(),
              autoReady: args.create.autoReady ?? false,
            }
            mockDb.ready.push(row)
            return { ...row }
          },
        ),
        createMany: jest.fn(
          async (args: { data: ReadyRow[]; skipDuplicates?: boolean }) => {
            let count = 0
            for (const r of args.data) {
              const exists = mockDb.ready.some(
                (x) =>
                  x.tournamentId === r.tournamentId &&
                  x.roundNumber === r.roundNumber &&
                  x.userId === r.userId,
              )
              if (exists) {
                if (!args.skipDuplicates) throw new Error('Duplicate')
                continue
              }
              mockDb.ready.push({ ...r, readyAt: r.readyAt ?? new Date() })
              count += 1
            }
            return { count }
          },
        ),
        deleteMany: jest.fn(
          async (args: {
            where: {
              tournamentId: string
              roundNumber: number
              userId: string
              autoReady?: boolean
            }
          }) => {
            const before = mockDb.ready.length
            mockDb.ready = mockDb.ready.filter(
              (r) =>
                !(
                  r.tournamentId === args.where.tournamentId &&
                  r.roundNumber === args.where.roundNumber &&
                  r.userId === args.where.userId &&
                  (args.where.autoReady == null || r.autoReady === args.where.autoReady)
                ),
            )
            return { count: before - mockDb.ready.length }
          },
        ),
      },
    },
  }
})

/* Mock du runtime : on n'importe PAS la vraie `proceedToNextRound`
 * (elle dépendrait de spawnRoundTables / activeGames). On la remplace par un mock
 * idempotent qui consomme le flag `nextRoundReadyOpen` comme la prod. */
const mockProceedSpy = jest.fn(async (_io: unknown, tournamentId: string) => {
  const t = mockDb.tournaments.get(tournamentId)
  if (!t || !t.nextRoundReadyOpen) return false
  t.nextRoundReadyOpen = false
  t.status = 'ROUND_IN_PROGRESS'
  t.currentRoundNumber = t.nextRoundReadyNumber ?? t.currentRoundNumber + 1
  t.nextRoundReadyDeadline = null
  t.nextRoundReadyNumber = null
  return true
})

jest.mock('../tournament/tournament.runtime.service.js', () => ({
  proceedToNextRound: (...args: unknown[]) =>
    mockProceedSpy(args[0], args[1] as string),
}))

const proceedSpy = mockProceedSpy

/* eslint-disable @typescript-eslint/no-var-requires */
const {
  openRoundReadyCheck,
  markRoundReady,
  computeReadyState,
  autoReadyAndProceed,
  processExpiredRoundReadyWindows,
  TOURNAMENT_ROUND_READY_TIMEOUT_MS,
} = require('../tournament/tournament.roundReady.service.js')
/* eslint-enable */

/* -------------------------------------------------------------------------- */
/* Helpers de fixtures.                                                       */
/* -------------------------------------------------------------------------- */

function makeIoMock(): { io: Server; emitted: Array<[string, string, unknown]> } {
  const emitted: Array<[string, string, unknown]> = []
  const io = {
    to(room: string) {
      return {
        emit(event: string, payload: unknown) {
          emitted.push([room, event, payload])
        },
      }
    },
  } as unknown as Server
  return { io, emitted }
}

function seedTournament(
  id: string,
  survivors: string[],
  opts: Partial<Tournament> = {},
): void {
  db.tournaments.set(id, {
    id,
    status: 'ROUND_IN_PROGRESS',
    initialStack: 1000,
    blindSmall: 10,
    blindBig: 20,
    currentRoundNumber: 1,
    nextRoundReadyOpen: false,
    nextRoundReadyDeadline: null,
    nextRoundReadyNumber: null,
    ...opts,
  })
  for (const uid of survivors) {
    db.players.set(pkPlayer(id, uid), {
      tournamentId: id,
      userId: uid,
      status: 'WAITING_NEXT_ROUND',
      eliminationOrder: null,
    })
  }
}

/* -------------------------------------------------------------------------- */
/* Tests.                                                                     */
/* -------------------------------------------------------------------------- */

beforeEach(() => {
  resetDb()
  proceedSpy.mockClear()
})

describe('openRoundReadyCheck', () => {
  it('ouvre la fenêtre, fixe la deadline, et émet TOURNAMENT_ROUND_READY_OPENED', async () => {
    seedTournament('t1', ['u1', 'u2', 'u3', 'u4'])
    const { io, emitted } = makeIoMock()

    const start = Date.now()
    await openRoundReadyCheck(io, 't1', 2, ['u1', 'u2', 'u3', 'u4'])

    const t = db.tournaments.get('t1')!
    expect(t.status).toBe('WAITING_READY_CHECK')
    expect(t.nextRoundReadyOpen).toBe(true)
    expect(t.nextRoundReadyNumber).toBe(2)
    expect(t.nextRoundReadyDeadline).toBeInstanceOf(Date)
    const deadlineMs = t.nextRoundReadyDeadline!.getTime()
    expect(deadlineMs - start).toBeGreaterThanOrEqual(TOURNAMENT_ROUND_READY_TIMEOUT_MS - 50)
    expect(deadlineMs - start).toBeLessThanOrEqual(TOURNAMENT_ROUND_READY_TIMEOUT_MS + 250)

    const opens = emitted.filter(([, ev]) => ev === 'TOURNAMENT_ROUND_READY_OPENED')
    /* 1 sur la room tournoi + 1 par survivant. */
    expect(opens.length).toBe(1 + 4)
    expect(opens[0]![2]).toEqual(
      expect.objectContaining({
        tournamentId: 't1',
        roundNumber: 2,
        surviving: ['u1', 'u2', 'u3', 'u4'],
        isFinal: false,
      }),
    )
  })

  it('skippe quand survivors <= 1 (cas finalisé)', async () => {
    seedTournament('t1', ['u1'])
    const { io } = makeIoMock()
    await openRoundReadyCheck(io, 't1', 2, ['u1'])
    const t = db.tournaments.get('t1')!
    expect(t.nextRoundReadyOpen).toBe(false)
    expect(t.status).toBe('ROUND_IN_PROGRESS')
  })

  it('marque isFinal=true quand survivors entre 2 et 3', async () => {
    seedTournament('t1', ['u1', 'u2', 'u3'])
    const { io, emitted } = makeIoMock()
    await openRoundReadyCheck(io, 't1', 2, ['u1', 'u2', 'u3'])
    const opened = emitted.find(([, ev]) => ev === 'TOURNAMENT_ROUND_READY_OPENED')!
    expect((opened[2] as { isFinal: boolean }).isFinal).toBe(true)
  })
})

describe('markRoundReady', () => {
  it('rejette si la fenêtre n’est pas ouverte', async () => {
    seedTournament('t1', ['u1', 'u2'])
    const { io } = makeIoMock()
    const res = await markRoundReady(io, 't1', 'u1', true)
    expect(res.ok).toBe(false)
    expect(proceedSpy).not.toHaveBeenCalled()
  })

  it('insère une ligne ready et émet TOURNAMENT_ROUND_READY_UPDATED', async () => {
    seedTournament('t1', ['u1', 'u2'], {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: 2,
      nextRoundReadyDeadline: new Date(Date.now() + 30_000),
    })
    const { io, emitted } = makeIoMock()
    const res = await markRoundReady(io, 't1', 'u1', true)
    expect(res.ok).toBe(true)
    expect(res.state.readyUserIds).toEqual(['u1'])
    expect(res.state.allReady).toBe(false)
    expect(emitted.some(([, ev]) => ev === 'TOURNAMENT_ROUND_READY_UPDATED')).toBe(true)
    expect(proceedSpy).not.toHaveBeenCalled()
  })

  it('déclenche proceedToNextRound quand tous les survivants sont prêts (et reste idempotent)', async () => {
    seedTournament('t1', ['u1', 'u2'], {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: 2,
      nextRoundReadyDeadline: new Date(Date.now() + 30_000),
    })
    const { io } = makeIoMock()

    const r1 = await markRoundReady(io, 't1', 'u1', true)
    expect(r1.state.allReady).toBe(false)
    expect(proceedSpy).not.toHaveBeenCalled()

    const r2 = await markRoundReady(io, 't1', 'u2', true)
    expect(r2.state.allReady).toBe(true)
    expect(proceedSpy).toHaveBeenCalledTimes(1)

    /* Le double appel ne doit pas déclencher un second spawn (flag déjà flippé). */
    const r3 = await markRoundReady(io, 't1', 'u2', true)
    expect(r3.ok).toBe(false)
    expect(proceedSpy).toHaveBeenCalledTimes(1)
  })
})

describe('computeReadyState', () => {
  it('renvoie open=false quand aucune fenêtre n’est ouverte', async () => {
    seedTournament('t1', ['u1'])
    const state = await computeReadyState('t1')
    expect(state.open).toBe(false)
    expect(state.roundNumber).toBeNull()
  })

  it('reflète survivants + readyUserIds correctement', async () => {
    seedTournament('t1', ['u1', 'u2', 'u3'], {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: 2,
      nextRoundReadyDeadline: new Date(Date.now() + 30_000),
    })
    db.ready.push({
      tournamentId: 't1',
      roundNumber: 2,
      userId: 'u1',
      readyAt: new Date(),
      autoReady: false,
    })
    const state = await computeReadyState('t1')
    expect(state.open).toBe(true)
    expect(state.requiredCount).toBe(3)
    expect(state.readyUserIds).toEqual(['u1'])
    expect(state.allReady).toBe(false)
  })
})

describe('autoReadyAndProceed', () => {
  it('insère autoReady=true pour les survivants manquants et appelle proceedToNextRound', async () => {
    seedTournament('t1', ['u1', 'u2', 'u3'], {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: 2,
      nextRoundReadyDeadline: new Date(Date.now() - 1),
    })
    db.ready.push({
      tournamentId: 't1',
      roundNumber: 2,
      userId: 'u1',
      readyAt: new Date(),
      autoReady: false,
    })
    const { io } = makeIoMock()
    const ok = await autoReadyAndProceed(io, 't1')
    expect(ok).toBe(true)
    /* u1 préservé (manuel), u2 et u3 ajoutés auto. */
    expect(db.ready).toHaveLength(3)
    expect(db.ready.find((r) => r.userId === 'u2')?.autoReady).toBe(true)
    expect(db.ready.find((r) => r.userId === 'u3')?.autoReady).toBe(true)
    expect(db.ready.find((r) => r.userId === 'u1')?.autoReady).toBe(false)
    expect(proceedSpy).toHaveBeenCalledTimes(1)
  })
})

describe('processExpiredRoundReadyWindows', () => {
  it('ne traite que les tournois dont la deadline est dépassée', async () => {
    seedTournament('t-expired', ['u1', 'u2'], {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: 2,
      nextRoundReadyDeadline: new Date(Date.now() - 1_000),
    })
    seedTournament('t-fresh', ['u3', 'u4'], {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: 2,
      nextRoundReadyDeadline: new Date(Date.now() + 60_000),
    })
    const { io } = makeIoMock()
    const advanced = await processExpiredRoundReadyWindows(io)
    expect(advanced).toBe(1)
    expect(proceedSpy).toHaveBeenCalledTimes(1)
    expect(proceedSpy).toHaveBeenCalledWith(io, 't-expired')
  })

  it('recovery (deadline dans le passé) → proceedToNextRound appelé une seule fois', async () => {
    seedTournament('t1', ['u1', 'u2'], {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: 2,
      nextRoundReadyDeadline: new Date(Date.now() - 60_000),
    })
    const { io } = makeIoMock()
    /* Double tick (simule boot + scheduler) — toujours un seul flip. */
    await processExpiredRoundReadyWindows(io)
    await processExpiredRoundReadyWindows(io)
    expect(proceedSpy).toHaveBeenCalledTimes(1)
  })
})
