import { prisma } from '../config/database.js'
import type { DailyChallengeProgress, Prisma } from '../generated/prisma/index.js'
import { DAILY_CHALLENGE_DEFINITION_BY_CODE } from './dailyChallengeDefinitions.js'
import { DAILY_CHALLENGE_CODES, type DailyChallengeCode } from './dailyChallenge.types.js'
import { dailyChallengeOrder, mapProgressRowToDto } from './dailyChallenge.mapper.js'
import {
  DAY_7_GAMEPLAY_CODES,
  getActiveChallengeCodesForDate,
  getCycleDayIndex,
  getDayKey,
  getWeekKey,
  getWeekStorageDayKey,
  isWeeklyChallengeCode,
  META_DAILY_CHALLENGE_CODE,
  WEEKLY_BONUS_BADGE_ID,
  WEEKLY_BONUS_CODE,
  WEEKLY_BONUS_GOAL,
  WEEKLY_MISSION_CODES,
  WEEKLY_SOCIAL_FOLLOW_CODES,
} from './dailyChallengeRotation.js'
import {
  isSocialFollowChallengeCode,
  SOCIAL_FOLLOW_MAX_AWAY_MS,
  SOCIAL_FOLLOW_MIN_AWAY_MS,
} from './socialFollowChallenges.js'
import { grantManualBadge } from '../logic/gamification.js'
import { isRouletteBlack, isRouletteRed } from '../logic/roulette.js'

type DailyChallengeDb = Prisma.TransactionClient

class DailyChallengeError extends Error {
  statusCode: number
  code: string

  constructor(statusCode: number, code: string, message: string) {
    super(message)
    this.statusCode = statusCode
    this.code = code
  }
}

const pokerWinStreakByUser = new Map<string, number>()
const onlineMinuteLastTick = new Map<string, number>()
const socialFollowVisitStartedAt = new Map<string, number>()

function clampProgress(nextValue: number, goal: number): number {
  return Math.max(0, Math.min(goal, nextValue))
}

function definitionFor(code: DailyChallengeCode) {
  const def = DAILY_CHALLENGE_DEFINITION_BY_CODE.get(code)
  if (!def) throw new Error(`Unknown challenge code: ${code}`)
  return def
}

async function getDailyRowsForUser(
  userId: string,
  db: DailyChallengeDb,
  dayKey = getDayKey()
): Promise<DailyChallengeProgress[]> {
  const rows = await db.dailyChallengeProgress.findMany({
    where: { userId, dayKey },
  })
  return rows.sort(dailyChallengeOrder)
}

async function syncCompleteAllDailyMeta(
  userId: string,
  db: DailyChallengeDb,
  dayKey: string
): Promise<void> {
  const cycleDay = getCycleDayIndex(new Date(`${dayKey}T12:00:00.000Z`))
  if (cycleDay !== 7) return

  const rows = await db.dailyChallengeProgress.findMany({ where: { userId, dayKey } })
  const meta = rows.find((r) => r.challengeCode === META_DAILY_CHALLENGE_CODE)
  if (!meta || meta.completed) return

  const completedCount = rows.filter(
    (r) =>
      DAY_7_GAMEPLAY_CODES.includes(r.challengeCode as DailyChallengeCode) && r.completed
  ).length

  const nextProgress = clampProgress(completedCount, meta.goal)
  await db.dailyChallengeProgress.update({
    where: {
      userId_dayKey_challengeCode: {
        userId,
        dayKey,
        challengeCode: META_DAILY_CHALLENGE_CODE,
      },
    },
    data: {
      progress: nextProgress,
      completed: nextProgress >= meta.goal,
    },
  })
}

async function incrementChallengeProgress(
  userId: string,
  challengeCode: DailyChallengeCode,
  delta: number,
  db: DailyChallengeDb = prisma,
  dayKey = getDayKey()
): Promise<void> {
  if (delta <= 0) return

  const rows = await ensureDailyChallengesForUser(userId, db, dayKey)
  const row = rows.find((r) => r.challengeCode === challengeCode)
  if (!row || row.completed) return

  const nextProgress = clampProgress(row.progress + delta, row.goal)
  await db.dailyChallengeProgress.update({
    where: {
      userId_dayKey_challengeCode: {
        userId,
        dayKey,
        challengeCode,
      },
    },
    data: {
      progress: nextProgress,
      completed: nextProgress >= row.goal,
    },
  })

  await syncCompleteAllDailyMeta(userId, db, dayKey)
}

