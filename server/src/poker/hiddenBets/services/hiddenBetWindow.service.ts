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
  const lw = gt.state.hiddenBetLiveWindow
  if (!lw) {
    return { ok: false, error: 'Fenêtre live fermée', code: 'LIVE_WINDOW_CLOSED' }
  }
  const expected: HiddenBetMarketPhase = lw.windowType
  if (marketPhase !== expected) {
    return { ok: false, error: 'Phase incompatible avec la fenêtre live', code: 'PHASE_MISMATCH' }
  }
  return { ok: true }
}

export function buildLiveQuoteSnapshotJson(cash: CashGameController): string {
  const gt = cash.getGameTable()
  if (!gt) return '{}'
  const st = gt.state
  return JSON.stringify({
    handId: st.handId,
    phase: st.phase,
    board: st.communityCards,
    activePlayerIds: st.players.filter((p) => p.isActive).map((p) => p.id),
    foldedPlayerIds: st.players.filter((p) => !p.isActive).map((p) => p.id),
    window: st.hiddenBetLiveWindow,
  })
}
