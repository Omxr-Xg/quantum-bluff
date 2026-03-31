import type { DailyChallengeCode } from './dailyChallenge.types.js'

export type DailyChallengeDefinition = {
  code: DailyChallengeCode
  i18nKey: string
  category: 'POKER' | 'ROULETTE' | 'MULTIPLAYER' | 'SLOT'
  goal: number
  rewardTokens: number
}

export const DAILY_CHALLENGE_DEFINITIONS: ReadonlyArray<DailyChallengeDefinition> = [
  {
    code: 'WIN_WITH_PAIR',
    i18nKey: 'dailyChallenges.winWithPair',
    goal: 1,
    rewardTokens: 250,
    category: 'POKER',
  },
  {
    code: 'WIN_200_ROULETTE',
    i18nKey: 'dailyChallenges.win200Roulette',
    goal: 200,
    rewardTokens: 300,
    category: 'ROULETTE',
  },
  {
    code: 'PLAY_5_TIMES',
    i18nKey: 'dailyChallenges.play5Times',
    goal: 5,
    rewardTokens: 500,
    category: 'MULTIPLAYER',
  },
  {
    code: 'WIN_200_SLOT',
    i18nKey: 'dailyChallenges.win200Slot',
    goal: 200,
    rewardTokens: 350,
    category: 'SLOT',
  },
]

export const DAILY_CHALLENGE_DEFINITION_BY_CODE = new Map(
  DAILY_CHALLENGE_DEFINITIONS.map((def) => [def.code, def])
)
