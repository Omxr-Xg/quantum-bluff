import { randomUUID } from 'node:crypto'
import type { LoanSourceGameType } from '../generated/prisma/index.js'
import type { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { intChips } from '../utils/chips.js'
import { appendWalletLedgerEntry } from '../casino/services/walletLedger.service.js'
import type { CasinoRoundContext } from '../casino/domain/casinoRound.types.js'
import { createFriendLoanLedgerContext } from '../casino/services/roundContext.service.js'
import {
  computeRepaymentSlice,
  computeTotalDue,
  getInterestRate,
  isAllowedRepaymentRate,
} from '../logic/friendLoan.interest.js'

export const LOAN_MIN_AMOUNT = 100
export const LOAN_MAX_AMOUNT = 1_000_000
export const LOAN_REQUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000

export type WalletPayoutReason =
  | 'SLOT_PAYOUT'
  | 'ROULETTE_PAYOUT'
  | 'BLACKJACK_PAYOUT'
  | 'CRASH_PAYOUT'
  | 'MINES_PAYOUT'

export type RepaymentSocketPayload = {
  loanId: string
  borrowerId: string
  lenderId: string
  repaymentAmount: number
  borrowerNetReceived: number
  remainingAmount: number
  repaidAmount: number
  totalDue: number
  sourceGameType: LoanSourceGameType
  sourceReferenceId: string
}

function friendshipWherePair(a: string, b: string): Prisma.FriendshipWhereInput {
  return {
    OR: [
      { user1Id: a, user2Id: b },
      { user1Id: b, user2Id: a },
    ],
  }
}

export async function assertSingleActiveLoan(
  tx: Prisma.TransactionClient,
  borrowerId: string
): Promise<void> {
  const active = await tx.loan.findFirst({
    where: { borrowerId, status: 'ACTIVE' },
    select: { id: true },
  })
  if (active) {
    throw Object.assign(new Error('BORROWER_HAS_ACTIVE_LOAN'), { code: 'BORROWER_HAS_ACTIVE_LOAN' })
  }
}

async function findActiveLoanForBorrowerTx(
  tx: Prisma.TransactionClient,
  borrowerId: string
): Promise<{
  id: string
  lenderId: string
  repaymentRate: number
  remainingAmount: number
  totalDue: number
  repaidAmount: number
} | null> {
  return tx.loan.findFirst({
    where: { borrowerId, status: 'ACTIVE' },
    select: {
      id: true,
      lenderId: true,
      repaymentRate: true,
      remainingAmount: true,
      totalDue: true,
      repaidAmount: true,
    },
  })
}

export async function createLoanRequest(input: {
  borrowerId: string
  lenderId: string
  amount: number
  repaymentRate: number
}) {
  const { borrowerId, lenderId } = input
  if (borrowerId === lenderId) {
    throw Object.assign(new Error('INVALID_LOAN_PARTIES'), { code: 'INVALID_LOAN_PARTIES' })
  }

  const amount = intChips(input.amount)
  if (!Number.isFinite(amount) || amount !== Math.floor(input.amount)) {
    throw Object.assign(new Error('INVALID_LOAN_AMOUNT'), { code: 'INVALID_LOAN_AMOUNT' })
  }
  if (amount < LOAN_MIN_AMOUNT || amount > LOAN_MAX_AMOUNT) {
    throw Object.assign(new Error('LOAN_AMOUNT_OUT_OF_RANGE'), {
      code: 'LOAN_AMOUNT_OUT_OF_RANGE',
      min: LOAN_MIN_AMOUNT,
      max: LOAN_MAX_AMOUNT,
    })
  }

  if (!isAllowedRepaymentRate(input.repaymentRate)) {
    throw Object.assign(new Error('INVALID_REPAYMENT_RATE'), { code: 'INVALID_REPAYMENT_RATE' })
  }

  const interestRate = getInterestRate(input.repaymentRate)
  const totalDue = computeTotalDue(amount, interestRate)

  const now = new Date()

  const result = await prisma.$transaction(async (tx) => {
    const friendship = await tx.friendship.findFirst({
      where: friendshipWherePair(borrowerId, lenderId),
      select: { id: true },
    })
    if (!friendship) {
      throw Object.assign(new Error('NOT_FRIENDS'), { code: 'NOT_FRIENDS' })
    }

    await assertSingleActiveLoan(tx, borrowerId)

    const pendingDup = await tx.loanRequest.findFirst({
      where: {
        borrowerId,
        lenderId,
        status: 'PENDING',
      },
      select: { id: true },
    })
    if (pendingDup) {
      throw Object.assign(new Error('LOAN_REQUEST_PENDING_EXISTS'), { code: 'LOAN_REQUEST_PENDING_EXISTS' })
    }

    const lender = await tx.user.findUnique({
      where: { id: lenderId },
      select: { chips: true },
    })
    if (!lender) {
      throw Object.assign(new Error('LENDER_NOT_FOUND'), { code: 'LENDER_NOT_FOUND' })
    }
    if (intChips(lender.chips) < amount) {
      throw Object.assign(new Error('LENDER_INSUFFICIENT_CHIPS'), { code: 'LENDER_INSUFFICIENT_CHIPS' })
    }

    const expiresAt = new Date(now.getTime() + LOAN_REQUEST_TTL_MS)
    const loanRequest = await tx.loanRequest.create({
      data: {
        borrowerId,
        lenderId,
        amount,
        repaymentRate: input.repaymentRate,
        interestRate,
        totalDue,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        borrower: { select: { id: true, username: true } },
        lender: { select: { id: true, username: true } },
      },
    })

    await tx.loanLedgerEvent.create({
      data: {
        requestId: loanRequest.id,
        type: 'REQUEST_CREATED',
        amount,
        metadataJson: {
          repaymentRate: input.repaymentRate,
          interestRate,
          totalDue,
        },
      },
    })

    return loanRequest
  })

  return { loanRequest: result }
}

export async function acceptLoanRequest(input: {
  requestId: string
  lenderId: string
}) {
  const { requestId, lenderId } = input

  const loan = await prisma.$transaction(async (tx) => {
    const req = await tx.loanRequest.findUnique({ where: { id: requestId } })
    if (!req) {
      throw Object.assign(new Error('LOAN_REQUEST_NOT_FOUND'), { code: 'LOAN_REQUEST_NOT_FOUND' })
    }
    if (req.lenderId !== lenderId) {
      throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' })
    }
    if (req.status !== 'PENDING') {
      throw Object.assign(new Error('LOAN_REQUEST_NOT_PENDING'), { code: 'LOAN_REQUEST_NOT_PENDING' })
    }
    if (req.expiresAt.getTime() < Date.now()) {
      await tx.loanRequest.update({
        where: { id: requestId },
        data: { status: 'EXPIRED', respondedAt: new Date() },
      })
      throw Object.assign(new Error('LOAN_REQUEST_EXPIRED'), { code: 'LOAN_REQUEST_EXPIRED' })
    }

    await assertSingleActiveLoan(tx, req.borrowerId)

    const principal = req.amount
    const lenderChipsBefore = await tx.user.findUnique({
      where: { id: lenderId },
      select: { chips: true },
    })
    const borrowerChipsBefore = await tx.user.findUnique({
      where: { id: req.borrowerId },
      select: { chips: true },
    })
    if (!lenderChipsBefore || !borrowerChipsBefore) {
      throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
    }

    const lBefore = intChips(lenderChipsBefore.chips)
    const bBefore = intChips(borrowerChipsBefore.chips)

    const debit = await tx.user.updateMany({
      where: { id: lenderId, chips: { gte: principal } },
      data: { chips: { decrement: principal } },
    })
    if (debit.count === 0) {
      throw Object.assign(new Error('LENDER_INSUFFICIENT_CHIPS'), { code: 'LENDER_INSUFFICIENT_CHIPS' })
    }

    await tx.user.update({
      where: { id: req.borrowerId },
      data: { chips: { increment: principal } },
    })

    const lAfter = lBefore - principal
    const bAfter = bBefore + principal

    const lenderCtx = createFriendLoanLedgerContext({
      userId: lenderId,
      loanId: requestId,
      actionId: `fund-out:${randomUUID()}`,
    })
    const borrowerCtx = createFriendLoanLedgerContext({
      userId: req.borrowerId,
      loanId: requestId,
      actionId: `fund-in:${randomUUID()}`,
    })

    await appendWalletLedgerEntry(
      {
        context: lenderCtx,
        reason: 'LOAN_FUNDED_OUT',
        amount: -principal,
        balanceBefore: lBefore,
        balanceAfter: lAfter,
      },
      tx
    )
    await appendWalletLedgerEntry(
      {
        context: borrowerCtx,
        reason: 'LOAN_FUNDED_IN',
        amount: principal,
        balanceBefore: bBefore,
        balanceAfter: bAfter,
      },
      tx
    )

    const created = await tx.loan.create({
      data: {
        requestId: req.id,
        borrowerId: req.borrowerId,
        lenderId: req.lenderId,
        principalAmount: principal,
        interestRate: req.interestRate,
        totalDue: req.totalDue,
        remainingAmount: req.totalDue,
        repaidAmount: 0,
        repaymentRate: req.repaymentRate,
        status: 'ACTIVE',
      },
      include: {
        borrower: { select: { id: true, username: true } },
        lender: { select: { id: true, username: true } },
      },
    })

    await tx.loanRequest.update({
      where: { id: req.id },
      data: { status: 'ACCEPTED', respondedAt: new Date() },
    })

    await tx.loanLedgerEvent.create({
      data: {
        loanId: created.id,
        requestId: req.id,
        type: 'REQUEST_ACCEPTED',
        amount: principal,
        metadataJson: { totalDue: req.totalDue, interestRate: req.interestRate },
      },
    })
    await tx.loanLedgerEvent.create({
      data: {
        loanId: created.id,
        requestId: req.id,
        type: 'FUNDED',
        amount: principal,
        metadataJson: {
          borrowerId: req.borrowerId,
          lenderId,
          lenderBalanceBefore: lBefore,
          lenderBalanceAfter: lAfter,
          borrowerBalanceBefore: bBefore,
          borrowerBalanceAfter: bAfter,
        },
      },
    })

    return created
  })

  return { loan }
}

export async function rejectLoanRequest(input: { requestId: string; lenderId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const req = await tx.loanRequest.findUnique({ where: { id: input.requestId } })
    if (!req) {
      throw Object.assign(new Error('LOAN_REQUEST_NOT_FOUND'), { code: 'LOAN_REQUEST_NOT_FOUND' })
    }
    if (req.lenderId !== input.lenderId) {
      throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' })
    }
    if (req.status !== 'PENDING') {
      throw Object.assign(new Error('LOAN_REQUEST_NOT_PENDING'), { code: 'LOAN_REQUEST_NOT_PENDING' })
    }
    await tx.loanRequest.update({
      where: { id: input.requestId },
      data: { status: 'REJECTED', respondedAt: new Date() },
    })
    await tx.loanLedgerEvent.create({
      data: {
        requestId: req.id,
        type: 'REQUEST_REJECTED',
        amount: 0,
        metadataJson: {},
      },
    })
  })
}

