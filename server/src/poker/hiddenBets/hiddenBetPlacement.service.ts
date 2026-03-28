import { createHash, randomUUID } from 'node:crypto'
import type { CashGameController } from '../../logic/CashGameController.js'
import { intChips } from '../../utils/chips.js'
import { prisma } from '../../config/database.js'
import { appendWalletLedgerEntry } from '../../casino/services/walletLedger.service.js'
import {
  abortIdempotentAction,
  buildIdempotencyKey,
  fingerprintStableJson,
  saveIdempotentResult,
  tryBeginIdempotentAction,
} from '../../casino/services/idempotency.service.js'
import { createHiddenBetLedgerContext } from './hiddenBetLedgerContext.js'
import {
  HIDDEN_BETS_PRICING_VERSION,
  QUOTE_TTL_MS,
  type QuoteRequestBody,
  type SelectionPayload,
} from './types.js'
import { computeQuotedOdds, marketKeyAndSignature, validateSelections } from './markets.js'
import { rootLogger } from '../../observability/logger.js'

const MIN_STAKE = 10
const MAX_STAKE = 10_000

function assertCashWindow(cash: CashGameController, handId: string): { ok: true } | { ok: false; error: string } {
  if (!cash.isHiddenBetWindowOpen()) return { ok: false, error: 'Marché paris cachés fermé' }
  const next = cash.getPendingNextHandId()
  if (!next || next !== handId) return { ok: false, error: 'handId ne correspond pas à la prochaine main' }
  return { ok: true }
}

function computeQuoteHash(parts: {
  pricingVersion: string
  gameId: string
  handId: string
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
} {
  const w = assertCashWindow(cash, body.handId)
  if (!w.ok) throw new Error(w.error)

  const v = validateSelections(body.selections, body.combinator)
  if (!v.ok) throw new Error(v.error)

  const occupied = cash.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
  const n = occupied.length
  const odds = computeQuotedOdds(v.selections, body.combinator, n)
  if (odds <= 0) throw new Error('cote invalide')

  const quoteExpiresAt = Date.now() + QUOTE_TTL_MS
  const quoteHash = computeQuoteHash({
    pricingVersion: HIDDEN_BETS_PRICING_VERSION,
    gameId,
    handId: body.handId,
    combinator: body.combinator,
    selections: v.selections,
    quoteExpiresAt,
  })

  const preview = Math.max(MIN_STAKE, Math.min(MAX_STAKE, intChips(body.stakePreview ?? 100)))
  const potentialPayout = Math.floor(preview * odds)

  return {
    quotedOdds: odds,
    potentialPayout,
    pricingVersion: HIDDEN_BETS_PRICING_VERSION,
    quoteExpiresAt: new Date(quoteExpiresAt).toISOString(),
    quoteHash,
    quotedProbability: 1 / odds,
  }
}

export async function placeHiddenBet(
  cash: CashGameController,
  gameId: string,
  userId: string,
  input: {
    handId: string
    stake: number
    combinator: 'SINGLE' | 'AND'
    selections: unknown[]
    actionId: string
    quoteHash?: string
    expectedPricingVersion?: string
    quoteExpiresAt?: string
  }
): Promise<{ ticket: unknown }> {
  const w = assertCashWindow(cash, input.handId)
  if (!w.ok) throw new Error(w.error)

  const stake = intChips(input.stake)
  if (stake < MIN_STAKE || stake > MAX_STAKE) throw new Error(`Mise entre ${MIN_STAKE} et ${MAX_STAKE}`)

  const v = validateSelections(input.selections, input.combinator)
  if (!v.ok) throw new Error(v.error)

  const occupied = cash.getOccupiedSeats().filter((s) => s.userId && s.chips > 0)
  const seatedIds = new Set(occupied.map((s) => s.userId!))
  if (!seatedIds.has(userId)) throw new Error('Vous devez être assis à cette table')

  const odds = computeQuotedOdds(v.selections, input.combinator, occupied.length)
  if (odds <= 0) throw new Error('cote invalide')

  if (input.expectedPricingVersion && input.expectedPricingVersion !== HIDDEN_BETS_PRICING_VERSION) {
    throw new Error('Version de pricing obsolète')
  }

  const exp = input.quoteExpiresAt ? Date.parse(input.quoteExpiresAt) : 0
  if (input.quoteHash && input.quoteExpiresAt) {
    if (Number.isNaN(exp) || Date.now() > exp) throw new Error('Quote expirée')
    const expectedHash = computeQuoteHash({
      pricingVersion: HIDDEN_BETS_PRICING_VERSION,
      gameId,
      handId: input.handId,
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
  }

  const potentialPayout = Math.floor(stake * odds)
  const idemKey = buildIdempotencyKey({
    userId,
    gameType: 'poker_hidden_bet',
    actionId: input.actionId.trim(),
  })
  const fp = fingerprintStableJson({
    gameId,
    handId: input.handId,
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
            handId: input.handId,
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
          handId: input.handId,
          status: 'PENDING',
          stake,
          quotedOdds: odds,
          potentialPayout,
          combinator: input.combinator,
          actionId: input.actionId.trim(),
          pricingVersion: HIDDEN_BETS_PRICING_VERSION,
          quoteHash: input.quoteHash ?? null,
          quotedProbability: 1 / odds,
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
      handId: input.handId,
      actionId: input.actionId,
    })
    return result
  } catch (e) {
    await abortIdempotentAction(idemKey)
    throw e
  }
}