async function syncWeeklyBonusMeta(
  userId: string,
  db: DailyChallengeDb,
  weekKey = getWeekKey()
): Promise<void> {
  const dayKey = getWeekStorageDayKey(weekKey)
  const missionRows = await db.dailyChallengeProgress.findMany({
    where: {
      userId,
      dayKey,
      challengeCode: { in: [...WEEKLY_MISSION_CODES] },
    },
  })
  const completedMissions = missionRows.filter((r) => r.completed).length
  const bonusDef = definitionFor(WEEKLY_BONUS_CODE)
  const nextProgress = clampProgress(completedMissions, bonusDef.goal)
  const bonusRow = await db.dailyChallengeProgress.findUnique({
    where: {
      userId_dayKey_challengeCode: {
        userId,
        dayKey,
        challengeCode: WEEKLY_BONUS_CODE,
      },
    },
  })
  if (!bonusRow) return
  if (bonusRow.progress === nextProgress && bonusRow.completed === nextProgress >= bonusDef.goal) {
    return
  }

  await db.dailyChallengeProgress.update({
    where: {
      userId_dayKey_challengeCode: {
        userId,
        dayKey,
        challengeCode: WEEKLY_BONUS_CODE,
      },
    },
    data: {
      progress: nextProgress,
      completed: nextProgress >= bonusDef.goal,
    },
  })
}

async function incrementWeeklyChallengeProgress(
  userId: string,
  challengeCode: (typeof WEEKLY_MISSION_CODES)[number],
  delta: number,
  db: DailyChallengeDb = prisma,
  weekKey = getWeekKey()
): Promise<void> {
  if (delta <= 0) return

  const rows = await ensureWeeklyChallengesForUser(userId, db, weekKey)
  const row = rows.find((r) => r.challengeCode === challengeCode)
  if (!row || row.completed) return

  const nextProgress = clampProgress(row.progress + delta, row.goal)
  await db.dailyChallengeProgress.update({
    where: {
      userId_dayKey_challengeCode: {
        userId,
        dayKey: getWeekStorageDayKey(weekKey),
        challengeCode,
      },
    },
    data: {
      progress: nextProgress,
      completed: nextProgress >= row.goal,
    },
  })

  await syncWeeklyBonusMeta(userId, db, weekKey)
}

async function ensureWeeklyChallengesForUser(
  userId: string,
  db: DailyChallengeDb = prisma,
  weekKey = getWeekKey()
): Promise<DailyChallengeProgress[]> {
  const dayKey = getWeekStorageDayKey(weekKey)
  const codes = [...WEEKLY_MISSION_CODES, ...WEEKLY_SOCIAL_FOLLOW_CODES, WEEKLY_BONUS_CODE]
  await db.dailyChallengeProgress.createMany({
    data: codes.map((code) => {
      const def = definitionFor(code)
      return {
        userId,
        dayKey,
        challengeCode: code,
        progress: 0,
        goal: def.goal,
        completed: false,
        claimed: false,
        rewardTokens: def.rewardTokens,
      }
    }),
    skipDuplicates: true,
  })

  const rows = await db.dailyChallengeProgress.findMany({
    where: { userId, dayKey },
  })
  await syncWeeklyBonusMeta(userId, db, weekKey)
  return rows
    .filter((r) => isWeeklyChallengeCode(r.challengeCode))
    .sort((a, b) => {
      const order = [...WEEKLY_MISSION_CODES, ...WEEKLY_SOCIAL_FOLLOW_CODES, WEEKLY_BONUS_CODE]
      return order.indexOf(a.challengeCode as typeof order[number]) -
        order.indexOf(b.challengeCode as typeof order[number])
    })
}

async function markWeeklyGameWon(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementWeeklyChallengeProgress(userId, 'WEEKLY_WIN_5_GAMES', 1, db)
}

export async function markWeeklyNetChipsWon(
  userId: string,
  amount: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (amount <= 0) return
  await incrementWeeklyChallengeProgress(userId, 'WEEKLY_WIN_10K_CHIPS', amount, db)
}

export async function ensureDailyChallengesForUser(
  userId: string,
  db: DailyChallengeDb = prisma,
  dayKey = getDayKey()
): Promise<DailyChallengeProgress[]> {
  const activeCodes = getActiveChallengeCodesForDate(new Date(`${dayKey}T12:00:00.000Z`))
  await db.dailyChallengeProgress.createMany({
    data: activeCodes.map((code) => {
      const def = definitionFor(code)
      return {
        userId,
        dayKey,
        challengeCode: code,
        progress: 0,
        goal: def.goal,
        completed: false,
        claimed: false,
        rewardTokens: def.rewardTokens,
      }
    }),
    skipDuplicates: true,
  })

  return getDailyRowsForUser(userId, db, dayKey)
}

