import type { CashGameController } from '../../../logic/CashGameController.js'
import type { HiddenBetMarketPhase } from '../types.js'

export function assertHiddenBetQuoteOrPlace(
  cash: CashGameController,
  targetHandId: string,
  marketPhase: HiddenBetMarketPhase
): { ok: true } | { ok: false; error: string; code: string } {
  if (marketPhase === 'PRE_HAND') {
    if (!cash.isHiddenBetWindowOpen()) {
      return { ok: false, error: 'Marché paris cachés fermé', code: 'WINDOW_CLOSED' }
    }
    const next = cash.getPendingNextHandId()
    if (!next || next !== targetHandId) {
      return { ok: false, error: 'targetHandId ne correspond pas à nextHandId', code: 'TARGET_MISMATCH' }
    }
    return { ok: true }
  }

  const gt = cash.getGameTable()
  if (!gt) {
    return { ok: false, error: 'Aucune main en cours', code: 'NO_HAND' }
  }
  const hid = gt.state.handId
  if (!hid || hid !== targetHandId) {
    return { ok: false, error: 'targetHandId ne correspond pas à la main courante', code: 'TARGET_MISMATCH' }
  }

  const expected: HiddenBetMarketPhase | null =
    gt.state.phase === 'FLOP'
      ? 'LIVE_FLOP'
      : gt.state.phase === 'TURN'
        ? 'LIVE_TURN'
        : gt.state.phase === 'RIVER'
          ? 'LIVE_RIVER'
          : null

  if (!expected) {
    return { ok: false, error: 'Marché live indisponible hors street', code: 'LIVE_WINDOW_CLOSED' }
  }
  if (marketPhase !== expected) {
    return { ok: false, error: 'Phase incompatible avec le street courant', code: 'PHASE_MISMATCH' }
  }
  return { ok: true }
}

export function buildLiveQuoteSnapshotJson(
  cash: CashGameController,
  extra: {
    pricingVersion: string
    pricingBreakdown: unknown
    pricingInputs: Record<string, unknown>
  }
): string {
  const activePlayerIds = cash
    .getOccupiedSeats()
    .filter((s) => s.userId && s.chips > 0)
    .map((s) => s.userId!)

  const gt = cash.getGameTable()
  if (!gt) {
    return JSON.stringify({
      pricingVersion: extra.pricingVersion,
      marketSnapshotType: 'PRE_OR_NO_HAND',
      pricingInputs: extra.pricingInputs,
      pricingBreakdown: extra.pricingBreakdown,
      activePlayerIds,
    })
  }

  const st = gt.state
  const street =
    st.phase === 'FLOP'
      ? 'LIVE_FLOP'
      : st.phase === 'TURN'
        ? 'LIVE_TURN'
        : st.phase === 'RIVER'
          ? 'LIVE_RIVER'
          : null

  return JSON.stringify({
    pricingVersion: extra.pricingVersion,
    marketSnapshotType: 'LIVE',
    handId: st.handId,
    phase: st.phase,
    street,
    board: st.communityCards,
    activePlayerIds: st.players.filter((p) => p.isActive).map((p) => p.id),
    foldedPlayerIds: st.players.filter((p) => !p.isActive).map((p) => p.id),
    pricingInputs: extra.pricingInputs,
    pricingBreakdown: extra.pricingBreakdown,
    activeSeatPlayerIds: activePlayerIds,
  })
}
