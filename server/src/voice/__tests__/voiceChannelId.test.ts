import {
  buildCallChannelId,
  buildTableChannelId,
  buildWaitingChannelId,
  parseVoiceChannelId,
  resolveChannelId,
} from '../voiceChannelId.js'

describe('voiceChannelId', () => {
  it('builds and parses channel ids', () => {
    expect(buildWaitingChannelId('room-1')).toBe('waiting:room-1')
    expect(buildTableChannelId('g1')).toBe('table:g1')
    expect(buildCallChannelId('c1')).toBe('call:c1')
    expect(parseVoiceChannelId('waiting:room-1')).toEqual({
      kind: 'waiting',
      id: 'room-1',
      channelId: 'waiting:room-1',
    })
  })

  it('resolveChannelId prefers channelId and falls back to gameId', () => {
    expect(resolveChannelId({ channelId: 'table:abc' })).toBe('table:abc')
    expect(resolveChannelId({ gameId: 'abc' })).toBe('table:abc')
    expect(resolveChannelId({ channelId: 'bad' })).toBeNull()
    expect(resolveChannelId({})).toBeNull()
  })
})
