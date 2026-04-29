import { prisma } from '../config/database.js'
import type { DailyChallengeProgress, Prisma } from '../generated/prisma/index.js'
import { DAILY_CHALLENGE_DEFINITIONS } from './dailyChallengeDefinitions.js'
import { DAILY_CHALLENGE_CODES, type DailyChallengeCode } from './dailyChallenge.types.js'
import { dailyChallengeOrder, mapProgressRowToDto } from './dailyChallenge.mapper.js'

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

function getDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

function clampProgress(nextValue: number, goal: number): number {
  return Math.max(0, Math.min(goal, nextValue))
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

export async function ensureDailyChallengesForUser(
  userId: string,
  db: DailyChallengeDb = prisma,
  dayKey = getDayKey()
): Promise<DailyChallengeProgress[]> {
  await db.dailyChallengeProgress.createMany({
    data: DAILY_CHALLENGE_DEFINITIONS.map((def) => ({
      userId,
      dayKey,
      challengeCode: def.code,
      progress: 0,
      goal: def.goal,
      completed: false,
      claimed: false,
      rewardTokens: def.rewardTokens,
    })),
    skipDuplicates: true,
  })

  return getDailyRowsForUser(userId, db, dayKey)
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
  if (!row) return
  if (row.completed) return

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
}

export async function addRouletteNetWinProgress(
  userId: string,
  netWin: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (netWin <= 0) return
  await incrementChallengeProgress(userId, 'WIN_200_ROULETTE', netWin, db)
}

export async function addSlotNetWinProgress(
  userId: string,
  netWin: number,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (netWin <= 0) return
  await incrementChallengeProgress(userId, 'WIN_200_SLOT', netWin, db)
}

export async function incrementMultiplayerPlayCount(
  userId: string,
  db: DailyChallengeDb = prisma
): Promise<void> {
  await incrementChallengeProgress(userId, 'PLAY_5_TIMES', 1, db)
}

export async function markWinWithPair(
  userId: string,
  finalHandName: string | undefined,
  didWin: boolean,
  db: DailyChallengeDb = prisma
): Promise<void> {
  if (!didWin) return
  if (finalHandName !== 'Paire') return
  await incrementChallengeProgress(userId, 'WIN_WITH_PAIR', 1, db)
}

export async function getMyDailyChallenges(userId: string): Promise<{
  dayKey: string
  challenges: ReturnType<typeof mapProgressRowToDto>[]
}> {
  const dayKey = getDayKey()
  const rows = await prisma.$transaction(async (tx) => ensureDailyChallengesForUser(userId, tx, dayKey))
  return {
    dayKey,
    challenges: rows.map(mapProgressRowToDto),
  }
}

export async function claimDailyChallenge(userId: string, challengeCodeRaw: string): Promise<{
  dayKey: string
  challengeCode: DailyChallengeCode
  rewardTokens: number
  chips: number
}> {
  if (!DAILY_CHALLENGE_CODES.includes(challengeCodeRaw as DailyChallengeCode)) {
    throw new DailyChallengeError(400, 'INVALID_CHALLENGE_CODE', 'Code challenge invalide')
  }
  const challengeCode = challengeCodeRaw as DailyChallengeCode
  const dayKey = getDayKey()

  return prisma.$transaction(async (tx) => {
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

    return {
      dayKey,
      challengeCode,
      rewardTokens,
      chips: updatedUser.chips,
    }
  })
}

export function isDailyChallengeError(err: unknown): err is DailyChallengeError {
  return err instanceof DailyChallengeError
}