async function refreshWeeklyProgressAfterClaim(
  userId: string,
  db: DailyChallengeDb
): Promise<void> {
  await syncWeeklyBonusMeta(userId, db)
}

export async function addRouletteNetWinProgress(
  userId: string,
  netWin: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (netWin <= 0) return
  await incrementChallengeProgress(userId, 'WIN_200_ROULETTE', netWin, db)
  await markWeeklyNetChipsWon(userId, netWin, db)
}

export async function addSlotNetWinProgress(
  userId: string,
  netWin: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (netWin <= 0) return
  await incrementChallengeProgress(userId, 'WIN_200_SLOT', netWin, db)
  await markWeeklyNetChipsWon(userId, netWin, db)
}

export async function incrementMultiplayerPlayCount(
  userId: string,
  isBotGame: boolean,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (!isBotGame) {
    await incrementChallengeProgress(userId, 'PLAY_5_TIMES', 1, db)
  }
}

export async function markWinWithPair(
  userId: string,
  finalHandName: string | undefined,
  didWin: boolean,
  isBotGame: boolean,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (!didWin || isBotGame) return
  if (finalHandName !== 'Paire') return
  await incrementChallengeProgress(userId, 'WIN_WITH_PAIR', 1, db)
}

export async function markWinShowdown(
  userId: string,
  didWin: boolean,
  isBotGame: boolean,
  handEndReason: string | undefined,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (!didWin || isBotGame) return
  if (handEndReason !== 'SHOWDOWN' && handEndReason !== 'ALL_IN_RUNOUT') return
  await incrementChallengeProgress(userId, 'WIN_SHOWDOWN', 1, db)
}

export async function markBlackjackRoundResult(
  userId: string,
  reason: string,
  payout: number,
  totalBet: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  const netWin = Math.max(0, payout - totalBet)
  if (reason === 'player_blackjack') {
    await incrementChallengeProgress(userId, 'BLACKJACK_NATURAL', 1, db)
  }
  if (payout > totalBet) {
    await incrementChallengeProgress(userId, 'WIN_3_BLACKJACK', 1, db)
    if (netWin > 0) {
      await incrementChallengeProgress(userId, 'BLACKJACK_WIN_500', netWin, db)
    }
    await markWeeklyGameWon(userId, db)
    await markWeeklyNetChipsWon(userId, netWin, db)
  }
}

export async function markCrashRoundStarted(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'CRASH_5_ROUNDS', 1, db)
}

export async function markCrashCashout(
  userId: string,
  multiplier: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (multiplier >= 2) {
    await incrementChallengeProgress(userId, 'CRASH_CASHOUT_2X', 1, db)
  }
  if (multiplier >= 3) {
    await incrementChallengeProgress(userId, 'CRASH_CASHOUT_3X', 1, db)
  }
}

export async function markChatMessageSent(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'SEND_3_CHAT', 1, db)
}

export async function markBeloteMatchWon(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'WIN_BELOTE_MATCH', 1, db)
  await markWeeklyGameWon(userId, db)
}

export async function markBeloteMatchCompleted(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementWeeklyChallengeProgress(userId, 'WEEKLY_BELOTE_3_MATCHES', 1, db)
}

export async function markBeloteTeamScore(
  userId: string,
  teamScore: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (teamScore >= 100) {
    await incrementChallengeProgress(userId, 'BELOTE_100_POINTS', 1, db)
  }
}

export async function markRouletteSpin(
  userId: string,
  bets: Array<{ type: string; amount: number }>,
  totalPayout: number,
  totalStake: number,
  winningNumber: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'ROULETTE_10_BETS', 1, db)

  if (totalPayout <= totalStake) return

  const winningRed = isRouletteRed(winningNumber)
  const winningBlack = isRouletteBlack(winningNumber)

  for (const bet of bets) {
    if (bet.type !== 'red' && bet.type !== 'black') continue
    const colorWon =
      (bet.type === 'red' && winningRed) || (bet.type === 'black' && winningBlack)
    if (colorWon) {
      await incrementChallengeProgress(userId, 'ROULETTE_COLOR_WIN_3', 1, db)
      break
    }
  }
}

