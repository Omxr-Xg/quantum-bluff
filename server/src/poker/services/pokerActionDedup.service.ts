type DedupEntry = {
  expiresAtMs: number
  contextKey: string
}

const ACTION_TTL_MS = 30_000
const dedupStore = new Map<string, DedupEntry>()

function nowMs(): number {
  return Date.now()
}

function gcExpired(): void {
  const now = nowMs()
  for (const [key, value] of dedupStore.entries()) {
    if (value.expiresAtMs <= now) dedupStore.delete(key)
  }
}

export function makePokerActionDedupKey(input: {
  gameId: string
  playerId: string
  actionId?: string
}): string | null {
  if (!input.actionId) return null
  return `${input.gameId}:${input.playerId}:${input.actionId}`
}

export function registerPokerActionDedup(input: {
  dedupKey: string | null
  contextKey: string
}): { accepted: true } | { accepted: false; reason: 'DUPLICATE_ACTION' | 'STALE_ACTION' } {
  gcExpired()
  if (!input.dedupKey) return { accepted: true }
  const existing = dedupStore.get(input.dedupKey)
  if (!existing) {
    dedupStore.set(input.dedupKey, {
      contextKey: input.contextKey,
      expiresAtMs: nowMs() + ACTION_TTL_MS,
    })
    return { accepted: true }
  }
  if (existing.contextKey !== input.contextKey) {
    return { accepted: false, reason: 'STALE_ACTION' }
  }
  return { accepted: false, reason: 'DUPLICATE_ACTION' }
}

