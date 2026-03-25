import type { BlackjackTableController } from '../logic/BlackjackTableController.js'

/**
 * Tables blackjack multijoueur en mémoire (pas de sérialisation Redis — MVP).
 * En multi-instance, chaque nœud ne voit que ses propres tables ; voir Docs/REPORT.md.
 */
const localCache = new Map<string, BlackjackTableController>()

export const activeBlackjackGames = {
  get(gameId: string): BlackjackTableController | undefined {
    return localCache.get(gameId)
  },
  set(gameId: string, table: BlackjackTableController): void {
    localCache.set(gameId, table)
  },
  delete(gameId: string): void {
    localCache.delete(gameId)
  },
  getSync(gameId: string): BlackjackTableController | undefined {
    return localCache.get(gameId)
  },
}
