const TTL_MS = 15 * 60 * 1000

type Entry = {
  createdAt: number
  result?: unknown
}

const memoryStore = new Map<string, Entry>()

function gc(): void {
  const now = Date.now()
  for (const [key, value] of memoryStore.entries()) {
    if (now - value.createdAt > TTL_MS) {
      memoryStore.delete(key)
    }
  }
}

export function buildIdempotencyKey(input: {
  userId: string
  gameType: string
  actionId: string
}): string {
  return `${input.gameType}:${input.userId}:${input.actionId}`
}

export function tryBeginIdempotentAction(
  key: string
): { accepted: true } | { accepted: false; reason: 'DUPLICATE_ACTION' } {
  gc()
  if (memoryStore.has(key)) {
    return { accepted: false, reason: 'DUPLICATE_ACTION' }
  }
  memoryStore.set(key, { createdAt: Date.now() })
  return { accepted: true }
}

export function saveIdempotentResult(key: string, result: unknown): void {
  const existing = memoryStore.get(key)
  if (!existing) return
  memoryStore.set(key, { ...existing, result })
}

export function getIdempotentResult(key: string): unknown | null {
  gc()
  return memoryStore.get(key)?.result ?? null
}

