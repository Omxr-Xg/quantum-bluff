const localLocks = new Map<string, string>()

export class PokerTableLockedError extends Error {
  constructor(message = 'TABLE_LOCKED') {
    super(message)
    this.name = 'PokerTableLockedError'
  }
}

export async function withPokerTableLock<T>(
  tableId: string,
  owner: string,
  fn: () => Promise<T>
): Promise<T> {
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

