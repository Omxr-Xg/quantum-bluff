import type {
  PokerRuntimeSnapshot,
  PokerRuntimeUpdateEvent,
  PokerStateStore,
} from "./pokerStateStore.js";

type Entry = {
  snapshot: PokerRuntimeSnapshot;
  expiresAtMs?: number;
};

export class InMemoryPokerStateStore implements PokerStateStore {
  private readonly store = new Map<string, Entry>();
  private readonly subscribers: Array<
    (event: PokerRuntimeUpdateEvent) => Promise<void> | void
  > = [];

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAtMs && entry.expiresAtMs <= now) {
        this.store.delete(key);
      }
    }
  }

  async get(gameId: string): Promise<PokerRuntimeSnapshot | null> {
    this.pruneExpired();
    const entry = this.store.get(gameId);
    return entry?.snapshot ?? null;
  }

  async set(
    gameId: string,
    snapshot: PokerRuntimeSnapshot,
    opts?: { ttlSec?: number },
  ): Promise<void> {
    const ttlSec = opts?.ttlSec;
    this.store.set(gameId, {
      snapshot,
      expiresAtMs: ttlSec ? Date.now() + ttlSec * 1000 : undefined,
    });
  }

  async delete(gameId: string): Promise<void> {
    this.store.delete(gameId);
  }

  async listIds(): Promise<string[]> {
    this.pruneExpired();
    return Array.from(this.store.keys());
  }

  async publishUpdate(event: PokerRuntimeUpdateEvent): Promise<void> {
    await Promise.all(this.subscribers.map((fn) => Promise.resolve(fn(event))));
  }

  async subscribeUpdates(
    handler: (event: PokerRuntimeUpdateEvent) => Promise<void> | void,
  ): Promise<void> {
    this.subscribers.push(handler);
  }
}
