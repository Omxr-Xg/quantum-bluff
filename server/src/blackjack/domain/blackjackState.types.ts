export type BlackjackTableStatus =
  | 'WAITING'
  | 'READY'
  | 'PLAYING'
  | 'DEALER_TURN'
  | 'ROUND_ENDED'
  | 'CLOSED'

export interface BlackjackTableState {
  tableId: string
  roomId: string
  status: BlackjackTableStatus
  /**
   * JSON runtime payload:
   * - must stay serializable
   * - can embed shoe/dealer/players/turn/version timestamps
   */
  runtime: Record<string, unknown>
  version: number
  createdAt: string
  updatedAt: string
}

export interface BlackjackTableUpdateEvent {
  type: 'BLACKJACK_TABLE_UPDATE' | 'BLACKJACK_TABLE_DELETED'
  tableId: string
  roomId: string
  status?: BlackjackTableStatus
  version?: number
  updatedAt: string
}

