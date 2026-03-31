import type { DailyChallengeProgress, Prisma } from '../generated/prisma/index.js'
import { DAILY_CHALLENGE_DEFINITION_BY_CODE } from './dailyChallengeDefinitions.js'
import type { DailyChallengeProgressDto } from './dailyChallenge.types.js'

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
  const iA = Array.from(DAILY_CHALLENGE_DEFINITION_BY_CODE.keys()).indexOf(
    a.challengeCode as DailyChallengeProgressDto['code']
  )
  const iB = Array.from(DAILY_CHALLENGE_DEFINITION_BY_CODE.keys()).indexOf(
    b.challengeCode as DailyChallengeProgressDto['code']
  )
  return iA - iB
}

export type DailyChallengeDbClient = Prisma.TransactionClient