export async function cancelLoanRequest(input: { requestId: string; borrowerId: string }): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const req = await tx.loanRequest.findUnique({ where: { id: input.requestId } })
    if (!req) {
      throw Object.assign(new Error('LOAN_REQUEST_NOT_FOUND'), { code: 'LOAN_REQUEST_NOT_FOUND' })
    }
    if (req.borrowerId !== input.borrowerId) {
      throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' })
    }
    if (req.status !== 'PENDING') {
      throw Object.assign(new Error('LOAN_REQUEST_NOT_PENDING'), { code: 'LOAN_REQUEST_NOT_PENDING' })
    }
    await tx.loanRequest.update({
      where: { id: input.requestId },
      data: { status: 'CANCELLED', respondedAt: new Date() },
    })
    await tx.loanLedgerEvent.create({
      data: {
        requestId: req.id,
        type: 'REQUEST_CANCELLED',
        amount: 0,
        metadataJson: {},
      },
    })
  })
}

export async function applyRepaymentOnPositiveWin(
  tx: Prisma.TransactionClient,
  params: {
    userId: string
    gameType: LoanSourceGameType
    /** Jetons crédités sur ce coup (paiement total roulette / slot / blackjack). */
    grossWinAmount: number
    /**
     * Mise déjà débitée pour ce coup (si renseigné) : le % de remboursement s’applique à
     * max(0, grossWinAmount − casinoStakeAmount), pas au simple rendu de mise.
     */
    casinoStakeAmount?: number
    sourceReferenceId: string
    /** Contexte du tour de jeu (slot / roulette / BJ) pour le ledger payout + remboursement. */
    casinoContext: CasinoRoundContext
    balanceBeforeGrossPayout: number
    payoutLedgerReason: WalletPayoutReason
  }
): Promise<{
  hadActiveLoan: boolean
  applied: boolean
  borrowerCredit: number
  repaymentToLender: number
  loanCompleted: boolean
  loanId?: string
  lenderId?: string
  /** Sockets à émettre après commit de la transaction. */
  socketRepayment?: RepaymentSocketPayload
  socketCompleted?: RepaymentSocketPayload
}> {
  const chipCredit = intChips(params.grossWinAmount)
  if (chipCredit <= 0) {
    throw Object.assign(new Error('GROSS_WIN_NOT_POSITIVE'), { code: 'GROSS_WIN_NOT_POSITIVE' })
  }

  const stake =
    params.casinoStakeAmount != null ? intChips(params.casinoStakeAmount) : 0
  const repaymentBasis =
    params.casinoStakeAmount != null ? Math.max(0, chipCredit - stake) : chipCredit

  const loan = await findActiveLoanForBorrowerTx(tx, params.userId)
  if (!loan) {
    return {
      hadActiveLoan: false,
      applied: false,
      borrowerCredit: chipCredit,
      repaymentToLender: 0,
      loanCompleted: false,
    }
  }

  const repayment = computeRepaymentSlice(repaymentBasis, loan.repaymentRate, loan.remainingAmount)
  const borrowerNet = chipCredit - repayment
  const balanceMid = params.balanceBeforeGrossPayout + chipCredit
  const balanceFinalBorrower = params.balanceBeforeGrossPayout + borrowerNet

  await appendWalletLedgerEntry(
    {
      context: params.casinoContext,
      reason: params.payoutLedgerReason,
      amount: chipCredit,
      balanceBefore: params.balanceBeforeGrossPayout,
      balanceAfter: balanceMid,
    },
    tx
  )

  if (repayment > 0) {
    const lenderRow = await tx.user.findUnique({
      where: { id: loan.lenderId },
      select: { chips: true },
    })
    const lenderBefore = intChips(lenderRow?.chips ?? 0)

    await appendWalletLedgerEntry(
      {
        context: params.casinoContext,
        reason: 'LOAN_REPAYMENT_OUT',
        amount: -repayment,
        balanceBefore: balanceMid,
        balanceAfter: balanceFinalBorrower,
      },
      tx
    )

    const lenderAfter = lenderBefore + repayment
    await appendWalletLedgerEntry(
      {
        context: createFriendLoanLedgerContext({
          userId: loan.lenderId,
          loanId: loan.id,
          actionId: `repay-in:${params.sourceReferenceId}`,
        }),
        reason: 'LOAN_REPAYMENT_IN',
        amount: repayment,
        balanceBefore: lenderBefore,
        balanceAfter: lenderAfter,
      },
      tx
    )

    await tx.user.update({
      where: { id: params.userId },
      data: { chips: { increment: borrowerNet } },
    })
    await tx.user.update({
      where: { id: loan.lenderId },
      data: { chips: { increment: repayment } },
    })

    const newRepaid = loan.repaidAmount + repayment
    const newRemaining = loan.remainingAmount - repayment
    const loanCompleted = newRemaining <= 0

    await tx.loanRepayment.create({
      data: {
        loanId: loan.id,
        borrowerId: params.userId,
        lenderId: loan.lenderId,
        sourceGameType: params.gameType,
        sourceReferenceId: params.sourceReferenceId,
        grossWinAmount: chipCredit,
        repaymentAmount: repayment,
        borrowerNetReceived: borrowerNet,
      },
    })

    await tx.loanLedgerEvent.create({
      data: {
        loanId: loan.id,
        type: 'REPAYMENT_APPLIED',
        amount: repayment,
        metadataJson: {
          gameType: params.gameType,
          sourceReferenceId: params.sourceReferenceId,
          grossWinAmount: chipCredit,
          repaymentProfitBasis: repaymentBasis,
          borrowerNetReceived: borrowerNet,
        },
      },
    })

    await tx.loan.update({
      where: { id: loan.id },
      data: {
        repaidAmount: newRepaid,
        remainingAmount: loanCompleted ? 0 : newRemaining,
        lastRepaymentAt: new Date(),
        ...(loanCompleted
          ? { status: 'COMPLETED', completedAt: new Date() }
          : {}),
      },
    })

    if (loanCompleted) {
      await tx.loanLedgerEvent.create({
        data: {
          loanId: loan.id,
          type: 'COMPLETED',
          amount: 0,
          metadataJson: {},
        },
      })
    }

    const baseSocket: RepaymentSocketPayload = {
      loanId: loan.id,
      borrowerId: params.userId,
      lenderId: loan.lenderId,
      repaymentAmount: repayment,
      borrowerNetReceived: borrowerNet,
      remainingAmount: loanCompleted ? 0 : newRemaining,
      repaidAmount: newRepaid,
      totalDue: loan.totalDue,
      sourceGameType: params.gameType,
      sourceReferenceId: params.sourceReferenceId,
    }

    return {
      hadActiveLoan: true,
      applied: true,
      borrowerCredit: borrowerNet,
      repaymentToLender: repayment,
      loanCompleted,
      loanId: loan.id,
      lenderId: loan.lenderId,
      socketRepayment: baseSocket,
      socketCompleted: loanCompleted ? baseSocket : undefined,
    }
  }

  await tx.user.update({
    where: { id: params.userId },
    data: { chips: { increment: chipCredit } },
  })

  return {
    hadActiveLoan: true,
    applied: false,
    borrowerCredit: chipCredit,
    repaymentToLender: 0,
    loanCompleted: false,
    loanId: loan.id,
    lenderId: loan.lenderId,
  }
}

