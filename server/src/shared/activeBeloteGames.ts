import type { BeloteTableController } from '../logic/belote/BeloteTableController.js'
import type { BeloteGameState } from '../logic/belote/types.js'

const localCache = new Map<string, BeloteTableController>()

export const activeBeloteGames = {
  get(gameId: string): BeloteTableController | undefined {
    return localCache.get(gameId)
  },
  getSync(gameId: string): BeloteTableController | undefined {
    return localCache.get(gameId)
  },
  set(gameId: string, table: BeloteTableController): void {
    localCache.set(gameId, table)
  },
  delete(gameId: string): void {
    localCache.delete(gameId)
  },
  listIds(): string[] {
    return [...localCache.keys()]
  },
}

export async function persistBeloteSnapshot(
  roomId: string,
  gameId: string,
  state: BeloteGameState,
): Promise<void> {
  const { prisma } = await import('../config/database.js')
  await prisma.beloteGameSnapshot.upsert({
    where: { roomId },
    create: {
      roomId,
      gameId,
      snapshot: state as object,
      version: 1,
    },
    update: {
      gameId,
      snapshot: state as object,
      version: { increment: 1 },
    },
  })
}
