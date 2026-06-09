import type { DailyChallengeCode, DailyChallengeCategory } from './dailyChallenge.types.js'

export type DailyChallengeDefinition = {
  code: DailyChallengeCode
  i18nKey: string
  category: DailyChallengeCategory
  goal: number
  rewardTokens: number
}

export const ALL_DAILY_CHALLENGE_DEFINITIONS: ReadonlyArray<DailyChallengeDefinition> = [
  { code: 'WIN_WITH_PAIR', i18nKey: 'dailyChallenges.winWithPair', category: 'POKER', goal: 1, rewardTokens: 250 },
  { code: 'WIN_200_ROULETTE', i18nKey: 'dailyChallenges.win200Roulette', category: 'ROULETTE', goal: 200, rewardTokens: 300 },
  { code: 'PLAY_5_TIMES', i18nKey: 'dailyChallenges.play5Times', category: 'MULTIPLAYER', goal: 5, rewardTokens: 500 },
  { code: 'WIN_200_SLOT', i18nKey: 'dailyChallenges.win200Slot', category: 'SLOT', goal: 200, rewardTokens: 350 },
  { code: 'WIN_SHOWDOWN', i18nKey: 'dailyChallenges.winShowdown', category: 'POKER', goal: 1, rewardTokens: 300 },
  { code: 'WIN_3_BLACKJACK', i18nKey: 'dailyChallenges.win3Blackjack', category: 'BLACKJACK', goal: 3, rewardTokens: 400 },
  { code: 'CRASH_CASHOUT_2X', i18nKey: 'dailyChallenges.crashCashout2x', category: 'CRASH', goal: 2, rewardTokens: 350 },
  { code: 'SEND_3_CHAT', i18nKey: 'dailyChallenges.send3Chat', category: 'MULTIPLAYER', goal: 3, rewardTokens: 250 },
  { code: 'WIN_BELOTE_MATCH', i18nKey: 'dailyChallenges.winBeloteMatch', category: 'BELOTE', goal: 1, rewardTokens: 600 },
  { code: 'ROULETTE_10_BETS', i18nKey: 'dailyChallenges.roulette10Bets', category: 'ROULETTE', goal: 10, rewardTokens: 250 },
  { code: 'POKER_10_HANDS', i18nKey: 'dailyChallenges.poker10Hands', category: 'POKER', goal: 10, rewardTokens: 350 },
  { code: 'ONLINE_15_MIN', i18nKey: 'dailyChallenges.online15Min', category: 'DAILY_ACTIVITY', goal: 15, rewardTokens: 300 },
  { code: 'SLOT_20_SPINS', i18nKey: 'dailyChallenges.slot20Spins', category: 'SLOT', goal: 20, rewardTokens: 300 },
  { code: 'BLACKJACK_NATURAL', i18nKey: 'dailyChallenges.blackjackNatural', category: 'BLACKJACK', goal: 1, rewardTokens: 500 },
  { code: 'CRASH_5_ROUNDS', i18nKey: 'dailyChallenges.crash5Rounds', category: 'CRASH', goal: 5, rewardTokens: 250 },
  { code: 'POKER_WIN_500_CHIPS', i18nKey: 'dailyChallenges.pokerWin500Chips', category: 'POKER', goal: 500, rewardTokens: 600 },
  { code: 'WHEEL_5_SPINS', i18nKey: 'dailyChallenges.wheel5Spins', category: 'WHEEL', goal: 5, rewardTokens: 300 },
  { code: 'LUCKY_NUMBER_10_ROUNDS', i18nKey: 'dailyChallenges.luckyNumber10Rounds', category: 'LUCKY_NUMBER', goal: 10, rewardTokens: 250 },
  { code: 'WIN_3_MULTIPLAYER', i18nKey: 'dailyChallenges.win3Multiplayer', category: 'MULTIPLAYER', goal: 3, rewardTokens: 500 },
  { code: 'INVITE_FRIEND', i18nKey: 'dailyChallenges.inviteFriend', category: 'SOCIAL', goal: 1, rewardTokens: 400 },
  { code: 'REACH_RIVER_5', i18nKey: 'dailyChallenges.reachRiver5', category: 'POKER', goal: 5, rewardTokens: 350 },
  { code: 'BELOTE_100_POINTS', i18nKey: 'dailyChallenges.belote100Points', category: 'BELOTE', goal: 100, rewardTokens: 450 },
  { code: 'ROULETTE_COLOR_WIN_3', i18nKey: 'dailyChallenges.rouletteColorWin3', category: 'ROULETTE', goal: 3, rewardTokens: 300 },
  { code: 'SLOT_BONUS_WIN', i18nKey: 'dailyChallenges.slotBonusWin', category: 'SLOT', goal: 1, rewardTokens: 500 },
  { code: 'WIN_2_HANDS_ROW', i18nKey: 'dailyChallenges.win2HandsRow', category: 'POKER', goal: 2, rewardTokens: 600 },
  { code: 'BLACKJACK_WIN_500', i18nKey: 'dailyChallenges.blackjackWin500', category: 'BLACKJACK', goal: 500, rewardTokens: 450 },
  { code: 'CRASH_CASHOUT_3X', i18nKey: 'dailyChallenges.crashCashout3x', category: 'CRASH', goal: 1, rewardTokens: 600 },
  { code: 'COMPLETE_ALL_DAILY', i18nKey: 'dailyChallenges.completeAllDaily', category: 'GLOBAL', goal: 3, rewardTokens: 1000 },
  {
    code: 'WEEKLY_COMPLETE_20',
    i18nKey: 'dailyChallenges.weeklyComplete20',
    category: 'GLOBAL',
    goal: 20,
    rewardTokens: 5000,
  },
  {
    code: 'WEEKLY_POKER_20_HANDS',
    i18nKey: 'dailyChallenges.weeklyPoker20Hands',
    category: 'POKER',
    goal: 20,
    rewardTokens: 2000,
  },
  {
    code: 'WEEKLY_WIN_5_GAMES',
    i18nKey: 'dailyChallenges.weeklyWin5Games',
    category: 'MULTIPLAYER',
    goal: 5,
    rewardTokens: 2500,
  },
  {
    code: 'WEEKLY_INVITE_FRIEND',
    i18nKey: 'dailyChallenges.weeklyInviteFriend',
    category: 'SOCIAL',
    goal: 1,
    rewardTokens: 2000,
  },
  {
    code: 'WEEKLY_BELOTE_3_MATCHES',
    i18nKey: 'dailyChallenges.weeklyBelote3Matches',
    category: 'BELOTE',
    goal: 3,
    rewardTokens: 2500,
  },
  {
    code: 'WEEKLY_WIN_10K_CHIPS',
    i18nKey: 'dailyChallenges.weeklyWin10kChips',
    category: 'GLOBAL',
    goal: 10_000,
    rewardTokens: 3000,
  },
  {
    code: 'WEEKLY_BONUS',
    i18nKey: 'dailyChallenges.weeklyBonus',
    category: 'GLOBAL',
    goal: 5,
    rewardTokens: 20_000,
  },
]

export const DAILY_CHALLENGE_DEFINITION_BY_CODE = new Map(
  ALL_DAILY_CHALLENGE_DEFINITIONS.map((def) => [def.code, def])
)