export async function markPokerHandPlayed(
  userId: string,
  isBotGame: boolean,
  participated: boolean,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (isBotGame || !participated) return
  await incrementChallengeProgress(userId, 'POKER_10_HANDS', 1, db)
  await incrementWeeklyChallengeProgress(userId, 'WEEKLY_POKER_20_HANDS', 1, db)
}

export async function markPokerHandResult(
  userId: string,
  opts: {
    isBotGame: boolean
    participated: boolean
    didWin: boolean
    chipsWon: number
    handEndReason?: string
    communityCardCount: number
    finalHandName?: string
  },
  db: DailyChallengeDb = prisma
): Promise<void> {
  const { isBotGame, participated, didWin, chipsWon, handEndReason, communityCardCount, finalHandName } =
    opts

  await markPokerHandPlayed(userId, isBotGame, participated, db)

  if (isBotGame || !participated) {
    if (!isBotGame) pokerWinStreakByUser.set(userId, 0)
    return
  }

  if (communityCardCount >= 5) {
    await incrementChallengeProgress(userId, 'REACH_RIVER_5', 1, db)
  }

  if (didWin) {
    const streak = (pokerWinStreakByUser.get(userId) ?? 0) + 1
    pokerWinStreakByUser.set(userId, streak)
    if (streak >= 2) {
      await incrementChallengeProgress(userId, 'WIN_2_HANDS_ROW', 1, db)
    }
    if (chipsWon > 0) {
      await incrementChallengeProgress(userId, 'POKER_WIN_500_CHIPS', chipsWon, db)
    }
    await markWinShowdown(userId, true, false, handEndReason, db)
    await markWinWithPair(userId, finalHandName, true, false, db)
    await incrementChallengeProgress(userId, 'WIN_3_MULTIPLAYER', 1, db)
    await markWeeklyGameWon(userId, db)
    if (chipsWon > 0) {
      await markWeeklyNetChipsWon(userId, chipsWon, db)
    }
  } else {
    pokerWinStreakByUser.set(userId, 0)
  }
}

export async function markSlotSpin(
  userId: string,
  netWin: number,
  isThreeOfKind: boolean,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'SLOT_20_SPINS', 1, db)
  if (netWin > 0) {
    await addSlotNetWinProgress(userId, netWin, db)
  }
  if (isThreeOfKind) {
    await incrementChallengeProgress(userId, 'SLOT_BONUS_WIN', 1, db)
  }
}

export async function markWheelSpin(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'WHEEL_5_SPINS', 1, db)
}

export async function markLuckyNumberRound(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'LUCKY_NUMBER_10_ROUNDS', 1, db)
}

export async function markFriendInvitedToTable(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'INVITE_FRIEND', 1, db)
  await incrementWeeklyChallengeProgress(userId, 'WEEKLY_INVITE_FRIEND', 1, db)
}

export async function recordOnlinePresenceMinute(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  const now = Date.now()
  const last = onlineMinuteLastTick.get(userId) ?? 0
  if (now - last < 55_000) return
  onlineMinuteLastTick.set(userId, now)
  await incrementChallengeProgress(userId, 'ONLINE_15_MIN', 1, db)
}

export async function getMyDailyChallenges(userId: string): Promise<{
  dayKey: string
  cycleDay: number
  challenges: ReturnType<typeof mapProgressRowToDto>[]
  weeklyChallenges: ReturnType<typeof mapProgressRowToDto>[]
  weeklyBonus: {
    code: 'WEEKLY_BONUS'
    weekKey: string
    i18nKey: string
    progress: number
    goal: number
    completed: boolean
    claimed: boolean
    rewardTokens: number
    badgeId: string
  }
}> {
  const dayKey = getDayKey()
  const cycleDay = getCycleDayIndex()
  const weekKey = getWeekKey()

  const [rows, weeklyRows] = await prisma.$transaction(async (tx) => {
    const daily = await ensureDailyChallengesForUser(userId, tx, dayKey)
    const weekly = await ensureWeeklyChallengesForUser(userId, tx, weekKey)
    return [daily, weekly] as const
  })

  const missionRows = weeklyRows.filter((r) =>
    (WEEKLY_MISSION_CODES as readonly string[]).includes(r.challengeCode) ||
    (WEEKLY_SOCIAL_FOLLOW_CODES as readonly string[]).includes(r.challengeCode)
  )
  const bonusRow = weeklyRows.find((r) => r.challengeCode === WEEKLY_BONUS_CODE)
  const bonusDef = definitionFor(WEEKLY_BONUS_CODE)

  return {
    dayKey,
    cycleDay,
    challenges: rows.map(mapProgressRowToDto),
    weeklyChallenges: missionRows.map(mapProgressRowToDto),
    weeklyBonus: {
      code: WEEKLY_BONUS_CODE,
      weekKey,
      i18nKey: bonusDef.i18nKey,
      progress: bonusRow?.progress ?? 0,
      goal: bonusRow?.goal ?? WEEKLY_BONUS_GOAL,
      completed: bonusRow?.completed ?? false,
      claimed: bonusRow?.claimed ?? false,
      rewardTokens: bonusRow?.rewardTokens ?? bonusDef.rewardTokens,
      badgeId: WEEKLY_BONUS_BADGE_ID,
    },
  }
}

