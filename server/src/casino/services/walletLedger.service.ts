import { createHash } from 'node:crypto'
import { prisma } from '../../config/database.js'
import type { PrismaClient } from '../../generated/prisma/index.js'
import type { CasinoRoundContext } from '../domain/casinoRound.types.js'

/** Client Prisma racine ou client de transaction (`$transaction`) pour écrire le ledger dans la même tx que les jetons. */
export type WalletLedgerDb = Pick<PrismaClient, 'walletLedgerEntry'>

type WalletLedgerReason =
  | 'ROULETTE_STAKE'
  | 'ROULETTE_PAYOUT'
  | 'SLOT_STAKE'
  | 'SLOT_PAYOUT'
  | 'CRASH_STAKE'
  | 'CRASH_PAYOUT'
  | 'MINES_STAKE'
  | 'MINES_PAYOUT'
  | 'WHEEL_STAKE'
  | 'WHEEL_PAYOUT'
  | 'LUCKY_NUMBER_STAKE'
  | 'LUCKY_NUMBER_PAYOUT'
  | 'BLACKJACK_STAKE'
  | 'BLACKJACK_PAYOUT'
  | 'HIDDEN_BET_STAKE'
  | 'HIDDEN_BET_PAYOUT'
  | 'HIDDEN_BET_REFUND_VOID'
  | 'HIDDEN_BET_REFUND_CANCEL'
  | 'LOAN_FUNDED_OUT'
  | 'LOAN_FUNDED_IN'
  | 'LOAN_REPAYMENT_OUT'
  | 'LOAN_REPAYMENT_IN'
  | 'CASH_POKER_BUY_IN'
  | 'CASH_POKER_REBUY'
  | 'CASH_POKER_CASHOUT'
  | 'CASH_POKER_HAND_RESULT'
  | 'BELOTE_WIN'
  | 'BELOTE_PLAY'
  | 'BELOTE_BUY_IN'
  | 'BELOTE_POT_WIN'

export type WalletLedgerInput = {
  context: CasinoRoundContext
  reason: WalletLedgerReason
  amount: number
  balanceBefore: number
  balanceAfter: number
}

function integrityHashFor(input: WalletLedgerInput): string {
  return createHash('sha256')
    .update(
      [
        input.context.roundId,
        input.context.actionId,
        input.context.userId,
        input.context.gameType,
        input.reason,
        input.amount,
        input.balanceBefore,
        input.balanceAfter,
        input.context.engineVersion,
        input.context.rulesVersion,
        input.context.payoutTableVersion,
        input.context.rngVersion,
      ].join('|')
    )
    .digest('hex')
}

export async function appendWalletLedgerEntry(
  input: WalletLedgerInput,
  db: WalletLedgerDb = prisma
): Promise<void> {
  const delegate = db.walletLedgerEntry as { create?: (args: unknown) => Promise<unknown> }
  if (!delegate?.create) {
    // Migration may not yet be applied in all envs.
    return
  }
  const integrityHash = integrityHashFor(input)
  if (input.balanceAfter >= 1_000_000) {
    void import('../../achievements/achievement.service.js').then(({ checkAchievements }) => {
      void checkAchievements(input.context.userId, {
        type: 'CHIPS_BALANCE',
        chips: input.balanceAfter,
      })
    })
  }

  await delegate.create({
    data: {
      roundId: input.context.roundId,
      actionId: input.context.actionId,
      userId: input.context.userId,
      gameType: input.context.gameType,
      reason: input.reason,
      amount: input.amount,
      balanceBefore: input.balanceBefore,
      balanceAfter: input.balanceAfter,
      settlementState: 'SETTLED',
      engineVersion: input.context.engineVersion,
      rulesVersion: input.context.rulesVersion,
      payoutTableVersion: input.context.payoutTableVersion,
      rngVersion: input.context.rngVersion,
      integrityHash,
    },
  })
}

/** Mouvement de solde sans contexte casino (tournois, promos simples, etc.) — historique GET /api/auth/balance-history. */
export type SimpleWalletLedgerInput = {
  userId: string
  reason: string
  balanceBefore: number
  balanceAfter: number
  gameType?: string | null
  roundId?: string | null
}

export async function createWalletLedgerMovement(
  db: WalletLedgerDb,
  input: SimpleWalletLedgerInput,
): Promise<void> {
  const delegate = db.walletLedgerEntry as { create?: (args: unknown) => Promise<unknown> }
  if (!delegate?.create) return
  const before = Math.floor(Number(input.balanceBefore))
  const after = Math.floor(Number(input.balanceAfter))
  const amount = after - before
  if (after >= 1_000_000) {
    void import('../../achievements/achievement.service.js').then(({ checkAchievements }) => {
      void checkAchievements(input.userId, { type: 'CHIPS_BALANCE', chips: after })
    })
  }

  await delegate.create({
    data: {
      userId: input.userId,
      reason: input.reason,
      amount,
      balanceBefore: before,
      balanceAfter: after,
      gameType: input.gameType ?? undefined,
      roundId: input.roundId ?? undefined,
      settlementState: 'SETTLED',
    },
  })
}

