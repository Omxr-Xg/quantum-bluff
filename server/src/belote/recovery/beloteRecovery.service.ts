import type { Server } from 'socket.io'
import { prisma } from '../../config/database.js'
import { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteGameState, BeloteTeam } from '../../logic/belote/types.js'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'
import {
  closeBelotePlaySession,
  settleBeloteGame,
} from '../services/beloteSettlement.service.js'
import { getBeloteGamePresentUserIds } from '../services/belotePresence.service.js'
import { scheduleBeloteTurnTimer } from '../services/beloteTurnTimer.service.js'
import { rootLogger } from '../../observability/logger.js'

/** Aucun joueur connecté à la partie depuis ce délai → clôture. */
export const BELOTE_IDLE_CLOSE_MS = 15 * 60 * 1000
/** Durée max d’une partie listée / en base avant clôture forcée. */
export const BELOTE_STUCK_MAX_MS = 2 * 60 * 60 * 1000

function leadingTeam(state: BeloteGameState): BeloteTeam {
  if (state.teamScoreA >= state.teamScoreB) return 'A'
  return 'B'
}

function parseMs(iso: string | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

export async function loadBeloteTable(gameId: string): Promise<BeloteTableController | null> {
  const cached = activeBeloteGames.getSync(gameId)
  if (cached) return cached

  const snap = await prisma.beloteGameSnapshot.findFirst({ where: { gameId } })
  if (!snap) return null

  const ctrl = BeloteTableController.fromSnapshot(
    snap.snapshot as BeloteGameState,
  )
  activeBeloteGames.set(gameId, ctrl)
  return ctrl
}

export type BeloteStaleReason =
  | 'already_settled'
  | 'game_end'
  | 'all_forfeited'
  | 'idle'
  | 'stuck'

export async function pruneBeloteGameIfStale(
  gameId: string,
  roomId: string,
  io?: Server,
): Promise<BeloteStaleReason | null> {
  const existing = await prisma.beloteGameResult.findUnique({
    where: { gameId },
    select: { id: true },
  })
  if (existing) {
    await closeBelotePlaySession(roomId, gameId)
    return 'already_settled'
  }

  const table = await loadBeloteTable(gameId)
  if (!table) {
    await prisma.beloteRoom.updateMany({
      where: { id: roomId, status: 'IN_GAME' },
      data: { status: 'WAITING', gameId: null },
    })
    return 'stuck'
  }

  table.processDisconnectTimeouts()
  const state = table.getState()
  const now = Date.now()
  const lastMs = parseMs(state.lastActionAt) ?? parseMs(state.startedAt) ?? now
  const presentIds = io ? await getBeloteGamePresentUserIds(io, gameId) : []

  const active = state.players.filter((p) => !p.forfeited)
  const allForfeited = state.players.length > 0 && active.length === 0

  let reason: BeloteStaleReason | null = null

  if (state.phase === 'GAME_END') {
    reason = 'game_end'
  } else if (allForfeited) {
    table.forceEnd(leadingTeam(state))
    reason = 'all_forfeited'
  } else if (active.length > 0 && active.length < 4) {
    const teams = new Set(active.map((p) => p.team))
    if (teams.size === 1) {
      table.forceEnd(active[0]!.team)
      reason = 'all_forfeited'
    }
  } else if (now - lastMs >= BELOTE_STUCK_MAX_MS) {
    table.forceEnd(leadingTeam(state))
    reason = 'stuck'
  } else if (presentIds.length === 0 && now - lastMs >= BELOTE_IDLE_CLOSE_MS) {
    table.forceEnd(leadingTeam(state))
    reason = 'idle'
  }

  if (!reason) return null

  await settleBeloteGame(table, io)
  rootLogger.info({
    msg: 'belote_stale_game_closed',
    gameId,
    roomId,
    reason,
    phase: state.phase,
    lastActionAt: state.lastActionAt,
    presentCount: presentIds.length,
  })
  return reason
}

export async function pruneStaleBeloteInGameRooms(io?: Server): Promise<number> {
  const rooms = await prisma.beloteRoom.findMany({
    where: { status: 'IN_GAME', gameId: { not: null } },
    select: { id: true, gameId: true },
  })

  let closed = 0
  for (const room of rooms) {
    if (!room.gameId) continue
    const r = await pruneBeloteGameIfStale(room.gameId, room.id, io)
    if (r) closed++
  }
  return closed
}

export async function recoverBeloteAtBoot(io?: Server): Promise<void> {
  const n = await pruneStaleBeloteInGameRooms(io)
  rootLogger.info({ msg: 'belote_recovery_boot_done', closedGames: n })

  const rooms = await prisma.beloteRoom.findMany({
    where: { status: 'IN_GAME', gameId: { not: null } },
    select: { gameId: true },
  })

  for (const room of rooms) {
    if (!room.gameId) continue
    const table = await loadBeloteTable(room.gameId)
    if (!table) continue
    table.processDisconnectTimeouts()
    const state = table.getState()
    if (state.phase === 'GAME_END') {
      await settleBeloteGame(table, io)
      continue
    }
    scheduleBeloteTurnTimer(io, room.gameId, table)
  }
}
