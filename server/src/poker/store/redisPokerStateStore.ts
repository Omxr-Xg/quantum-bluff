import type { Redis } from "ioredis";
import redisClient from "../../config/redis.config.js";
import { env } from "../../config/env.js";
import {
  attachRedisInstrumentation,
  withRedisFeature,
} from "../../observability/redisInstrumentation.js";
import type {
  PokerRuntimeSnapshot,
  PokerRuntimeUpdateEvent,
  PokerStateStore,
} from "./pokerStateStore.js";

const PREFIX = "poker:runtime:";
const INDEX_KEY = "poker:runtime:index";
const UPDATE_CHANNEL = "poker:runtime:updates";

export class RedisPokerStateStore implements PokerStateStore {
  private readonly subscriber: Redis = (() => {
    const sub = redisClient.duplicate();
    attachRedisInstrumentation(sub, "poker_state");
    return sub;
  })();
  private readonly handlers: Array<
    (event: PokerRuntimeUpdateEvent) => Promise<void> | void
  > = [];
  private subscribed = false;

  private async fanoutLocal(event: PokerRuntimeUpdateEvent): Promise<void> {
    await Promise.all(this.handlers.map((fn) => Promise.resolve(fn(event))));
  }

  private async ensureSubscribed(): Promise<void> {
    if (!env.distributedRedis || this.subscribed) return;
    this.subscribed = true;

    await this.subscriber.subscribe(UPDATE_CHANNEL);
    this.subscriber.on("message", async (channel: string, message: string) => {
      if (channel !== UPDATE_CHANNEL) return;

      try {
        const event = JSON.parse(message) as PokerRuntimeUpdateEvent;
        await this.fanoutLocal(event);
      } catch {
        // ignore malformed pubsub messages
      }
    });
  }

  async get(gameId: string): Promise<PokerRuntimeSnapshot | null> {
    const raw = await withRedisFeature("poker_state", () =>
      redisClient.get(`${PREFIX}${gameId}`),
    );
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PokerRuntimeSnapshot;
    } catch {
      return null;
    }
  }

  async set(
    gameId: string,
    snapshot: PokerRuntimeSnapshot,
    opts?: { ttlSec?: number },
  ): Promise<void> {
    const raw = JSON.stringify(snapshot);
    const ttlSec = opts?.ttlSec;
    await withRedisFeature("poker_state", async () => {
      if (ttlSec && ttlSec > 0) {
        await redisClient.setex(`${PREFIX}${gameId}`, ttlSec, raw);
      } else {
        await redisClient.set(`${PREFIX}${gameId}`, raw);
      }
      await redisClient.sadd(INDEX_KEY, gameId);
    });
  }

  async delete(gameId: string): Promise<void> {
    await withRedisFeature("poker_state", async () => {
      await redisClient.del(`${PREFIX}${gameId}`);
      await redisClient.srem(INDEX_KEY, gameId);
    });
  }

  async listIds(): Promise<string[]> {
    return withRedisFeature("poker_state", () => redisClient.smembers(INDEX_KEY));
  }

  async publishUpdate(event: PokerRuntimeUpdateEvent): Promise<void> {
    if (!env.distributedRedis) {
      await this.fanoutLocal(event);
      return;
    }
    await withRedisFeature("poker_state", () =>
      redisClient.publish(UPDATE_CHANNEL, JSON.stringify(event)),
    );
  }

  async subscribeUpdates(
    handler: (event: PokerRuntimeUpdateEvent) => Promise<void> | void,
  ): Promise<void> {
    this.handlers.push(handler);
    await this.ensureSubscribed();
  }
}
