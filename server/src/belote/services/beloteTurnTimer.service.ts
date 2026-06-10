import type { Server } from 'socket.io'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'
import { isBeloteBotId } from '../../shared/beloteBots.js'
import { syncBeloteAfterAction } from './beloteSettlement.service.js'
import { recoverStuckBeloteBotTurn } from './beloteBotTurns.service.js'

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

function currentTurnPlayerIsBot(table: BeloteTableController): boolean {
  const state = table.getState()
  let pos: number | undefined
  if (state.phase === 'PLAYING') {
    pos = state.deal.currentPlayerPosition
  } else if (
    state.phase === 'BIDDING' ||
    state.phase === 'CONTREE_ROUND' ||
    state.phase === 'CLASSIQUE_TAKE' ||
    state.phase === 'CLASSIQUE_CHOOSE'
  ) {
    pos = state.biddingTurnPosition
  } else {
    return false
  }
  const player = state.players.find((p) => p.position === pos && !p.forfeited)
  return !!(player && (player.isBot || isBeloteBotId(player.userId)))
}

/** (Re)démarre le chrono du joueur courant et émet BELOTE_TURN_TIMER. */
export function scheduleBeloteTurnTimer(
  io: Server | undefined,
  gameId: string,
  table: BeloteTableController,
): void {
  if (!io) return
  clearBeloteTurnTimer(gameId)

  if (currentTurnPlayerIsBot(table)) {
    void import('./beloteBotTurns.service.js').then(({ scheduleBeloteBotTurns }) => {
      scheduleBeloteBotTurns(io, gameId)
    })
    const botEpoch = bumpEpoch(gameId)
    const botWatchdog = setTimeout(() => {
      if (turnEpoch.get(gameId) !== botEpoch) return
      const live = activeBeloteGames.getSync(gameId)
      if (!live || !currentTurnPlayerIsBot(live)) return
      void recoverStuckBeloteBotTurn(io, gameId)
    }, 8_000)
    turnTimeouts.set(gameId, botWatchdog)
    return
  }

  const state = table.getState()
  if (
    state.phase !== 'BIDDING' &&
    state.phase !== 'CONTREE_ROUND' &&
    state.phase !== 'PLAYING' &&
    state.phase !== 'CLASSIQUE_TAKE' &&
    state.phase !== 'CLASSIQUE_CHOOSE'
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
      if (currentTurnPlayerIsBot(live)) {
        const { scheduleBeloteBotTurns } = await import('./beloteBotTurns.service.js')
        scheduleBeloteBotTurns(io, gameId)
        return
      }
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
