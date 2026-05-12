import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'
import { proceedToNextRound } from './tournament.runtime.service.js'

/** Fenêtre laissée aux survivants pour cliquer « Prêt » avant la manche suivante. */
export const TOURNAMENT_ROUND_READY_TIMEOUT_MS = 30_000

export type TournamentRoundReadyState = {
  open: boolean
  roundNumber: number | null
  deadline: string | null
  surviving: string[]
  readyUserIds: string[]
  requiredCount: number
  allReady: boolean
  isFinal: boolean
}

export type TournamentRoundReadyOpenedPayload = {
  tournamentId: string
  roundNumber: number
  deadline: string
  surviving: string[]
  isFinal: boolean
}

export type TournamentRoundReadyUpdatedPayload = {
  tournamentId: string
  roundNumber: number
  readyUserIds: string[]
  requiredCount: number
  allReady: boolean
}

/**
 * Ouvre la fenêtre ready-check pour la manche `nextRoundNumber`.
 * Idempotente : si une fenêtre est déjà ouverte sur ce même round, on ne réinitialise pas la deadline,
 * on se contente de réémettre l'état (utile pour la recovery).
 */
export async function openRoundReadyCheck(
  io: Server,
  tournamentId: string,
  nextRoundNumber: number,
  survivingUserIds: string[],
): Promise<void> {
  const surviving = [...new Set(survivingUserIds)].filter(Boolean)
  if (surviving.length <= 1) {
    rootLogger.warn({
      msg: 'tournament_open_ready_check_skipped_insufficient_survivors',
      tournamentId,
      nextRoundNumber,
      count: surviving.length,
    })
    return
  }

  const existing = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      nextRoundReadyOpen: true,
      nextRoundReadyDeadline: true,
      nextRoundReadyNumber: true,
    },
  })
  if (!existing) return

  const isFinal = surviving.length <= 3 && surviving.length >= 2

  let deadline: Date
  if (
    existing.nextRoundReadyOpen &&
    existing.nextRoundReadyNumber === nextRoundNumber &&
    existing.nextRoundReadyDeadline
  ) {
    deadline = existing.nextRoundReadyDeadline
  } else {
    deadline = new Date(Date.now() + TOURNAMENT_ROUND_READY_TIMEOUT_MS)
    await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        status: 'WAITING_READY_CHECK',
        nextRoundReadyOpen: true,
        nextRoundReadyNumber: nextRoundNumber,
        nextRoundReadyDeadline: deadline,
      },
    })
  }

  const openedPayload: TournamentRoundReadyOpenedPayload = {
    tournamentId,
    roundNumber: nextRoundNumber,
    deadline: deadline.toISOString(),
    surviving,
    isFinal,
  }
  io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_ROUND_READY_OPENED', openedPayload)
  for (const uid of surviving) {
    io.to(`user:${uid}`).emit('TOURNAMENT_ROUND_READY_OPENED', openedPayload)
  }

  /* État courant après ouverture : permet aux clients reconnectés de récupérer
   * la progression (utile si certains ont déjà cliqué « Prêt » lors d'une ouverture précédente). */
  const state = await computeReadyState(tournamentId)
  if (state.open) {
    emitReadyUpdated(io, state, tournamentId)
  }
}

/** Reconstruit l'état complet de la fenêtre ready-check à partir de la DB. */
export async function computeReadyState(
  tournamentId: string,
): Promise<TournamentRoundReadyState> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      nextRoundReadyOpen: true,
      nextRoundReadyDeadline: true,
      nextRoundReadyNumber: true,
    },
  })
  if (!t || !t.nextRoundReadyOpen || t.nextRoundReadyNumber == null) {
    return {
      open: false,
      roundNumber: null,
      deadline: null,
      surviving: [],
      readyUserIds: [],
      requiredCount: 0,
      allReady: false,
      isFinal: false,
    }
  }

  const survivingRows = await prisma.tournamentPlayer.findMany({
    where: { tournamentId, status: 'WAITING_NEXT_ROUND' },
    select: { userId: true },
  })
  const surviving = survivingRows.map((r) => r.userId)

  const readyRows = await prisma.tournamentRoundReady.findMany({
    where: { tournamentId, roundNumber: t.nextRoundReadyNumber },
    select: { userId: true },
  })
  const readySet = new Set(readyRows.map((r) => r.userId))
  /* Seuls les survivants comptent comme prêts (ignore les éventuels résidus d'un round précédent). */
  const readyUserIds = surviving.filter((uid) => readySet.has(uid))
  const allReady = surviving.length > 0 && readyUserIds.length >= surviving.length
  const isFinal = surviving.length <= 3 && surviving.length >= 2

  return {
    open: true,
    roundNumber: t.nextRoundReadyNumber,
    deadline: t.nextRoundReadyDeadline?.toISOString() ?? null,
    surviving,
    readyUserIds,
    requiredCount: surviving.length,
    allReady,
    isFinal,
  }
}