function socialFollowVisitKey(userId: string, challengeCode: string): string {
  return `${userId}:${challengeCode}`
}

export function markSocialFollowVisitStarted(userId: string, challengeCodeRaw: string): void {
  if (!isSocialFollowChallengeCode(challengeCodeRaw)) {
    throw new DailyChallengeError(400, 'INVALID_CHALLENGE_CODE', 'Code challenge invalide')
  }
  socialFollowVisitStartedAt.set(socialFollowVisitKey(userId, challengeCodeRaw), Date.now())
}

export async function completeSocialFollowVisit(
  userId: string,
  challengeCodeRaw: string
): Promise<{
  dayKey: string
  challengeCode: DailyChallengeCode
  rewardTokens: number
  chips: number
  newBadges: string[]
}> {
  if (!isSocialFollowChallengeCode(challengeCodeRaw)) {
    throw new DailyChallengeError(400, 'INVALID_CHALLENGE_CODE', 'Code challenge invalide')
  }
  const challengeCode = challengeCodeRaw as DailyChallengeCode
  const visitKey = socialFollowVisitKey(userId, challengeCode)
  const startedAt = socialFollowVisitStartedAt.get(visitKey)
  if (startedAt == null) {
    throw new DailyChallengeError(400, 'SOCIAL_VISIT_NOT_STARTED', 'Visite réseau social non démarrée')
  }

  const awayMs = Date.now() - startedAt
  if (awayMs < SOCIAL_FOLLOW_MIN_AWAY_MS) {
    throw new DailyChallengeError(400, 'SOCIAL_VISIT_TOO_SHORT', 'Revenez après avoir visité la page')
  }
  if (awayMs > SOCIAL_FOLLOW_MAX_AWAY_MS) {
    socialFollowVisitStartedAt.delete(visitKey)
    throw new DailyChallengeError(400, 'SOCIAL_VISIT_EXPIRED', 'Visite expirée, recommencez')
  }

  socialFollowVisitStartedAt.delete(visitKey)
  const dayKey = getWeekStorageDayKey()

  return prisma.$transaction(async (tx) => {
    await ensureWeeklyChallengesForUser(userId, tx)
    const challenge = await tx.dailyChallengeProgress.findUnique({
      where: {
        userId_dayKey_challengeCode: {
          userId,
          dayKey,
          challengeCode,
        },
      },
    })
    if (!challenge) {
      throw new DailyChallengeError(404, 'CHALLENGE_NOT_FOUND', 'Challenge introuvable')
    }
    if (challenge.claimed) {
      throw new DailyChallengeError(409, 'CHALLENGE_ALREADY_CLAIMED', 'Challenge déjà réclamé')
    }

    if (!challenge.completed) {
      await tx.dailyChallengeProgress.update({
        where: {
          userId_dayKey_challengeCode: {
            userId,
            dayKey,
            challengeCode,
          },
        },
        data: {
          progress: challenge.goal,
          completed: true,
        },
      })
    }

    const rewardTokens = challenge.rewardTokens
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { chips: { increment: rewardTokens } },
      select: { chips: true },
    })

    await tx.walletLedgerEntry.create({
      data: {
        userId,
        amount: rewardTokens,
        reason: 'WEEKLY_CHALLENGE_REWARD',
        gameType: 'daily_challenge',
        roundId: getWeekKey(),
        actionId: `weekly-social:${getWeekKey()}:${challengeCode}`,
      },
    })

    await tx.dailyChallengeProgress.update({
      where: {
        userId_dayKey_challengeCode: {
          userId,
          dayKey,
          challengeCode,
        },
      },
      data: { claimed: true, claimedAt: new Date() },
    })

    return {
      dayKey,
      challengeCode,
      rewardTokens,
      chips: updatedUser.chips,
      newBadges: [],
    }
  })
}

