import type { GameState } from '../../types/poker.js'

export interface PokerRuntimeSnapshot {
  tableId: string
  roomId?: string
  gameId: string
  handId?: string
  phase: string
  dealerPosition?: number
  actingPlayerId?: string
  players: GameState['players']
  communityCards: GameState['communityCards']
  pot: number
  updatedAt: string
  version: number
}

export interface PokerStateStore {
  get(gameId: string): Promise<PokerRuntimeSnapshot | null>
  set(gameId: string, snapshot: PokerRuntimeSnapshot, opts?: { ttlSec?: number }): Promise<void>
  delete(gameId: string): Promise<void>
  listIds(): Promise<string[]>
}

