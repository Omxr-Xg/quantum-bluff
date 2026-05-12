import { isTournamentGameId, TOURNAMENT_GAME_ID_PREFIX } from '../tournament/tournament.constants.js'
import { tournamentEntryFeeChips } from '../tournament/tournament.entryFee.js'
import { seedFromTournamentId } from '../tournament/tournament.seed.js'

describe('tournament pure helpers', () => {
  it('tournamentEntryFeeChips clamps and defaults', () => {
    expect(tournamentEntryFeeChips(500)).toBe(500)
    expect(tournamentEntryFeeChips(20_000_000)).toBe(10_000_000)
    expect(tournamentEntryFeeChips(Number.NaN)).toBe(1)
    expect(tournamentEntryFeeChips(0)).toBe(1)
  })

  it('seedFromTournamentId is deterministic', () => {
    expect(seedFromTournamentId('same')).toBe(seedFromTournamentId('same'))
    expect(seedFromTournamentId('a')).not.toBe(seedFromTournamentId('b'))
  })

  it('isTournamentGameId', () => {
    expect(isTournamentGameId(`${TOURNAMENT_GAME_ID_PREFIX}uuid`)).toBe(true)
    expect(isTournamentGameId('cash-game')).toBe(false)
  })
})
