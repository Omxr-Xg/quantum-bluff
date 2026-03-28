import { randomUUID } from 'node:crypto'
import type { CashGameController } from '../../../logic/CashGameController.js'
import { intChips } from '../../../utils/chips.js'
import { prisma } from '../../../config/database.js'
import { appendWalletLedgerEntry } from '../../../casino/services/walletLedger.service.js'
import {
  abortIdempotentAction,
  buildIdempotencyKey,
  fingerprintStableJson,
  saveIdempotentResult,
  tryBeginIdempotentAction,
} from '../../../casino/services/idempotency.service.js'
import { createHiddenBetLedgerContext } from '../hiddenBetLedgerContext.js'
import {
  HIDDEN_BETS_PRE_PRICING_VERSION,
  HIDDEN_BETS_LIVE_PRICING_VERSION,
  pricingVersionForPhase,
  type HiddenBetMarketPhase,
  type SelectionPayload,
} from '../types.js'
import { computeQuotedOdds, marketKeyAndSignature, validateSelections } from '../markets.js'
import { assertHiddenBetQuoteOrPlace, buildLiveQuoteSnapshotJson } from './hiddenBetWindow.service.js'
import { computeQuoteHash } from './hiddenBetQuote.service.js'
import { rootLogger } from '../../../observability/logger.js'

const MIN_STAKE = 10
const MAX_STAKE = 10_000

function normalizePricingVersion(v: string | undefined): string {
  if (v === 'hidden-bets-v1') return HIDDEN_BETS_PRE_PRICING_VERSION
  return v ?? ''
}

export async function placeHiddenBet(
  cash: CashGameController,
  gameId: string,
  userId: string,
  input: {
    targetHandId?: string
    handId?: string
    marketPhase: HiddenBetMarketPhase
    stake: number
    combinator: 'SINGLE' | 'AND'
    selections: unknown[]
    actionId: string
    quoteHash?: string
    expectedPricingVersion?: string
    quoteExpiresAt?: string
  }
): Promise<{ ticket: unknown }> {
  const marketPhase = input.marketPhase
  if (!marketPhase) throw new Error('marketPhase requis')

  const targetHandId = (input.targetHandId ?? input.handId ?? '').trim()
  if (!targetHandId) throw new Error('targetHandId requis')

  const w = assertHiddenBetQuoteOrPlace(cash, targetHandId, marketPhase)
  if (!w.ok) throw new Error(w.error)

  const stake = intChips(input.stake)
  if (stake < MIN_STAKE || stake > MAX_STAKE) throw new Error(`Mise entre ${MIN_STAKE} et ${MAX_STAKE}`)

  const v = validateSelections(input.selections, input.combinator, marketPhase)
  if (!v.ok) throw new Error(v.error)

  const occupied = cash.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
  const seatedIds = new Set(occupied.map((s) => s.userId!))
  if (!seatedIds.has(userId)) throw new Error('Vous devez être assis à cette table')

  const odds = computeQuotedOdds(v.selections, input.combinator, occupied.length, marketPhase)
  if (odds <= 0) throw new Error('cote invalide')

  const expectedPv = pricingVersionForPhase(marketPhase)
  const incomingPv = normalizePricingVersion(input.expectedPricingVersion)
  if (incomingPv && incomingPv !== expectedPv) {
    throw new Error('Version de pricing obsolète')
  }

  const exp = input.quoteExpiresAt ? Date.parse(input.quoteExpiresAt) : 0
  if (input.quoteHash && input.quoteExpiresAt) {
    if (Number.isNaN(exp) || Date.now() > exp) throw new Error('Quote expirée')
    const expectedHash = computeQuoteHash({
      pricingVersion: expectedPv,
      gameId,
      handId: targetHandId,
      marketPhase,
      combinator: input.combinator,
      selections: v.selections,
      quoteExpiresAt: exp,
    })
    if (expectedHash !== input.quoteHash) throw new Error('Quote invalide ou altérée')
  }

  for (const sel of v.selections) {
    if (sel.marketType === 'PLAYER_WINS' && !seatedIds.has(sel.playerId)) {
      throw new Error('Joueur cible invalide pour PLAYER_WINS')
    }
    if (sel.marketType === 'PLAYER_WINS_CURRENT_HAND' && !seatedIds.has(sel.playerId)) {
      throw new Error('Joueur cible invalide pour PLAYER_WINS_CURRENT_HAND')
    }
  }

  const potentialPayout = Math.floor(stake * odds)
  const quoteExpiresAtDate = input.quoteExpiresAt ? new Date(input.quoteExpiresAt) : null
  const stateSnapshotJson = marketPhase !== 'PRE_HAND' ? buildLiveQuoteSnapshotJson(cash) : null

  const idemKey = buildIdempotencyKey({
    userId,
    gameType: 'poker_hidden_bet',
    actionId: input.actionId.trim(),
  })
  const fp = fingerprintStableJson({
    gameId,
    handId: targetHandId,
    marketPhase,
    stake,
    combinator: input.combinator,
    selections: v.selections,
  })
  const idemStart = await tryBeginIdempotentAction(idemKey, { payloadFingerprint: fp })
  if (!idemStart.accepted) {
    if (idemStart.reason === 'PAYLOAD_MISMATCH') throw new Error('Rejeu idempotent : payload différent')
    if (idemStart.storedResult != null) return idemStart.storedResult as { ticket: unknown }
    throw new Error('Action déjà traitée')
  }

  const ticketId = randomUUID()
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new Error('Utilisateur introuvable')
      if (user.chips < stake) throw new Error('Solde insuffisant')

      const balanceAfterStake = user.chips - stake
      await tx.user.update({
        where: { id: userId },
        data: { chips: balanceAfterStake },
      })

      await appendWalletLedgerEntry(
        {
          context: createHiddenBetLedgerContext({
            userId,
            actionId: input.actionId,
            gameId,
            handId: targetHandId,
          }),
          reason: 'HIDDEN_BET_STAKE',
          amount: -stake,
          balanceBefore: user.chips,
          balanceAfter: balanceAfterStake,
        },
        tx
      )

      const ticket = await tx.hiddenBetTicket.create({
        data: {
          id: ticketId,
          userId,
          gameId,
          handId: targetHandId,
          marketPhase,
          status: 'PENDING',
          stake,
          quotedOdds: odds,
          potentialPayout,
          combinator: input.combinator,
          actionId: input.actionId.trim(),
          pricingVersion: expectedPv,
          quoteHash: input.quoteHash ?? null,
          quotedProbability: 1 / odds,
          quoteExpiresAt: quoteExpiresAtDate,
          stateSnapshotJson,
          selections: {
            create: v.selections.map((sel, i) => {
              const mk = marketKeyAndSignature(sel)
              return {
                marketType: sel.marketType,
                marketKey: mk.marketKey,
                paramSignature: mk.paramSignature,
                paramsJson: JSON.stringify(sel),
                displayLabel: null,
                sequenceOrder: i,
              }
            }),
          },
        },
        include: { selections: true },
      })

      return { ticket }
    })

    await saveIdempotentResult(idemKey, result)
    rootLogger.info({
      msg: 'hidden_bet_placed',
      ticketId,
      userId,
      gameId,
      handId: targetHandId,
      marketPhase,
      actionId: input.actionId,
    })
    return result
  } catch (e) {
    await abortIdempotentAction(idemKey)
    throw e
  }
}
