import { createHash } from 'node:crypto';
import redisClient from '../config/redis.config.js';

const BLACKLIST_PREFIX = 'blacklist:';
const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours (max JWT expiry)
const memoryBlacklist = new Map<string, number>();

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function rememberInMemory(hash: string): void {
  memoryBlacklist.set(hash, Date.now() + TTL_SECONDS * 1000);
}

function isRememberedInMemory(hash: string): boolean {
  const expiresAt = memoryBlacklist.get(hash);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    memoryBlacklist.delete(hash);
    return false;
  }
  return true;
}

export async function addToBlacklist(token: string): Promise<void> {
  const hash = tokenHash(token);
  const key = BLACKLIST_PREFIX + hash;
  rememberInMemory(hash);
  try {
    await redisClient.setex(key, TTL_SECONDS, '1');
  } catch (err) {
    console.warn('[tokenBlacklist] Redis down, token blacklisted in process memory:', err);
  }
}

export async function isBlacklisted(token: string): Promise<boolean> {
  const hash = tokenHash(token);
  if (isRememberedInMemory(hash)) return true;
  try {
    const key = BLACKLIST_PREFIX + hash;
    const val = await redisClient.get(key);
    return val === '1';
  } catch {
    return false;
  }
}
