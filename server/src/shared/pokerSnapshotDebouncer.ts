import { env } from '../config/env.js'
import { pokerStateStore } from './pokerStateStore.js'
import type { CashGameController } from '../logic/CashGameController.js'
import type { GameTable } from '../logic/GameTable.js'
import { serializePokerRuntimeSnapshot } from '../poker/services/pokerStateSync.service.js'

type RuntimeGame = GameTable | CashGameController

type Pending = {
  timer: ReturnType<typeof setTimeout>
  resolveGame: () => RuntimeGame | undefined
}

const pending = new Map<string, Pending>()

function flush(gameId: string, resolveGame: () => RuntimeGame | undefined): void {
  const game = resolveGame()
  if (!game) return
  const snapshot = serializePokerRuntimeSnapshot(gameId, game)
  void pokerStateStore
    .set(gameId, snapshot, { ttlSec: 60 * 60 * 6 })
    .then(() =>
      pokerStateStore.publishUpdate({
        type: 'POKER_TABLE_UPDATE',
        gameId,
        updatedAt: snapshot.updatedAt,
        version: snapshot.version,
      }),
    )
    .catch((err) => {
      console.error('[pokerSnapshotDebouncer] sync failed:', err)
    })
}

export function scheduleDebouncedPokerSnapshot(
  gameId: string,
  resolveGame: () => RuntimeGame | undefined,
): void {
  const ms = env.pokerStateWriteDebounceMs
  if (ms <= 0) {
    flush(gameId, resolveGame)
    return
  }

  const existing = pending.get(gameId)
  if (existing) {
    clearTimeout(existing.timer)
    existing.resolveGame = resolveGame
    existing.timer = setTimeout(() => {
      pending.delete(gameId)
      flush(gameId, resolveGame)
    }, ms)
    return
  }

  const timer = setTimeout(() => {
    pending.delete(gameId)
    flush(gameId, resolveGame)
  }, ms)
  timer.unref?.()
  pending.set(gameId, { timer, resolveGame })
}

export function flushDebouncedPokerSnapshotNow(
  gameId: string,
  resolveGame: () => RuntimeGame | undefined,
): void {
  const existing = pending.get(gameId)
  if (existing) {
    clearTimeout(existing.timer)
    pending.delete(gameId)
  }
  flush(gameId, resolveGame)
}

export function cancelDebouncedPokerSnapshot(gameId: string): void {
  const existing = pending.get(gameId)
  if (existing) {
    clearTimeout(existing.timer)
    pending.delete(gameId)
  }
}

export function clearPokerSnapshotDebouncerForTests(): void {
  for (const [, p] of pending) clearTimeout(p.timer)
  pending.clear()
}
