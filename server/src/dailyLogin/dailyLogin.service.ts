import { prisma } from '../config/database.js'
import {
  DAILY_LOGIN_CYCLE_LENGTH,
  DAILY_LOGIN_REWARDS,
  rewardForDay,
  type DailyLoginClaimResult,
  type DailyLoginStatus,
} from './dailyLogin.types.js'

class DailyLoginError extends Error {
  statusCode: number
  code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

export function isDailyLoginError(err: unknown): err is DailyLoginError {
  return err instanceof DailyLoginError
}

/** Clé du jour courant en UTC (YYYY-MM-DD). On utilise UTC pour éviter les triches via fuseau horaire. */
function getDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Renvoie la clé du jour précédent (D-1). */
function getPreviousDayKey(dayKey: string): string {
  const d = new Date(`${dayKey}T00:00:00.000Z`)
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * Calcule le numéro de jour qui sera attribué SI le joueur clique "Récupérer" maintenant.
 *  - Si déjà réclamé aujourd'hui → garde le streak actuel (rien ne change).
 *  - Si la dernière réclamation était hier → streak + 1 (en cyclant 1..7).
 *  - Sinon (jamais réclamé OU plus d'un jour de retard) → 1 (reset).
 */
function computeNextDayIndex(params: {
  loginStreakCount: number
  lastLoginRewardDayKey: string | null
  dayKey: string
}): { nextDayIndex: number; reset: boolean } {
  const { loginStreakCount, lastLoginRewardDayKey, dayKey } = params

  if (lastLoginRewardDayKey === dayKey) {
    // Déjà réclamé aujourd'hui : on conserve la position actuelle.
    return { nextDayIndex: Math.max(1, loginStreakCount), reset: false }
  }

  const yesterday = getPreviousDayKey(dayKey)
  if (lastLoginRewardDayKey === yesterday && loginStreakCount > 0) {
    // Continuité : J+1, en cyclant après 7.
    const next = (loginStreakCount % DAILY_LOGIN_CYCLE_LENGTH) + 1
    return { nextDayIndex: next, reset: false }
  }

  // Première fois OU série cassée.
  return { nextDayIndex: 1, reset: loginStreakCount > 0 }
}

export async function getDailyLoginStatus(userId: string): Promise<DailyLoginStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      loginStreakCount: true,
      lastLoginRewardDayKey: true,
    },
  })
  if (!user) {
    throw new DailyLoginError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable')
  }

  const dayKey = getDayKey()
  const claimedToday = user.lastLoginRewardDayKey === dayKey
  const { nextDayIndex } = computeNextDayIndex({
    loginStreakCount: user.loginStreakCount,
    lastLoginRewardDayKey: user.lastLoginRewardDayKey,
    dayKey,
  })

  return {
    dayKey,
    streakCount: user.loginStreakCount,
    claimedToday,
    nextAction: claimedToday ? 'ALREADY_CLAIMED' : 'CLAIM_TODAY',
    nextDayIndex,
    nextReward: claimedToday ? 0 : rewardForDay(nextDayIndex),
    rewards: DAILY_LOGIN_REWARDS,
  }
}

export async function claimDailyLogin(userId: string): Promise<DailyLoginClaimResult> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: {
        chips: true,
        loginStreakCount: true,
        lastLoginRewardDayKey: true,
      },
    })
    if (!user) {
      throw new DailyLoginError(404, 'USER_NOT_FOUND', 'Utilisateur introuvable')
    }

    const dayKey = getDayKey()
    if (user.lastLoginRewardDayKey === dayKey) {
      throw new DailyLoginError(409, 'ALREADY_CLAIMED', 'Récompense déjà réclamée aujourd’hui')
    }

    const { nextDayIndex, reset } = computeNextDayIndex({
      loginStreakCount: user.loginStreakCount,
      lastLoginRewardDayKey: user.lastLoginRewardDayKey,
      dayKey,
    })
    const rewardTokens = rewardForDay(nextDayIndex)

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        chips: { increment: rewardTokens },
        loginStreakCount: nextDayIndex,
        lastLoginRewardDayKey: dayKey,
        lastLoginRewardAt: new Date(),
      },
      select: { chips: true },
    })

    // Trace comptable (utilisée par l'historique du portefeuille côté client).
    await tx.walletLedgerEntry.create({
      data: {
        userId,
        amount: rewardTokens,
        reason: 'DAILY_LOGIN_REWARD',
        gameType: 'daily_login',
        roundId: dayKey,
        actionId: `daily-login:${dayKey}:${nextDayIndex}`,
        balanceBefore: user.chips,
        balanceAfter: updated.chips,
        settlementState: 'SETTLED',
      },
    })

    return {
      dayKey,
      streakCount: nextDayIndex,
      rewardTokens,
      chips: updated.chips,
      reset,
    }
  })
}
