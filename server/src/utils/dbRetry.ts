/** Erreurs transitoires pg-pool / cold start Supabase ou Render. */
export function isDbConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('timeout exceeded when trying to connect') ||
    msg.includes('Connection terminated') ||
    msg.includes('connection timed out') ||
    msg.includes('ECONNREFUSED') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ENOTFOUND') ||
    msg.includes('too many clients')
  )
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts?: { attempts?: number; baseDelayMs?: number },
): Promise<T> {
  const attempts = opts?.attempts ?? 3
  const baseDelayMs = opts?.baseDelayMs ?? 400
  let last: unknown

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      last = err
      if (!isDbConnectionError(err) || i >= attempts - 1) throw err
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i))
    }
  }

  throw last
}
