export const DAILY_CHALLENGE_CODES = [
  'WIN_WITH_PAIR',
  'WIN_200_ROULETTE',
  'PLAY_5_TIMES',
  'WIN_200_SLOT',
] as const

export type DailyChallengeCode = (typeof DAILY_CHALLENGE_CODES)[number]

export type DailyChallengeProgressDto = {
  code: DailyChallengeCode
  i18nKey: string
  category: 'POKER' | 'ROULETTE' | 'MULTIPLAYER' | 'SLOT'
  progress: number
  goal: number
  completed: boolean
  claimed: boolean
  rewardTokens: number
}
