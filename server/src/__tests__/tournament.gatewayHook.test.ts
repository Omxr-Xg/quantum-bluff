import type { Server } from 'socket.io'
import { jest } from '@jest/globals'

jest.mock('../tournament/tournament.runtime.service.js', () => ({
  notifyTournamentTableFinished: jest.fn(async () => 'tournament_complete'),
}))

jest.mock('../shared/activeGames.js', () => ({
  activeGames: {
    delete: jest.fn(async () => undefined),
  },
}))

import { notifyTournamentTableFinished } from '../tournament/tournament.runtime.service.js'
import { activeGames } from '../shared/activeGames.js'
import { onTournamentSingleSurvivor } from '../tournament/tournament.gatewayHook.js'

describe('tournament.gatewayHook', () => {
  it('onTournamentSingleSurvivor notifies runtime then removes active game', async () => {
    const io = {} as Server
    const advance = await onTournamentSingleSurvivor(io, 'game_tournament_x', 'user-1')
    expect(advance).toBe('tournament_complete')
    expect(notifyTournamentTableFinished).toHaveBeenCalledWith(io, 'game_tournament_x', 'user-1')
    expect(activeGames.delete).toHaveBeenCalledWith('game_tournament_x')
  })
})
