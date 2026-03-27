import type { BlackjackTableController } from '../../logic/BlackjackTableController.js'
import type { BlackjackStateStore } from '../store/blackjackStateStore.js'
import { serializeBlackjackTable } from '../domain/blackjackState.serializer.js'
import type { BlackjackTableUpdateEvent } from '../domain/blackjackState.types.js'
import { blackjackSnapshotRepository } from '../recovery/blackjackSnapshot.repository.js'

export async function syncBlackjackTableState(
  store: BlackjackStateStore,
  controller: BlackjackTableController
): Promise<void> {
  const state = serializeBlackjackTable(controller)
  await store.setTable(state.tableId, state, { ttlSec: 60 * 60 * 6 })
  if (state.version % 5 === 0 || state.status === 'ROUND_ENDED') {
    await blackjackSnapshotRepository.save(state.roomId, state)
  }
  await store.publishUpdate({
    type: 'BLACKJACK_TABLE_UPDATE',
    tableId: state.tableId,
    roomId: state.roomId,
    status: state.status,
    version: state.version,
    updatedAt: state.updatedAt,
  } satisfies BlackjackTableUpdateEvent)
}

