import type { BlackjackTableController } from '../logic/BlackjackTableController.js'
import { blackjackStateStore } from './blackjackStateStore.js'
import { syncBlackjackTableState } from '../blackjack/services/blackjackStateSync.service.js'

/**
 * Runtime vivant blackjack multijoueur (controllers non sérialisables).
 * Migration progressive: exécution locale + projection sérialisée vers BlackjackStateStore.
 */
const localCache = new Map<string, BlackjackTableController>()

export const activeBlackjackGames = {
  get(gameId: string): BlackjackTableController | undefined {
    return localCache.get(gameId)
  },
  set(gameId: string, table: BlackjackTableController): void {
    localCache.set(gameId, table)
    void syncBlackjackTableState(blackjackStateStore, table).catch((err) => {
      console.error('[activeBlackjackGames] sync store failed:', err)
    })
  },
  delete(gameId: string): void {
    const table = localCache.get(gameId)
    localCache.delete(gameId)
    void blackjackStateStore.deleteTable(gameId).catch((err) => {
      console.error('[activeBlackjackGames] delete store failed:', err)
    })
    if (table) {
      void blackjackStateStore
        .publishUpdate({
          type: 'BLACKJACK_TABLE_DELETED',
          tableId: gameId,
          roomId: table.roomId,
          updatedAt: new Date().toISOString(),
        })
        .catch((err) => {
          console.error('[activeBlackjackGames] publish delete failed:', err)
        })
    }
  },
  getSync(gameId: string): BlackjackTableController | undefined {
    return localCache.get(gameId)
  },
  sync(gameId: string): void {
    const table = localCache.get(gameId)
    if (!table) return
    void syncBlackjackTableState(blackjackStateStore, table).catch((err) => {
      console.error('[activeBlackjackGames] manual sync failed:', err)
    })
  },
}
