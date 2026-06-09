export const DAILY_CHALLENGE_CODES = [
  'WIN_WITH_PAIR',
  'WIN_200_ROULETTE',
  'PLAY_5_TIMES',
  'WIN_200_SLOT',
  'WIN_SHOWDOWN',
  'WIN_3_BLACKJACK',
  'CRASH_CASHOUT_2X',
  'SEND_3_CHAT',
  'WIN_BELOTE_MATCH',
  'ROULETTE_10_BETS',
  'POKER_10_HANDS',
  'ONLINE_15_MIN',
  'SLOT_20_SPINS',
  'BLACKJACK_NATURAL',
  'CRASH_5_ROUNDS',
  'POKER_WIN_500_CHIPS',
  'WHEEL_5_SPINS',
  'LUCKY_NUMBER_10_ROUNDS',
  'WIN_3_MULTIPLAYER',
  'INVITE_FRIEND',
  'REACH_RIVER_5',
  'BELOTE_100_POINTS',
  'ROULETTE_COLOR_WIN_3',
  'SLOT_BONUS_WIN',
  'WIN_2_HANDS_ROW',
  'BLACKJACK_WIN_500',
  'CRASH_CASHOUT_3X',
  'COMPLETE_ALL_DAILY',
  'WEEKLY_COMPLETE_20',
  'WEEKLY_POKER_20_HANDS',
  'WEEKLY_WIN_5_GAMES',
  'WEEKLY_INVITE_FRIEND',
  'WEEKLY_BELOTE_3_MATCHES',
  'WEEKLY_WIN_10K_CHIPS',
  'WEEKLY_BONUS',
] as const

export type DailyChallengeCode = (typeof DAILY_CHALLENGE_CODES)[number]

export type DailyChallengeCategory =
  | 'POKER'
  | 'ROULETTE'
  | 'MULTIPLAYER'
  | 'SLOT'
  | 'BLACKJACK'
  | 'CRASH'
  | 'BELOTE'
  | 'WHEEL'
  | 'LUCKY_NUMBER'
  | 'SOCIAL'
  | 'DAILY_ACTIVITY'
  | 'GLOBAL'

export type DailyChallengeProgressDto = {
  code: DailyChallengeCode
  i18nKey: string
  category: DailyChallengeCategory
  progress: number
  goal: number
  completed: boolean
  claimed: boolean
  rewardTokens: number
}

export type WeeklyBonusDto = {
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
