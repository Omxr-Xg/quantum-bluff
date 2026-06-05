import { describe, expect, it } from 'vitest'
import {
  isPolitePeer,
  shouldInitiateOffer,
  shouldKeepAttachedAudioTrack,
} from '../voiceNegotiationPolicy'

describe('shouldInitiateOffer', () => {
  it('on call channel only creator sends initial offer', () => {
    expect(
      shouldInitiateOffer({
        channelKind: 'call',
        myUserId: 'alice',
        remoteUserId: 'bob',
        callCreatorId: 'alice',
        hasLiveMic: true,
        canSend: true,
      }),
    ).toBe(true)
    expect(
      shouldInitiateOffer({
        channelKind: 'call',
        myUserId: 'bob',
        remoteUserId: 'alice',
        callCreatorId: 'alice',
        hasLiveMic: true,
        canSend: true,
      }),
    ).toBe(false)
  })

  it('on call channel requires live mic and canSend', () => {
    expect(
      shouldInitiateOffer({
        channelKind: 'call',
        myUserId: 'alice',
        remoteUserId: 'bob',
        callCreatorId: 'alice',
        hasLiveMic: false,
        canSend: true,
      }),
    ).toBe(false)
  })

  it('on waiting channel uses lexicographic userId order', () => {
    expect(
      shouldInitiateOffer({
        channelKind: 'waiting',
        myUserId: 'a',
        remoteUserId: 'b',
        hasLiveMic: true,
        canSend: true,
      }),
    ).toBe(true)
    expect(
      shouldInitiateOffer({
        channelKind: 'waiting',
        myUserId: 'b',
        remoteUserId: 'a',
        hasLiveMic: true,
        canSend: true,
      }),
    ).toBe(false)
  })
})

describe('isPolitePeer', () => {
  it('always polite on call channels', () => {
    expect(
      isPolitePeer({ channelKind: 'call', myUserId: 'a', remoteUserId: 'b' }),
    ).toBe(true)
    expect(
      isPolitePeer({ channelKind: 'call', myUserId: 'b', remoteUserId: 'a' }),
    ).toBe(true)
  })

  it('uses userId order on non-call channels', () => {
    expect(
      isPolitePeer({ channelKind: 'waiting', myUserId: 'b', remoteUserId: 'a' }),
    ).toBe(true)
    expect(
      isPolitePeer({ channelKind: 'waiting', myUserId: 'a', remoteUserId: 'b' }),
    ).toBe(false)
  })
})

describe('shouldKeepAttachedAudioTrack', () => {
  it('keeps track on call/waiting/table when mic is live', () => {
    expect(shouldKeepAttachedAudioTrack('call', true)).toBe(true)
    expect(shouldKeepAttachedAudioTrack('waiting', true)).toBe(true)
    expect(shouldKeepAttachedAudioTrack('table', true)).toBe(true)
    expect(shouldKeepAttachedAudioTrack('call', false)).toBe(false)
  })
})
