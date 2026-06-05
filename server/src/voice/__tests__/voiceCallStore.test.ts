import {
  activateCall,
  createCall,
  endCall,
  userHasActiveCall,
} from '../voiceCall.service.js'
import {
  resetVoiceCallStoreForTests,
  storeGetCall,
} from '../voiceCallStore.js'

describe('voiceCallStore', () => {
  beforeEach(() => {
    resetVoiceCallStoreForTests()
  })

  it('creates and retrieves calls', async () => {
    const call = await createCall({
      type: 'private',
      creatorId: 'user-a',
      memberIds: ['user-b'],
    })
    const stored = await storeGetCall(call.callId)
    expect(stored?.callerId).toBe('user-a')
    expect(stored?.status).toBe('ringing')
    await endCall(call.callId)
  })

  it('sets negotiationId on activate', async () => {
    const call = await createCall({
      type: 'private',
      creatorId: 'user-a',
      memberIds: ['user-b'],
    })
    const negId = await activateCall(call.callId)
    expect(negId).toBeTruthy()
    const stored = await storeGetCall(call.callId)
    expect(stored?.status).toBe('active')
    expect(stored?.negotiationId).toBe(negId)
    await endCall(call.callId)
  })

  it('tracks active call per user (anti double-call)', async () => {
    const call = await createCall({
      type: 'private',
      creatorId: 'user-a',
      memberIds: ['user-b'],
    })
    expect(await userHasActiveCall('user-a')).toBe(true)
    expect(await userHasActiveCall('user-b')).toBe(true)
    await endCall(call.callId)
    expect(await userHasActiveCall('user-a')).toBe(false)
  })
})
