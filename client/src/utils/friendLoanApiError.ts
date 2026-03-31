/** Extrait le message serveur des erreurs RTK Query / fetchBaseQuery. */
export function getFriendLoanApiErrorMessage(err: unknown, fallback: string): string {
  const e = err as { data?: unknown }
  const data = e?.data
  if (data && typeof data === "object" && "error" in data) {
    const msg = (data as { error?: unknown }).error
    if (typeof msg === "string" && msg.trim()) return msg
  }
  return fallback
}
