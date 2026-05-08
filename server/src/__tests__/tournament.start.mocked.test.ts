var mockTournamentFindUnique: jest.Mock
var mockTournamentUpdateMany: jest.Mock
var mockTournamentUpdate: jest.Mock

jest.mock('../config/database.js', () => {
  mockTournamentFindUnique = jest.fn()
  mockTournamentUpdateMany = jest.fn()
  mockTournamentUpdate = jest.fn()
  return {
    prisma: {
      tournament: {
        findUnique: mockTournamentFindUnique,
        updateMany: mockTournamentUpdateMany,
        update: mockTournamentUpdate,
      },
    },
  }
})

jest.mock('../shared/activeGames.js', () => ({
  activeGames: {
    set: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../logic/GameTable.js', () => ({
  GameTable: jest.fn().mockImplementation(() => ({
    startHand: jest.fn(),
    state: {},
  })),
}))

import { GameTable } from '../logic/GameTable.js'
import { TournamentService } from '../services/tournament.service.js'

function makePlayer(id: string, username: string) {
  return {
    userId: id,
    user: { id, username },
  }
}

function makePendingTournament(
  playerCount: number,
  opts?: { buyIn?: number },
) {
  const buyIn = opts?.buyIn ?? 100
  const players = Array.from({ length: playerCount }, (_, i) =>
    makePlayer(`user-${i + 1}`, `P${i + 1}`),
  )
  return {
    id: 'tour-test-1',
    status: 'PENDING' as const,
    name: 'Test Cup',
    buyIn,
    players,
  }
}

describe('TournamentService.startTournament (mocked)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTournamentUpdateMany.mockResolvedValue({ count: 1 })
    mockTournamentUpdate.mockResolvedValue({ id: 'tour-test-1' })
  })

  it('4 joueurs → 2 tables de 2', async () => {
    mockTournamentFindUnique.mockResolvedValue(makePendingTournament(4))
    const result = await TournamentService.startTournament('tour-test-1')
    expect(result.tables).toHaveLength(2)
    expect(result.tables.map((t) => t.players.length).sort((a, b) => a - b)).toEqual([
      2, 2,
    ])
    expect(GameTable).toHaveBeenCalledTimes(2)
    expect(mockTournamentUpdate).toHaveBeenCalledWith({
      where: { id: 'tour-test-1' },
      data: {
        openingRoundTableCount: 2,
        activeBracketPhase: 'OPENING',
      },
    })
  })

  it('5 joueurs → tables 2 et 3', async () => {
    mockTournamentFindUnique.mockResolvedValue(makePendingTournament(5))
    const result = await TournamentService.startTournament('tour-test-1')
    expect(result.tables).toHaveLength(2)
    expect(result.tables.map((t) => t.players.length).sort((a, b) => a - b)).toEqual([
      2, 3,
    ])
  })

  it('6 joueurs → deux tables de 3', async () => {
    mockTournamentFindUnique.mockResolvedValue(makePendingTournament(6))
    const result = await TournamentService.startTournament('tour-test-1')
    expect(result.tables).toHaveLength(2)
    expect(result.tables.every((t) => t.players.length === 3)).toBe(true)
  })
})
