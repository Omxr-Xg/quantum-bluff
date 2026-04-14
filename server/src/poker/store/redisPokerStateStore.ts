import type { Redis } from "ioredis";
import redisClient from "../../config/redis.config.js";
import type {
  PokerRuntimeSnapshot,
  PokerRuntimeUpdateEvent,
  PokerStateStore,
} from "./pokerStateStore.js";

const PREFIX = "poker:runtime:";
const UPDATE_CHANNEL = "poker:runtime:updates";

export class RedisPokerStateStore implements PokerStateStore {
  private readonly subscriber: Redis = redisClient.duplicate();
  private readonly handlers: Array<
    (event: PokerRuntimeUpdateEvent) => Promise<void> | void
  > = [];
  private subscribed = false;

  private async ensureSubscribed(): Promise<void> {
    if (this.subscribed) return;
    this.subscribed = true;

    await this.subscriber.subscribe(UPDATE_CHANNEL);
    this.subscriber.on("message", async (channel: string, message: string) => {
      if (channel !== UPDATE_CHANNEL) return;

      try {
        const event = JSON.parse(message) as PokerRuntimeUpdateEvent;
        await Promise.all(
          this.handlers.map((fn) => Promise.resolve(fn(event))),
        );
      } catch {
        // ignore malformed pubsub messages
      }
    });
  }

  async get(gameId: string): Promise<PokerRuntimeSnapshot | null> {
    const raw = await redisClient.get(`${PREFIX}${gameId}`);
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
    if (ttlSec && ttlSec > 0) {
      await redisClient.setex(`${PREFIX}${gameId}`, ttlSec, raw);
      return;
    }
    await redisClient.set(`${PREFIX}${gameId}`, raw);
  }

  async delete(gameId: string): Promise<void> {
    await redisClient.del(`${PREFIX}${gameId}`);
  }

  async listIds(): Promise<string[]> {
    const keys = await redisClient.keys(`${PREFIX}*`);
    return keys.map((k) => k.slice(PREFIX.length));
  }

  async publishUpdate(event: PokerRuntimeUpdateEvent): Promise<void> {
    await redisClient.publish(UPDATE_CHANNEL, JSON.stringify(event));
  }

  async subscribeUpdates(
    handler: (event: PokerRuntimeUpdateEvent) => Promise<void> | void,
  ): Promise<void> {
    this.handlers.push(handler);
    await this.ensureSubscribed();
  }
}
