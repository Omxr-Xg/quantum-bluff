export type AchievementCategory =
  | 'LOGIN'
  | 'SOCIAL'
  | 'CASINO'
  | 'BELOTE'
  | 'POKER'
  | 'RECORDS'

export type AchievementDefinition = {
  id: string
  category: AchievementCategory
  threshold?: number
  rewardChips?: number
  rewardCosmeticId?: string
}

/** Catalogue V1 — définitions en code (pas de table admin). */
export const ACHIEVEMENT_CATALOG: AchievementDefinition[] = [
  // Connexion
  { id: 'login_streak_7', category: 'LOGIN', threshold: 7, rewardChips: 250 },
  { id: 'login_streak_30', category: 'LOGIN', threshold: 30, rewardChips: 1_000 },

  // Social
  { id: 'first_friend', category: 'SOCIAL', threshold: 1, rewardChips: 100 },
  { id: 'friends_10', category: 'SOCIAL', threshold: 10, rewardChips: 500 },
  { id: 'first_voice_call', category: 'SOCIAL', threshold: 1, rewardChips: 150 },

  // Casino
  { id: 'first_jackpot', category: 'CASINO', threshold: 1, rewardChips: 500 },
  { id: 'casino_games_100', category: 'CASINO', threshold: 100, rewardChips: 750 },

  // Belote
  { id: 'belote_wins_10', category: 'BELOTE', threshold: 10, rewardChips: 300 },
  { id: 'belote_wins_100', category: 'BELOTE', threshold: 100, rewardChips: 2_000 },
  { id: 'belote_king', category: 'BELOTE', threshold: 50, rewardChips: 1_000 },

  // Poker
  { id: 'poker_first_win', category: 'POKER', threshold: 1, rewardChips: 200 },
  { id: 'poker_hands_100', category: 'POKER', threshold: 100, rewardChips: 400 },
  { id: 'poker_hands_1000', category: 'POKER', threshold: 1_000, rewardChips: 2_500 },
  { id: 'first_bluff', category: 'POKER', threshold: 1, rewardChips: 100 },
  { id: 'poker_win_streak_10', category: 'POKER', threshold: 10, rewardChips: 750 },

  // Records
  { id: 'millionaire', category: 'RECORDS', threshold: 1_000_000, rewardCosmeticId: 'title_millionaire' },
  { id: 'blackjack_king', category: 'RECORDS', threshold: 5_000, rewardChips: 1_500 },
]

export const ACHIEVEMENT_BY_ID = new Map(
  ACHIEVEMENT_CATALOG.map((def) => [def.id, def] as const),
)
