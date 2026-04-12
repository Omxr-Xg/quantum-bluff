import type { PokerStateStore } from "./pokerStateStore.js";
import { InMemoryPokerStateStore } from "./inMemoryPokerStateStore.js";
import { RedisPokerStateStore } from "./redisPokerStateStore.js";

export function createPokerStateStore(): PokerStateStore {
  const isJest = Boolean(process.env.JEST_WORKER_ID);
  const isCi = process.env.CI === "true";

  const defaultMode = isJest || isCi ? "memory" : "redis";
  const mode = String(
    process.env.POKER_STATE_STORE ?? defaultMode,
  ).toLowerCase();

  if (mode === "memory" || mode === "inmemory") {
    return new InMemoryPokerStateStore();
  }

  return new RedisPokerStateStore();
}
