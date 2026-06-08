import {
  isBeloteBotId,
  makeBeloteBotId,
  beloteBotDisplayName,
  normalizeBeloteBotDifficulty,
} from '../../../shared/beloteBots.js'
import { countRoomParticipants, formatBeloteRoom } from '../beloteRoomFormat.js'

describe('beloteRoomBots helpers', () => {
  it('generates stable bot id prefix', () => {
    const id = makeBeloteBotId()
    expect(isBeloteBotId(id)).toBe(true)
    expect(id.startsWith('qb-belote-bot-')).toBe(true)
  })

  it('formats bot display names', () => {
    expect(beloteBotDisplayName(0)).toMatch(/^QB Bot /)
    expect(beloteBotDisplayName(1)).not.toBe(beloteBotDisplayName(0))
  })

  it('normalizes difficulty', () => {
    expect(normalizeBeloteBotDifficulty('easy')).toBe('EASY')
    expect(normalizeBeloteBotDifficulty('expert')).toBe('EXPERT')
    expect(normalizeBeloteBotDifficulty('weird')).toBe('NORMAL')
  })
})

describe('formatBeloteRoom bot seats', () => {
  it('counts humans and bots separately', () => {
    const room = formatBeloteRoom({
      id: 'r1',
      name: 'Test',
      hostId: 'h1',
      maxPlayers: 4,
      visibility: 'PUBLIC',
      status: 'WAITING',
      joinCode: null,
      targetScore: 1000,
      buyIn: 100,
      variant: 'CONTEE',
      gameId: null,
      autoFillBotsEnabled: true,
      seats: [
        {
          id: 's0',
          position: 0,
          isReady: true,
          team: null,
          avatarUrl: null,
          participantType: 'HUMAN',
          botId: null,
          displayName: null,
          botDifficulty: 'NORMAL',
          userId: 'h1',
          user: { id: 'h1', username: 'Host', level: 5 },
        },
        {
          id: 's1',
          position: 1,
          isReady: true,
          team: null,
          avatarUrl: null,
          participantType: 'BOT',
          botId: 'qb-belote-bot-abc',
          displayName: 'QB Bot Léa',
          botDifficulty: 'NORMAL',
          userId: null,
          user: null,
        },
      ],
    })
    expect(room.counts.humans).toBe(1)
    expect(room.counts.bots).toBe(1)
    expect(room.counts.empty).toBe(2)
    expect(room.players[1]?.isBot).toBe(true)
    expect(room.players[1]?.isReady).toBe(true)
    expect(room.canFillTable).toBe(true)
    expect(room.canStart).toBe(false)
  })
})
