import { prisma } from '../config/database.js'
import {
  FREE_RECHARGE_AMOUNT,
  FREE_RECHARGE_COOLDOWN_HOURS,
  FREE_RECHARGE_THRESHOLD,
  type FreeRechargeClaimResult,
  type FreeRechargeStatus,
} from './freeRecharge.types.js'

class FreeRechargeError extends Error {
  statusCode: number
  code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export function isFreeRechargeError(err: unknown): err is FreeRechargeError {
  return err instanceof FreeRechargeError
}

/**
 * Récupère le statut de la recharge gratuite pour un utilisateur.
 * - Vérifie si la recharge est disponible
 * - Calcule le temps restant si en cooldown
 * - Vérifie le seuil de jetons
 */
export async function getFreeRechargeStatus(userId: string): Promise<FreeRechargeStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { chips: true },
  })

  if (!user) {
    throw new FreeRechargeError(404, 'USER_NOT_FOUND', 'Utilisateur non trouvé')
  }

  const recharge = await prisma.freeRecharge.findUnique({
    where: { userId },
  })

  const now = new Date()

  // Si jamais rechargé ou cooldown expiré, vérifier le seuil
  if (!recharge?.nextRechargeAfter || recharge.nextRechargeAfter <= now) {
    // Vérifier si solde est au-dessus du seuil
    if (user.chips >= FREE_RECHARGE_THRESHOLD) {
      return {
        canRecharge: false,
        nextRechargeAt: null,
        hoursUntilRecharge: null,
        minutesUntilRecharge: null,
        totalMinutesUntilRecharge: null,
        lastRechargeAt: recharge?.lastRechargeAt?.toISOString() || null,
        message: `Tu dois être en dessous de ${FREE_RECHARGE_THRESHOLD} jetons pour recharger (tu en as ${user.chips})`,
      }
    }

    return {
      canRecharge: true,
      nextRechargeAt: null,
      hoursUntilRecharge: null,
      minutesUntilRecharge: null,
      totalMinutesUntilRecharge: null,
      lastRechargeAt: recharge?.lastRechargeAt?.toISOString() || null,
      message: `Recharge gratuite disponible!`,
    }
  }

  // Cooldown actif : calculer le temps restant
  const msUntilRecharge = recharge.nextRechargeAfter.getTime() - now.getTime()
  const totalMinutes = Math.ceil(msUntilRecharge / 1000 / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return {
    canRecharge: false,
    nextRechargeAt: recharge.nextRechargeAfter.toISOString(),
    hoursUntilRecharge: hours,
    minutesUntilRecharge: minutes,
    totalMinutesUntilRecharge: totalMinutes,
    lastRechargeAt: recharge.lastRechargeAt?.toISOString() || null,
    message: `Prochaine recharge dans ${hours}h ${minutes}m`,
  }
}

/**
 * Effectue une recharge gratuite (transaction Serializable pour limiter doubles crédits concurrents).
 */
export async function claimFreeRecharge(userId: string): Promise<FreeRechargeClaimResult> {
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { chips: true },
        })
        if (!user) {
          throw new FreeRechargeError(404, 'USER_NOT_FOUND', 'Utilisateur non trouvé')
        }

        const recharge = await tx.freeRecharge.findUnique({ where: { userId } })
        const now = new Date()

        if (recharge?.nextRechargeAfter && recharge.nextRechargeAfter > now) {
          const msUntilRecharge = recharge.nextRechargeAfter.getTime() - now.getTime()
          const totalMinutes = Math.ceil(msUntilRecharge / 1000 / 60)
          const hours = Math.floor(totalMinutes / 60)
          const minutes = totalMinutes % 60

          throw new FreeRechargeError(
            429,
            'COOLDOWN_ACTIVE',
            `Recharge indisponible pendant ${hours}h ${minutes}m`,
          )
        }

        if (user.chips >= FREE_RECHARGE_THRESHOLD) {
          throw new FreeRechargeError(
            400,
            'BALANCE_TOO_HIGH',
            `Solde trop élevé : il faut moins de ${FREE_RECHARGE_THRESHOLD} jetons (tu en as ${user.chips}).`,
          )
        }

        const balanceBefore = user.chips
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { chips: { increment: FREE_RECHARGE_AMOUNT } },
          select: { chips: true },
        })

        const nextRechargeAfter = new Date(
          now.getTime() + FREE_RECHARGE_COOLDOWN_HOURS * 60 * 60 * 1000,
        )

        await tx.walletLedgerEntry.create({
          data: {
            userId,
            amount: FREE_RECHARGE_AMOUNT,
            reason: 'FREE_RECHARGE',
            balanceBefore,
            balanceAfter: updatedUser.chips,
            settlementState: 'SETTLED',
          },
        })

        const updatedRecharge = await tx.freeRecharge.upsert({
          where: { userId },
          create: {
            userId,
            lastRechargeAt: now,
            nextRechargeAfter,
          },
          update: {
            lastRechargeAt: now,
            nextRechargeAfter,
            updatedAt: now,
          },
        })

        return {
          newBalance: updatedUser.chips,
          nextRechargeAfter: updatedRecharge.nextRechargeAfter,
        }
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      },
    )

    return {
      success: true,
      newBalance: result.newBalance,
      addedAmount: FREE_RECHARGE_AMOUNT,
      nextRechargeAt: result.nextRechargeAfter?.toISOString() ?? null,
      message: `Recharge de ${FREE_RECHARGE_AMOUNT} jetons effectuée avec succès!`,
    }
  } catch (err: unknown) {
    if (isFreeRechargeError(err)) throw err
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: unknown }).code)
        : ''
    if (code === 'P2034') {
      throw new FreeRechargeError(
        409,
        'CONFLICT_RETRY',
        'Conflit temporaire : réessaie dans une seconde.',
      )
    }
    throw err
  }
}