function emitReadyUpdated(
  io: Server,
  state: TournamentRoundReadyState,
  tournamentId: string,
): void {
  if (!state.open || state.roundNumber == null) return
  const payload: TournamentRoundReadyUpdatedPayload = {
    tournamentId,
    roundNumber: state.roundNumber,
    readyUserIds: state.readyUserIds,
    requiredCount: state.requiredCount,
    allReady: state.allReady,
  }
  io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_ROUND_READY_UPDATED', payload)
}

export type MarkRoundReadyResult = {
  ok: boolean
  state: TournamentRoundReadyState
  proceeded: boolean
}

/**
 * Marque un survivant comme prêt (ou retire la marque) pour la manche à venir.
 * Si tous les survivants sont prêts après cette opération, déclenche `proceedToNextRound`.
 */
export async function markRoundReady(
  io: Server,
  tournamentId: string,
  userId: string,
  ready: boolean,
): Promise<MarkRoundReadyResult> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      status: true,
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: true,
    },
  })
  if (!t || !t.nextRoundReadyOpen || t.nextRoundReadyNumber == null) {
    const state = await computeReadyState(tournamentId)
    return { ok: false, state, proceeded: false }
  }

  const survivor = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
    select: { status: true },
  })
  if (!survivor || survivor.status !== 'WAITING_NEXT_ROUND') {
    const state = await computeReadyState(tournamentId)
    return { ok: false, state, proceeded: false }
  }

  if (ready) {
    await prisma.tournamentRoundReady.upsert({
      where: {
        tournamentId_roundNumber_userId: {
          tournamentId,
          roundNumber: t.nextRoundReadyNumber,
          userId,
        },
      },
      create: {
        tournamentId,
        roundNumber: t.nextRoundReadyNumber,
        userId,
        autoReady: false,
      },
      update: { autoReady: false },
    })
  } else {
    await prisma.tournamentRoundReady.deleteMany({
      where: {
        tournamentId,
        roundNumber: t.nextRoundReadyNumber,
        userId,
        /* On ne permet pas d'annuler une auto-ready (la deadline a déjà déclenché). */
        autoReady: false,
      },
    })
  }

  const state = await computeReadyState(tournamentId)
  emitReadyUpdated(io, state, tournamentId)

  if (state.allReady) {
    const proceeded = await proceedToNextRound(io, tournamentId)
    return { ok: true, state, proceeded }
  }
  return { ok: true, state, proceeded: false }
}

/**
 * Pour tous les survivants `WAITING_NEXT_ROUND` qui n'ont pas encore cliqué « Prêt »,
 * insère une ligne `autoReady=true`, puis déclenche `proceedToNextRound`.
 * Idempotent : géré par la contrainte unique `(tournamentId, roundNumber, userId)`
 * et par le flag `nextRoundReadyOpen` côté `proceedToNextRound`.
 */
export async function autoReadyAndProceed(
  io: Server,
  tournamentId: string,
): Promise<boolean> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      nextRoundReadyOpen: true,
      nextRoundReadyNumber: true,
    },
  })
  if (!t || !t.nextRoundReadyOpen || t.nextRoundReadyNumber == null) return false

  const survivors = await prisma.tournamentPlayer.findMany({
    where: { tournamentId, status: 'WAITING_NEXT_ROUND' },
    select: { userId: true },
  })
  if (survivors.length === 0) return false

  await prisma.tournamentRoundReady.createMany({
    data: survivors.map((s) => ({
      tournamentId,
      roundNumber: t.nextRoundReadyNumber!,
      userId: s.userId,
      autoReady: true,
    })),
    skipDuplicates: true,
  })

  const state = await computeReadyState(tournamentId)
  emitReadyUpdated(io, state, tournamentId)

  return proceedToNextRound(io, tournamentId)
}

/**
 * Tick : pour chaque tournoi dont la deadline est dépassée, force l'avancement
 * via `autoReadyAndProceed`. Appelé par le scheduler.
 */
export async function processExpiredRoundReadyWindows(io: Server): Promise<number> {
  const now = new Date()
  const expired = await prisma.tournament.findMany({
    where: {
      status: 'WAITING_READY_CHECK',
      nextRoundReadyOpen: true,
      nextRoundReadyDeadline: { lte: now },
    },
    select: { id: true, nextRoundReadyNumber: true },
  })
  let advanced = 0
  for (const t of expired) {
    try {
      const ok = await autoReadyAndProceed(io, t.id)
      if (ok) advanced += 1
    } catch (e) {
      rootLogger.error({
        msg: 'tournament_auto_ready_failed',
        tournamentId: t.id,
        roundNumber: t.nextRoundReadyNumber,
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }
  return advanced
}
