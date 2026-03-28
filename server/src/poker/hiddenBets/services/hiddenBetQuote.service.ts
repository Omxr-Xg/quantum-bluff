import { createHash } from 'node:crypto'
import type { CashGameController } from '../../../logic/CashGameController.js'
import {
  QUOTE_TTL_MS,
  pricingVersionForPhase,
  type HiddenBetMarketPhase,
  type QuoteRequestBody,
  type SelectionPayload,
} from '../types.js'
import { computeQuotedOdds, validateSelections } from '../markets.js'
import { assertHiddenBetQuoteOrPlace } from './hiddenBetWindow.service.js'
import { intChips } from '../../../utils/chips.js'
import { rootLogger } from '../../../observability/logger.js'

const MIN_STAKE = 10
const MAX_STAKE = 10_000

export function computeQuoteHash(parts: {
  pricingVersion: string
  gameId: string
  handId: string
  marketPhase: HiddenBetMarketPhase
  combinator: string
  selections: SelectionPayload[]
  quoteExpiresAt: number
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        ...parts,
        selections: parts.selections.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      })
    )
    .digest('hex')
}

function resolveTargetHandId(body: QuoteRequestBody): string {
  return (body.targetHandId ?? body.handId ?? '').trim()
}

export function quoteHiddenBet(
  cash: CashGameController,
  gameId: string,
  body: QuoteRequestBody & { stakePreview?: number }
): {
  quotedOdds: number
  potentialPayout: number
  pricingVersion: string
  quoteExpiresAt: string
  quoteHash: string
  quotedProbability?: number
  marketPhase: HiddenBetMarketPhase
} {
  const marketPhase = body.marketPhase
  if (!marketPhase) throw new Error('marketPhase requis')

  const targetHandId = resolveTargetHandId(body)
  if (!targetHandId) throw new Error('targetHandId requis')

  const w = assertHiddenBetQuoteOrPlace(cash, targetHandId, marketPhase)
  if (!w.ok) throw new Error(w.error)

  const v = validateSelections(body.selections, body.combinator, marketPhase)
  if (!v.ok) throw new Error(v.error)

  const occupied = cash.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
  const n = occupied.length
  const odds = computeQuotedOdds(v.selections, body.combinator, n, marketPhase)
  if (odds <= 0) throw new Error('cote invalide')

  const pricingVersion = pricingVersionForPhase(marketPhase)
  const quoteExpiresAtMs = Date.now() + QUOTE_TTL_MS
  const quoteHash = computeQuoteHash({
    pricingVersion,
    gameId,
    handId: targetHandId,
    marketPhase,
    combinator: body.combinator,
    selections: v.selections,
    quoteExpiresAt: quoteExpiresAtMs,
  })

  const preview = Math.max(MIN_STAKE, Math.min(MAX_STAKE, intChips(body.stakePreview ?? 100)))
  const potentialPayout = Math.floor(preview * odds)

  rootLogger.info({
    msg: 'hidden_bet_quote_generated',
    gameId,
    handId: targetHandId,
    marketPhase,
    pricingVersion,
  })

  return {
    quotedOdds: odds,
    potentialPayout,
    pricingVersion,
    quoteExpiresAt: new Date(quoteExpiresAtMs).toISOString(),
    quoteHash,
    quotedProbability: 1 / odds,
    marketPhase,
  }
}
