import type { ActiveGame } from '../../shared/activeGames.js'
import type { PokerRuntimeSnapshot } from '../store/pokerStateStore.js'

export function serializePokerRuntimeSnapshot(
  gameId: string,
  game: ActiveGame
): PokerRuntimeSnapshot {
  const state = game.state
  return {
    tableId: gameId,
    gameId,
    handId: state.handId,
    phase: state.phase,
    dealerPosition: state.players.findIndex((p) => p.isDealer),
    actingPlayerId: state.currentTurn || undefined,
    players: state.players,
    communityCards: state.communityCards,
    pot: state.pot,
    updatedAt: state.updatedAt ?? new Date().toISOString(),
    version: state.actionVersion ?? 0,
  }
}

