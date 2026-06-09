import type { DailyChallengeProgress, Prisma } from '../generated/prisma/index.js'
import { DAILY_CHALLENGE_DEFINITION_BY_CODE } from './dailyChallengeDefinitions.js'
import type { DailyChallengeProgressDto } from './dailyChallenge.types.js'
import { getActiveChallengeCodesForDate } from './dailyChallengeRotation.js'

export function mapProgressRowToDto(row: DailyChallengeProgress): DailyChallengeProgressDto {
  const def = DAILY_CHALLENGE_DEFINITION_BY_CODE.get(row.challengeCode as DailyChallengeProgressDto['code'])
  return {
    code: row.challengeCode as DailyChallengeProgressDto['code'],
    i18nKey: def?.i18nKey ?? `dailyChallenges.${row.challengeCode}`,
    category: def?.category ?? 'MULTIPLAYER',
    progress: row.progress,
    goal: row.goal,
    completed: row.completed,
    claimed: row.claimed,
    rewardTokens: row.rewardTokens,
  }
}

export function dailyChallengeOrder(
  a: Pick<DailyChallengeProgress, 'challengeCode'>,
  b: Pick<DailyChallengeProgress, 'challengeCode'>
): number {
  const order = getActiveChallengeCodesForDate()
  const iA = order.indexOf(a.challengeCode as DailyChallengeProgressDto['code'])
  const iB = order.indexOf(b.challengeCode as DailyChallengeProgressDto['code'])
  return (iA === -1 ? 999 : iA) - (iB === -1 ? 999 : iB)
}

export type DailyChallengeDbClient = Prisma.TransactionClient