/**
 * Poker cash : `grossWinDelta` = max(0, snapshotChips − solde DB avant écriture).
 * Ne crédite pas le joueur : l’appelant applique le solde final (snapshot ajusté).
 * Crédite uniquement le prêteur et met à jour le prêt. Ledger : LOAN_REPAYMENT_* uniquement.
 */
export async function applyRepaymentOnPokerSettlement(
  tx: Prisma.TransactionClient,
  params: {
    borrowerId: string
    grossWinDelta: number
    /** Solde cible issu du moteur poker après cette main (avant prélèvement prêt). */
    borrowerBalanceAfterFullWin: number
    gameId: string
    handId: string
  }
): Promise<{
  repayment: number
  loanCompleted: boolean
  lenderId?: string
  borrowerAdjustment: number
  socketRepayment?: RepaymentSocketPayload
  socketCompleted?: RepaymentSocketPayload
}> {
  const delta = intChips(params.grossWinDelta)
  if (delta <= 0) {
    return { repayment: 0, loanCompleted: false, borrowerAdjustment: 0 }
  }

  const loan = await findActiveLoanForBorrowerTx(tx, params.borrowerId)
  if (!loan) {
    return { repayment: 0, loanCompleted: false, borrowerAdjustment: 0 }
  }

  const repayment = computeRepaymentSlice(delta, loan.repaymentRate, loan.remainingAmount)
  if (repayment <= 0) {
    return {
      repayment: 0,
      loanCompleted: false,
      borrowerAdjustment: 0,
      lenderId: loan.lenderId,
    }
  }

  const lenderRow = await tx.user.findUnique({
    where: { id: loan.lenderId },
    select: { chips: true },
  })
  const lenderBefore = intChips(lenderRow?.chips ?? 0)
  const lenderAfter = lenderBefore + repayment

  const borrowerCtx = createFriendLoanLedgerContext({
    userId: params.borrowerId,
    loanId: loan.id,
    actionId: `poker-repay-out:${params.handId}`,
  })
  const lenderCtx = createFriendLoanLedgerContext({
    userId: loan.lenderId,
    loanId: loan.id,
    actionId: `poker-repay-in:${params.handId}`,
  })

  const snap = intChips(params.borrowerBalanceAfterFullWin)
  const balanceAfterRepay = snap - repayment

  await appendWalletLedgerEntry(
    {
      context: borrowerCtx,
      reason: 'LOAN_REPAYMENT_OUT',
      amount: -repayment,
      balanceBefore: snap,
      balanceAfter: balanceAfterRepay,
    },
    tx
  )
  await appendWalletLedgerEntry(
    {
      context: lenderCtx,
      reason: 'LOAN_REPAYMENT_IN',
      amount: repayment,
      balanceBefore: lenderBefore,
      balanceAfter: lenderAfter,
    },
    tx
  )

  const newRepaid = loan.repaidAmount + repayment
  const newRemaining = loan.remainingAmount - repayment
  const loanCompleted = newRemaining <= 0

  await tx.loanRepayment.create({
    data: {
      loanId: loan.id,
      borrowerId: params.borrowerId,
      lenderId: loan.lenderId,
      sourceGameType: 'POKER_CASH',
      sourceReferenceId: `${params.gameId}:${params.handId}`,
      grossWinAmount: delta,
      repaymentAmount: repayment,
      borrowerNetReceived: delta - repayment,
    },
  })

  await tx.loanLedgerEvent.create({
    data: {
      loanId: loan.id,
      type: 'REPAYMENT_APPLIED',
      amount: repayment,
      metadataJson: {
        gameType: 'POKER_CASH',
        gameId: params.gameId,
        handId: params.handId,
        grossWinDelta: delta,
      },
    },
  })

  await tx.loan.update({
    where: { id: loan.id },
    data: {
      repaidAmount: newRepaid,
      remainingAmount: loanCompleted ? 0 : newRemaining,
      lastRepaymentAt: new Date(),
      ...(loanCompleted ? { status: 'COMPLETED', completedAt: new Date() } : {}),
    },
  })

  if (loanCompleted) {
    await tx.loanLedgerEvent.create({
      data: {
        loanId: loan.id,
        type: 'COMPLETED',
        amount: 0,
        metadataJson: {},
      },
    })
  }

  const baseSocket: RepaymentSocketPayload = {
    loanId: loan.id,
    borrowerId: params.borrowerId,
    lenderId: loan.lenderId,
    repaymentAmount: repayment,
    borrowerNetReceived: delta - repayment,
    remainingAmount: loanCompleted ? 0 : newRemaining,
    repaidAmount: newRepaid,
    totalDue: loan.totalDue,
    sourceGameType: 'POKER_CASH',
    sourceReferenceId: `${params.gameId}:${params.handId}`,
  }

  return {
    repayment,
    loanCompleted,
    lenderId: loan.lenderId,
    borrowerAdjustment: -repayment,
    socketRepayment: baseSocket,
    socketCompleted: loanCompleted ? baseSocket : undefined,
  }
}

