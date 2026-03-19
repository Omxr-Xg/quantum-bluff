import { createHash } from 'node:crypto';
import redisClient from '../config/redis.config.js';

const BLACKLIST_PREFIX = 'blacklist:';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours (max JWT expiry)

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function addToBlacklist(token: string): Promise<void> {
  const key = BLACKLIST_PREFIX + tokenHash(token);
  try {
    await redisClient.setex(key, TTL_SECONDS, '1');
  } catch (err) {
    console.warn('[tokenBlacklist] Redis down, token not blacklisted:', err);
  }
}

export async function isBlacklisted(token: string): Promise<boolean> {
  try {
    const key = BLACKLIST_PREFIX + tokenHash(token);
    const val = await redisClient.get(key);
    return val === '1';
  } catch {
    return false;
  }
}