export async function claimDailyChallenge(userId: string, challengeCodeRaw: string): Promise<{
  dayKey: string
  challengeCode: DailyChallengeCode
  rewardTokens: number
  chips: number
  newBadges: string[]
}> {
  if (!DAILY_CHALLENGE_CODES.includes(challengeCodeRaw as DailyChallengeCode)) {
    throw new DailyChallengeError(400, 'INVALID_CHALLENGE_CODE', 'Code challenge invalide')
  }
  const challengeCode = challengeCodeRaw as DailyChallengeCode
  const isWeekly = isWeeklyChallengeCode(challengeCode)
  const dayKey = isWeekly ? getWeekStorageDayKey() : getDayKey()

  return prisma.$transaction(async (tx) => {
    if (isWeekly) {
      await ensureWeeklyChallengesForUser(userId, tx)
      const challenge = await tx.dailyChallengeProgress.findUnique({
        where: {
          userId_dayKey_challengeCode: {
            userId,
            dayKey,
            challengeCode,
          },
        },
      })
      if (!challenge) {
        throw new DailyChallengeError(404, 'CHALLENGE_NOT_FOUND', 'Challenge introuvable')
      }
      if (!challenge.completed) {
        throw new DailyChallengeError(400, 'CHALLENGE_NOT_COMPLETED', 'Challenge non complété')
      }
      if (challenge.claimed) {
        throw new DailyChallengeError(409, 'CHALLENGE_ALREADY_CLAIMED', 'Challenge déjà réclamé')
      }

      const rewardTokens = challenge.rewardTokens
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: rewardTokens } },
        select: { chips: true },
      })

      await tx.walletLedgerEntry.create({
        data: {
          userId,
          amount: rewardTokens,
          reason: 'WEEKLY_CHALLENGE_REWARD',
          gameType: 'daily_challenge',
          roundId: getWeekKey(),
          actionId: `weekly:${getWeekKey()}:${challengeCode}`,
        },
      })

      await tx.dailyChallengeProgress.update({
        where: {
          userId_dayKey_challengeCode: {
            userId,
            dayKey: challenge.dayKey,
            challengeCode,
          },
        },
        data: { claimed: true, claimedAt: new Date() },
      })

      const newBadges: string[] = []
      if (challengeCode === WEEKLY_BONUS_CODE) {
        const badgeGranted = await grantManualBadge(tx, userId, WEEKLY_BONUS_BADGE_ID)
        if (badgeGranted) newBadges.push(WEEKLY_BONUS_BADGE_ID)
      }

      return {
        dayKey: challenge.dayKey,
        challengeCode,
        rewardTokens,
        chips: updatedUser.chips,
        newBadges,
      }
    }

    await ensureDailyChallengesForUser(userId, tx, dayKey)

    const challenge = await tx.dailyChallengeProgress.findUnique({
      where: {
        userId_dayKey_challengeCode: {
          userId,
          dayKey,
          challengeCode,
        },
      },
    })
    if (!challenge) {
      throw new DailyChallengeError(404, 'CHALLENGE_NOT_FOUND', 'Challenge introuvable')
    }
    if (!challenge.completed) {
      throw new DailyChallengeError(400, 'CHALLENGE_NOT_COMPLETED', 'Challenge non complété')
    }
    if (challenge.claimed) {
      throw new DailyChallengeError(409, 'CHALLENGE_ALREADY_CLAIMED', 'Challenge déjà réclamé')
    }

    const rewardTokens = challenge.rewardTokens
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { chips: { increment: rewardTokens } },
      select: { chips: true },
    })

    await tx.walletLedgerEntry.create({
      data: {
        userId,
        amount: rewardTokens,
        reason: 'DAILY_CHALLENGE_REWARD',
        gameType: 'daily_challenge',
        roundId: dayKey,
        actionId: `daily:${dayKey}:${challengeCode}`,
      },
    })

    await tx.dailyChallengeProgress.update({
      where: {
        userId_dayKey_challengeCode: {
          userId,
          dayKey,
          challengeCode,
        },
      },
      data: {
        claimed: true,
        claimedAt: new Date(),
      },
    })

    await refreshWeeklyProgressAfterClaim(userId, tx)

    return {
      dayKey,
      challengeCode,
      rewardTokens,
      chips: updatedUser.chips,
      newBadges: [],
    }
  })
}

export function isDailyChallengeError(err: unknown): err is DailyChallengeError {
  return err instanceof DailyChallengeError
}
