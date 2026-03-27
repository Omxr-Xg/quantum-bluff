import { createHash } from 'node:crypto'
import { prisma } from '../../config/database.js'
import type { CasinoRoundContext } from '../domain/casinoRound.types.js'

type WalletLedgerReason =
  | 'ROULETTE_STAKE'
  | 'ROULETTE_PAYOUT'
  | 'SLOT_STAKE'
  | 'SLOT_PAYOUT'
  | 'BLACKJACK_STAKE'
  | 'BLACKJACK_PAYOUT'

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

export async function appendWalletLedgerEntry(input: WalletLedgerInput): Promise<void> {
  const delegate = (prisma as unknown as { walletLedgerEntry?: { create: (args: unknown) => Promise<unknown> } }).walletLedgerEntry
  if (!delegate?.create) {
    // Migration may not yet be applied in all envs.
    return
  }
  const integrityHash = integrityHashFor(input)
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

