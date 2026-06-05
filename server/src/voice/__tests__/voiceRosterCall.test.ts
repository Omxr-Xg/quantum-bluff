import { createCall, endCall } from '../voiceCall.service.js'
import { resetVoiceCallStoreForTests } from '../voiceCallStore.js'
import {
  addVoiceSocket,
  buildRosterForUser,
  removeVoiceSocket,
} from '../voiceSession.registry.js'

jest.mock('../voiceSocialCache.js', () => ({
  getFriendIdSetCached: jest.fn().mockResolvedValue(new Set<string>()),
  getBlockedUserIdsCached: jest.fn().mockResolvedValue(new Set<string>()),
}))

describe('voice roster call channels', () => {
  beforeEach(() => {
    resetVoiceCallStoreForTests()
  })

  it('includes callCreatorId in roster for call:* channels', async () => {
    const call = await createCall({
      type: 'private',
      creatorId: 'caller-1',
      memberIds: ['callee-2'],
    })

    await addVoiceSocket(call.channelId, 'caller-1', 'Caller', 'sock-a')
    await addVoiceSocket(call.channelId, 'callee-2', 'Callee', 'sock-b')

    const roster = await buildRosterForUser(call.channelId, 'callee-2')

    expect(roster.callCreatorId).toBe('caller-1')
    expect(roster.channel.kind).toBe('call')
    expect(roster.participants).toHaveLength(2)

    removeVoiceSocket(call.channelId, 'caller-1', 'sock-a')
    removeVoiceSocket(call.channelId, 'callee-2', 'sock-b')
    await endCall(call.callId)
  })

  it('omits callCreatorId for waiting channels', async () => {
    const channelId = 'waiting:room-test-1'
    await addVoiceSocket(channelId, 'u1', 'User', 'sock-w')

    const roster = await buildRosterForUser(channelId, 'u1')

    expect(roster.callCreatorId).toBeUndefined()
    expect(roster.channel.kind).toBe('waiting')

    removeVoiceSocket(channelId, 'u1', 'sock-w')
  })
})
