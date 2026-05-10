import redisClient from '../../config/redis.config.js'
import { env } from '../../config/env.js'

const LOCK_PREFIX = 'quantum:poker:tablelock:'
const LOCK_TTL_SEC = 45

const localLocks = new Map<string, string>()
const localReentrantDepth = new Map<string, number>()

function depthKey(tableId: string, owner: string) {
  return `${tableId}\0${owner}`
}

export class PokerTableLockedError extends Error {
  constructor(message = 'TABLE_LOCKED') {
    super(message)
    this.name = 'PokerTableLockedError'
  }
}

export async function withPokerTableLock<T>(
  tableId: string,
  owner: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (env.isJest) {
    const existing = localLocks.get(tableId)
    if (existing && existing !== owner) {
      throw new PokerTableLockedError()
    }
    localLocks.set(tableId, owner)
    try {
      return await fn()
    } finally {
      const current = localLocks.get(tableId)
      if (current === owner) {
        localLocks.delete(tableId)
      }
    }
  }

  const redisKey = LOCK_PREFIX + tableId
  const rKey = depthKey(tableId, owner)

  const heldByUs = await redisClient.get(redisKey)
  if (heldByUs === owner) {
    localReentrantDepth.set(rKey, (localReentrantDepth.get(rKey) ?? 0) + 1)
    await redisClient.expire(redisKey, LOCK_TTL_SEC)
    try {
      return await fn()
    } finally {
      const d = (localReentrantDepth.get(rKey) ?? 1) - 1
      if (d <= 0) {
        localReentrantDepth.delete(rKey)
        await redisClient.eval(
          `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0`,
          1,
          redisKey,
          owner,
        )
      } else {
        localReentrantDepth.set(rKey, d)
      }
    }
  }

  const acquired = await redisClient.set(redisKey, owner, 'EX', LOCK_TTL_SEC, 'NX')
  if (acquired !== 'OK') {
    throw new PokerTableLockedError()
  }

  localReentrantDepth.set(rKey, 1)
  try {
    return await fn()
  } finally {
    const d = (localReentrantDepth.get(rKey) ?? 1) - 1
    if (d <= 0) {
      localReentrantDepth.delete(rKey)
      await redisClient.eval(
        `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) end return 0`,
        1,
        redisKey,
        owner,
      )
    } else {
      localReentrantDepth.set(rKey, d)
    }
  }
}
