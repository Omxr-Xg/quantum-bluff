import type { Server } from 'socket.io'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'
import { syncBeloteAfterAction } from './beloteSettlement.service.js'

export const BELOTE_TURN_TIME_SEC = 30
export const BELOTE_TURN_MS = BELOTE_TURN_TIME_SEC * 1000

const turnEpoch = new Map<string, number>()
const turnTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const tickIntervals = new Map<string, ReturnType<typeof setInterval>>()

function bumpEpoch(gameId: string): number {
  const next = (turnEpoch.get(gameId) ?? 0) + 1
  turnEpoch.set(gameId, next)
  return next
}

export function clearBeloteTurnTimer(gameId: string): void {
  const t = turnTimeouts.get(gameId)
  if (t) clearTimeout(t)
  turnTimeouts.delete(gameId)
  const iv = tickIntervals.get(gameId)
  if (iv) clearInterval(iv)
  tickIntervals.delete(gameId)
  bumpEpoch(gameId)
}

function emitTurnTimer(io: Server, gameId: string, timeLeft: number): void {
  io.to(`belote-game:${gameId}`).emit('BELOTE_TURN_TIMER', {
    gameId,
    timeLeft: Math.max(0, timeLeft),
  })
}

/** (Re)démarre le chrono du joueur courant et émet BELOTE_TURN_TIMER. */
export function scheduleBeloteTurnTimer(
  io: Server | undefined,
  gameId: string,
  table: BeloteTableController,
): void {
  if (!io) return
  clearBeloteTurnTimer(gameId)

  const state = table.getState()
  if (
    state.phase !== 'BIDDING' &&
    state.phase !== 'CONTREE_ROUND' &&
    state.phase !== 'PLAYING'
  ) {
    return
  }

  const epoch = bumpEpoch(gameId)
  const deadlineMs = state.turnDeadlineAt
    ? new Date(state.turnDeadlineAt).getTime()
    : Date.now() + BELOTE_TURN_MS
  const remainingMs = Math.max(0, deadlineMs - Date.now())

  const timeLeftSec = Math.max(1, Math.ceil(remainingMs / 1000))
  emitTurnTimer(io, gameId, timeLeftSec)

  const tick = setInterval(() => {
    if (turnEpoch.get(gameId) !== epoch) {
      clearInterval(tick)
      return
    }
    const live = activeBeloteGames.getSync(gameId)
    if (!live) {
      clearInterval(tick)
      return
    }
    const st = live.getState()
    if (!st.turnDeadlineAt) return
    const left = Math.max(
      0,
      Math.ceil((new Date(st.turnDeadlineAt).getTime() - Date.now()) / 1000),
    )
    emitTurnTimer(io, gameId, left)
    if (left <= 0) clearInterval(tick)
  }, 1000)
  tickIntervals.set(gameId, tick)

  const timeout = setTimeout(() => {
    if (turnEpoch.get(gameId) !== epoch) return
    void (async () => {
      const live = activeBeloteGames.getSync(gameId)
      if (!live) return
      const applied = live.applyTurnTimeout()
      if (applied) {
        await syncBeloteAfterAction(live, io)
      } else {
        clearBeloteTurnTimer(gameId)
      }
    })()
  }, remainingMs)

  turnTimeouts.set(gameId, timeout)
}

export function stopBeloteTimersForGame(gameId: string): void {
  clearBeloteTurnTimer(gameId)
}
