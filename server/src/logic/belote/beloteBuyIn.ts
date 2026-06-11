import { randomUUID } from 'crypto'
import type { Prisma } from '../../generated/prisma/index.js'
import { appendWalletLedgerEntry } from '../../casino/services/walletLedger.service.js'
import { createCasinoRoundContext } from '../../casino/services/roundContext.service.js'
import { intChips } from '../../utils/chips.js'

export const BELOTE_BUY_IN_PRESETS = [100, 200, 500, 1000] as const
export const BELOTE_BUY_IN_DEFAULT = 100
export const BELOTE_BUY_IN_MIN = 10
export const BELOTE_BUY_IN_MAX = 1_000_000

export class BeloteInsufficientChipsError extends Error {
  readonly code = 'INSUFFICIENT_CHIPS' as const
  readonly usernames: string[]

  constructor(usernames: string[]) {
    super(`INSUFFICIENT_CHIPS:${usernames.join(',')}`)
    this.name = 'BeloteInsufficientChipsError'
    this.usernames = usernames
  }
}

export function normalizeBeloteBuyIn(raw: unknown): number {
  const n = Number(raw)
  if (!Number.isFinite(n)) return BELOTE_BUY_IN_DEFAULT
  return Math.min(BELOTE_BUY_IN_MAX, Math.max(BELOTE_BUY_IN_MIN, Math.floor(n)))
}

export function belotePotTotal(buyIn: number, playerCount = 4): number {
  return buyIn * playerCount
}

export function beloteWinnerPayout(potTotal: number, winnersCount = 2): number {
  if (winnersCount <= 0) return 0
  return Math.floor(potTotal / winnersCount)
}

/** Débite la mise d'entrée de chaque joueur (transaction Prisma). */
export async function chargeBeloteBuyIns(
  tx: Prisma.TransactionClient,
  gameId: string,
  roomId: string,
  seats: Array<{ userId: string; username: string }>,
  buyIn: number,
): Promise<void> {
  if (buyIn <= 0) return

  const insufficient: string[] = []

  for (const seat of seats) {
    const user = await tx.user.findUnique({
      where: { id: seat.userId },
      select: { chips: true, username: true },
    })
    if (!user || intChips(user.chips) < buyIn) {
      insufficient.push(user?.username ?? seat.username)
    }
  }

  if (insufficient.length > 0) {
    throw new BeloteInsufficientChipsError(insufficient)
  }

  for (const seat of seats) {
    const before = await tx.user.findUnique({
      where: { id: seat.userId },
      select: { chips: true },
    })
    if (!before) continue
    const balBefore = intChips(before.chips)

    const updated = await tx.user.update({
      where: { id: seat.userId },
      data: { chips: { decrement: buyIn } },
      select: { chips: true },
    })

    await appendWalletLedgerEntry(
      {
        context: createCasinoRoundContext({
          userId: seat.userId,
          gameType: 'belote',
          roundId: gameId,
          actionId: randomUUID(),
        }),
        reason: 'BELOTE_BUY_IN',
        amount: -buyIn,
        balanceBefore: balBefore,
        balanceAfter: intChips(updated.chips),
      },
      tx,
    )
  }

  void roomId
}
