import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CallState } from '../voiceCallTypes'
import { VoiceCallManager } from '../VoiceCallManager'

function mockSocket() {
  const emitted: unknown[] = []
  return {
    emit: vi.fn((_event: string, payload: unknown) => {
      emitted.push(payload)
    }),
    emitted,
  }
}

describe('VoiceCallManager', () => {
  beforeEach(() => {
    class MockRTCPeerConnection {
      connectionState: RTCPeerConnectionState = 'new'
      iceConnectionState: RTCIceConnectionState = 'new'
      signalingState: RTCSignalingState = 'stable'
      localDescription: RTCSessionDescription | null = null
      remoteDescription: RTCSessionDescription | null = null
      onicecandidate: ((ev: { candidate: RTCIceCandidate | null }) => void) | null = null
      ontrack: ((ev: RTCTrackEvent) => void) | null = null
      onconnectionstatechange: (() => void) | null = null
      oniceconnectionstatechange: (() => void) | null = null
      getSenders = () => []
      createOffer = vi.fn(async () => ({ type: 'offer' as const, sdp: 'v=0' }))
      createAnswer = vi.fn(async () => ({ type: 'answer' as const, sdp: 'v=0' }))
      setLocalDescription = vi.fn(async (d: RTCSessionDescriptionInit) => {
        this.localDescription = d as RTCSessionDescription
      })
      setRemoteDescription = vi.fn(async (d: RTCSessionDescriptionInit) => {
        this.remoteDescription = d as RTCSessionDescription
      })
      addTrack = vi.fn()
      addIceCandidate = vi.fn(async () => undefined)
      close = vi.fn()
    }
    vi.stubGlobal('RTCPeerConnection', MockRTCPeerConnection)
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn(async () => ({
          getAudioTracks: () => [{ kind: 'audio', readyState: 'live', enabled: true, stop: vi.fn() }],
          getTracks: () => [],
        })),
      },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('caller transitions to NEGOTIATING and emits offer', async () => {
    const socket = mockSocket()
    const states: CallState[] = []
    const manager = new VoiceCallManager('caller-1', socket as never, {
      onStateChange: (s) => states.push(s),
    })
    manager.onOutgoingStarted()
    await manager.onCallConnected(
      {
        callId: 'call-1',
        channelId: 'call:call-1',
        callerId: 'caller-1',
        negotiationId: 'neg-1',
      },
      'callee-2',
    )
    expect(states).toContain(CallState.NEGOTIATING)
    const offerEmit = socket.emitted.find(
      (p) =>
        typeof p === 'object' &&
        p != null &&
        (p as { signal?: { type?: string } }).signal?.type === 'offer',
    )
    expect(offerEmit).toBeTruthy()
    manager.teardown()
  })

  it('callee does not emit offer', async () => {
    const socket = mockSocket()
    const manager = new VoiceCallManager('callee-2', socket as never, {})
    manager.onIncoming()
    await manager.onCallConnected(
      {
        callId: 'call-1',
        channelId: 'call:call-1',
        callerId: 'caller-1',
        negotiationId: 'neg-1',
      },
      'caller-1',
    )
    const offerEmit = socket.emitted.find(
      (p) =>
        typeof p === 'object' &&
        p != null &&
        (p as { signal?: { type?: string } }).signal?.type === 'offer',
    )
    expect(offerEmit).toBeUndefined()
    manager.teardown()
  })

  it('buffers offer until peer connection is ready', async () => {
    const socket = mockSocket()
    const manager = new VoiceCallManager('callee-2', socket as never, {})
    manager.onIncoming()
    const offerPromise = manager.handleSignal({
      callId: 'call-1',
      channelId: 'call:call-1',
      negotiationId: 'neg-1',
      fromUserId: 'caller-1',
      toUserId: 'callee-2',
      signal: { type: 'offer', sdp: { type: 'offer', sdp: 'v=0' } },
    })
    await manager.onCallConnected(
      {
        callId: 'call-1',
        channelId: 'call:call-1',
        callerId: 'caller-1',
        negotiationId: 'neg-1',
      },
      'caller-1',
    )
    await offerPromise
    const answerEmit = socket.emitted.find(
      (p) =>
        typeof p === 'object' &&
        p != null &&
        (p as { signal?: { type?: string } }).signal?.type === 'answer',
    )
    expect(answerEmit).toBeTruthy()
    manager.teardown()
  })

  it('ignores signals with stale negotiationId', async () => {
    const socket = mockSocket()
    const manager = new VoiceCallManager('callee-2', socket as never, {})
    await manager.onCallConnected(
      {
        callId: 'call-1',
        channelId: 'call:call-1',
        callerId: 'caller-1',
        negotiationId: 'neg-current',
      },
      'caller-1',
    )
    await manager.handleSignal({
      callId: 'call-1',
      channelId: 'call:call-1',
      negotiationId: 'neg-stale',
      fromUserId: 'caller-1',
      toUserId: 'callee-2',
      signal: { type: 'offer', sdp: { type: 'offer', sdp: 'v=0' } },
    })
    manager.teardown()
  })
})
