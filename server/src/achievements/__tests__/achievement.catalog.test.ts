import { ACHIEVEMENT_CATALOG, ACHIEVEMENT_BY_ID } from '../achievement.catalog.js'

const EXPECTED_IDS = [
  'login_streak_7',
  'login_streak_30',
  'first_friend',
  'friends_10',
  'first_voice_call',
  'first_jackpot',
  'casino_games_100',
  'belote_wins_10',
  'belote_wins_100',
  'poker_first_win',
  'poker_hands_100',
  'poker_hands_1000',
  'first_bluff',
  'poker_win_streak_10',
  'millionaire',
  'blackjack_king',
  'belote_king',
]

describe('achievement.catalog', () => {
  it('contient exactement les 17 achievements V1', () => {
    expect(ACHIEVEMENT_CATALOG).toHaveLength(17)
    expect(ACHIEVEMENT_BY_ID.size).toBe(17)
  })

  it('a des ids uniques et attendus', () => {
    const ids = ACHIEVEMENT_CATALOG.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of EXPECTED_IDS) {
      expect(ids).toContain(id)
    }
  })

  it('chaque entrée a id et category', () => {
    for (const def of ACHIEVEMENT_CATALOG) {
      expect(def.id).toBeTruthy()
      expect(def.category).toBeTruthy()
      expect(ACHIEVEMENT_BY_ID.get(def.id)).toEqual(def)
    }
  })

  it('millionaire offre le titre cosmétique', () => {
    const millionaire = ACHIEVEMENT_BY_ID.get('millionaire')
    expect(millionaire?.rewardCosmeticId).toBe('title_millionaire')
    expect(millionaire?.threshold).toBe(1_000_000)
  })
})
