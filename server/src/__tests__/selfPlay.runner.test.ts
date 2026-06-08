import { runSelfPlaySimulation } from '../poker/simulation/selfPlay.runner.js'

describe('selfPlay.runner', () => {
  test('EXPERT_VS_EXPERT completes hands with metrics', () => {
    const result = runSelfPlaySimulation({
      matchup: 'EXPERT_VS_EXPERT',
      hands: 12,
      startingChips: 5000,
    })

    expect(result.handsPlayed).toBeGreaterThan(0)
    expect(result.bots).toHaveLength(2)
    for (const bot of result.bots) {
      expect(bot.winRate).toBeGreaterThanOrEqual(0)
      expect(bot.winRate).toBeLessThanOrEqual(1)
      expect(Number.isFinite(bot.bbPer100)).toBe(true)
    }
  }, 60_000)
})