export async function listLoansForUser(userId: string) {
  const prismaCompat = prisma as unknown as {
    loanRequest?: {
      updateMany?: (args: unknown) => Promise<unknown>
      findMany?: (args: unknown) => Promise<unknown[]>
    }
    loan?: {
      findMany?: (args: unknown) => Promise<unknown[]>
    }
  }
  const loanRequestDelegate = prismaCompat.loanRequest
  const loanDelegate = prismaCompat.loan
  if (
    !loanRequestDelegate?.updateMany ||
    !loanRequestDelegate.findMany ||
    !loanDelegate?.findMany
  ) {
    console.warn('[friendLoan] list: missing Prisma loan delegates, returning empty payload')
    return {
      requestsSent: [],
      requestsReceived: [],
      activeLoans: [],
      completedLoans: [],
    }
  }

  const now = new Date()
  await loanRequestDelegate.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: now },
    },
    data: { status: 'EXPIRED', respondedAt: now },
  })

  const [requestsSent, requestsReceived, activeLoans, completedLoans] = await Promise.all([
    loanRequestDelegate.findMany({
      where: { borrowerId: userId },
      orderBy: { createdAt: 'desc' },
      include: { lender: { select: { id: true, username: true } } },
    }),
    loanRequestDelegate.findMany({
      where: { lenderId: userId },
      orderBy: { createdAt: 'desc' },
      include: { borrower: { select: { id: true, username: true } } },
    }),
    loanDelegate.findMany({
      where: { OR: [{ borrowerId: userId }, { lenderId: userId }], status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: { select: { id: true, username: true } },
        lender: { select: { id: true, username: true } },
      },
    }),
    loanDelegate.findMany({
      where: { OR: [{ borrowerId: userId }, { lenderId: userId }], status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      take: 50,
      include: {
        borrower: { select: { id: true, username: true } },
        lender: { select: { id: true, username: true } },
      },
    }),
  ])

  return { requestsSent, requestsReceived, activeLoans, completedLoans }
}

export async function getLoanDetail(loanId: string, userId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    include: {
      borrower: { select: { id: true, username: true } },
      lender: { select: { id: true, username: true } },
      repayments: { orderBy: { createdAt: 'desc' }, take: 100 },
    },
  })
  if (!loan) return null
  if (loan.borrowerId !== userId && loan.lenderId !== userId) return null
  return loan
}
