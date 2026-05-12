import type { Server } from 'socket.io'
import { jest } from '@jest/globals'

const notifyTournamentTableFinished = jest
  .fn()
  .mockResolvedValue('tournament_complete' as const)

jest.mock('../tournament/tournament.runtime.service.js', () => ({
  notifyTournamentTableFinished,
}))

const deleteGame = jest.fn().mockResolvedValue(undefined)
jest.mock('../shared/activeGames.js', () => ({
  activeGames: {
    delete: deleteGame,
  },
}))

describe('tournament.gatewayHook', () => {
  it('onTournamentSingleSurvivor notifies runtime then removes active game', async () => {
    const { onTournamentSingleSurvivor } = await import('../tournament/tournament.gatewayHook.js')
    const io = {} as Server
    const advance = await onTournamentSingleSurvivor(io, 'game_tournament_x', 'user-1')
    expect(advance).toBe('tournament_complete')
    expect(notifyTournamentTableFinished).toHaveBeenCalledWith(io, 'game_tournament_x', 'user-1')
    expect(deleteGame).toHaveBeenCalledWith('game_tournament_x')
  })
})
