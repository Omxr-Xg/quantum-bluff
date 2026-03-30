export type CasinoAuditEvent =
  | 'bet_accepted'
  | 'rng_drawn'
  | 'result_computed'
  | 'payout_applied'
  | 'wallet_updated'
  | 'round_closed'
  | 'admin_override'

export function logCasinoAuditEvent(input: {
  event: CasinoAuditEvent
  roundId: string
  actionId: string
  userId: string
  gameType: string
  details?: Record<string, unknown>
}): void {
  console.log(
    JSON.stringify({
      scope: 'casino_audit',
      at: new Date().toISOString(),
      ...input,
    })
  )
}

