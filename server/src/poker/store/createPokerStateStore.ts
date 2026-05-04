import { env } from "../../config/env.js";
import type { PokerStateStore } from "./pokerStateStore.js";
import { InMemoryPokerStateStore } from "./inMemoryPokerStateStore.js";
import { RedisPokerStateStore } from "./redisPokerStateStore.js";

export function createPokerStateStore(): PokerStateStore {
  const raw = String(process.env.POKER_STATE_STORE ?? "").toLowerCase();
  if (raw === "memory" || raw === "inmemory") {
    return new InMemoryPokerStateStore();
  }
  if (raw === "redis") {
    return new RedisPokerStateStore();
  }

  const hasRedis = Boolean(env.redisUrl || env.redisHost);
  if (env.isJest || env.isCi || !hasRedis) {
    return new InMemoryPokerStateStore();
  }

  return new RedisPokerStateStore();
}
