import type { BlackjackTableController } from '../../logic/BlackjackTableController.js'
import type {
  BlackjackTableState,
  BlackjackTableStatus,
} from './blackjackState.types.js'

function mapPhaseToStatus(phase: string): BlackjackTableStatus {
  switch (phase) {
    case 'betting':
      return 'READY'
    case 'player_turn':
      return 'PLAYING'
    case 'dealer':
      return 'DEALER_TURN'
    case 'payout':
      return 'ROUND_ENDED'
    case 'between_hands':
      return 'WAITING'
    default:
      return 'WAITING'
  }
}

export function serializeBlackjackTable(
  controller: BlackjackTableController
): BlackjackTableState {
  const now = new Date().toISOString()
  return {
    tableId: controller.gameId,
    roomId: controller.roomId,
    status: mapPhaseToStatus(controller.phase),
    // Runtime projection intentionally compact + serializable
    runtime: {
      phase: controller.phase,
      handNumber: controller.handNumber,
      minBet: controller.minBet,
      maxSeats: controller.maxSeats,
      currentSeatIndex: controller.currentSeatIndex,
      publicState: controller.toPublicState(),
    },
    version: Math.max(0, controller.handNumber),
    createdAt: now,
    updatedAt: now,
  }
}

