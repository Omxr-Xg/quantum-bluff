import type { Socket } from 'socket.io'
import { rootLogger } from '../observability/logger.js'

const CHAT_MIN_INTERVAL_MS = 2_000
const EVENT_WINDOW_MS = 10_000
const MAX_EVENTS_PER_WINDOW = 20

type UserBucket = {
  chatLastAt: number
  eventTimestamps: number[]
}

const buckets = new Map<string, UserBucket>()

const CHAT_EVENTS = new Set(['GAME_CHAT', 'BELOTE_CHAT'])
const EXEMPT_EVENTS = new Set(['disconnect', 'error', 'connect'])

function bucketFor(userId: string): UserBucket {
  let b = buckets.get(userId)
  if (!b) {
    b = { chatLastAt: 0, eventTimestamps: [] }
    buckets.set(userId, b)
  }
  return b
}

function pruneEvents(b: UserBucket, now: number): void {
  b.eventTimestamps = b.eventTimestamps.filter((t) => now - t < EVENT_WINDOW_MS)
}

export function consumeSocketEventBudget(userId: string): boolean {
  const now = Date.now()
  const b = bucketFor(userId)
  pruneEvents(b, now)
  if (b.eventTimestamps.length >= MAX_EVENTS_PER_WINDOW) return false
  b.eventTimestamps.push(now)
  return true
}

export function consumeChatMessageBudget(userId: string): boolean {
  if (!consumeSocketEventBudget(userId)) return false
  const now = Date.now()
  const b = bucketFor(userId)
  if (now - b.chatLastAt < CHAT_MIN_INTERVAL_MS) {
    b.eventTimestamps.pop()
    return false
  }
  b.chatLastAt = now
  return true
}

type RateLimitedSocket = Socket & { userId?: string; __qbRateLimitPatched?: boolean }

function emitRateLimited(socket: RateLimitedSocket, event: string, code: string): void {
  rootLogger.warn({
    msg: 'socket_rate_limit_exceeded',
    code,
    event,
    userId: socket.userId,
    socketId: socket.id,
  })
  socket.emit('SOCKET_RATE_LIMITED', { code, event })
}

/** Enveloppe socket.on pour throttling global + chat (1 msg / 2 s, 20 événements / 10 s). */
export function attachSocketRateLimitGuard(socket: RateLimitedSocket): void {
  if (socket.__qbRateLimitPatched) return
  socket.__qbRateLimitPatched = true

  const originalOn = socket.on.bind(socket)
  socket.on = ((event: string, listener: (...args: unknown[]) => void) => {
    if (EXEMPT_EVENTS.has(event)) {
      return originalOn(event, listener)
    }
    return originalOn(event, (...args: unknown[]) => {
      const uid = socket.userId
      if (uid) {
        if (CHAT_EVENTS.has(event)) {
          if (!consumeChatMessageBudget(uid)) {
            emitRateLimited(socket, event, 'CHAT_THROTTLED')
            return
          }
        } else if (!consumeSocketEventBudget(uid)) {
          emitRateLimited(socket, event, 'EVENT_BUDGET')
          return
        }
      }
      return listener(...args)
    })
  }) as typeof socket.on
}

/** Réinitialise les compteurs (tests). */
export function resetSocketRateLimitForTests(): void {
  buckets.clear()
}
