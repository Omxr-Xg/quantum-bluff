import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebRTCVoiceMesh } from '../WebRTCVoiceMesh'
import { DEFAULT_VOICE_SETTINGS } from '../voiceTypes'

function mockTrack(readyState: MediaStreamTrackState = 'live'): MediaStreamTrack {
  return {
    kind: 'audio',
    readyState,
    enabled: true,
    id: 'track-1',
    stop: vi.fn(),
  } as unknown as MediaStreamTrack
}

function mockStream(): MediaStream {
  const track = mockTrack()
  return {
    getAudioTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream
}

type PcHandlers = {
  onicecandidate: ((ev: { candidate: RTCIceCandidate | null }) => void) | null
  ontrack: ((ev: RTCTrackEvent) => void) | null
  onconnectionstatechange: (() => void) | null
  oniceconnectionstatechange: (() => void) | null
}

function createMockPc(): RTCPeerConnection & { handlers: PcHandlers; senders: RTCRtpSender[] } {
  const handlers: PcHandlers = {
    onicecandidate: null,
    ontrack: null,
    onconnectionstatechange: null,
    oniceconnectionstatechange: null,
  }
  const senders: RTCRtpSender[] = []
  const pc = {
    handlers,
    senders,
    signalingState: 'stable' as RTCSignalingState,
    connectionState: 'new' as RTCPeerConnectionState,
    iceConnectionState: 'new' as RTCIceConnectionState,
    localDescription: null as RTCSessionDescription | null,
    remoteDescription: null as RTCSessionDescription | null,
    get onicecandidate() {
      return handlers.onicecandidate
    },
    set onicecandidate(fn) {
      handlers.onicecandidate = fn
    },
    get ontrack() {
      return handlers.ontrack
    },
    set ontrack(fn) {
      handlers.ontrack = fn
    },
    get onconnectionstatechange() {
      return handlers.onconnectionstatechange
    },
    set onconnectionstatechange(fn) {
      handlers.onconnectionstatechange = fn
    },
    get oniceconnectionstatechange() {
      return handlers.oniceconnectionstatechange
    },
    set oniceconnectionstatechange(fn) {
      handlers.oniceconnectionstatechange = fn
    },
    addTransceiver: vi.fn(),
    getTransceivers: () => [],
    getSenders: () => senders,
    addTrack: vi.fn((track: MediaStreamTrack) => {
      const sender = { track, replaceTrack: vi.fn() } as unknown as RTCRtpSender
      senders.push(sender)
    }),
    createOffer: vi.fn(async () => ({ type: 'offer', sdp: 'v=0' })),
    createAnswer: vi.fn(async () => ({ type: 'answer', sdp: 'v=0' })),
    setLocalDescription: vi.fn(async (desc: RTCSessionDescriptionInit) => {
      pc.localDescription = desc as RTCSessionDescription
      if (desc.type === 'offer') pc.signalingState = 'have-local-offer'
      if (desc.type === 'answer') pc.signalingState = 'stable'
    }),
    setRemoteDescription: vi.fn(async (desc: RTCSessionDescriptionInit) => {
      pc.remoteDescription = desc as RTCSessionDescription
      if (desc.type === 'offer') pc.signalingState = 'have-remote-offer'
      if (desc.type === 'answer') pc.signalingState = 'stable'
    }),
    addIceCandidate: vi.fn(async () => undefined),
    close: vi.fn(),
  }
  return pc as unknown as RTCPeerConnection & { handlers: PcHandlers; senders: RTCRtpSender[] }
}

describe('WebRTCVoiceMesh negotiation', () => {
  let mockPc: ReturnType<typeof createMockPc>
  const emit = vi.fn()
  const socket = { emit } as unknown as import('socket.io-client').Socket

  beforeEach(() => {
    document.body.innerHTML = ''
    const getUserMedia = vi.fn().mockResolvedValue(mockStream())
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: { getUserMedia },
      configurable: true,
    })
    vi.stubGlobal(
      'RTCPeerConnection',
      class {
        constructor() {
          mockPc = createMockPc()
          return mockPc as unknown as RTCPeerConnection
        }
      },
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  const callRoster = (creatorId: string, calleeId: string) => ({
    channelId: 'call:test-call',
    channel: { channelId: 'call:test-call', kind: 'call' as const, label: 'Appel' },
    participants: [
      {
        userId: creatorId,
        username: 'Caller',
        speakTo: 'CHANNEL' as const,
        listenTo: 'CHANNEL' as const,
        micMuted: false,
        soundMuted: false,
        peerMutes: [],
        speaking: false,
      },
      {
        userId: calleeId,
        username: 'Callee',
        speakTo: 'CHANNEL' as const,
        listenTo: 'CHANNEL' as const,
        micMuted: false,
        soundMuted: false,
        peerMutes: [],
        speaking: false,
      },
    ],
    friendIds: [creatorId, calleeId],
    blockedUserIds: [],
    callCreatorId: creatorId,
  })

  it('callee acquires mic before answering offer on call channel', async () => {
    const creatorId = 'caller-aaa'
    const calleeId = 'callee-bbb'
    const mesh = new WebRTCVoiceMesh('call:test-call', calleeId, socket, {
      ...DEFAULT_VOICE_SETTINGS,
      micMuted: false,
      peerMutes: new Set(),
    })
    mesh.applyRoster(callRoster(creatorId, calleeId))

    mesh.handleSignal({
      channelId: 'call:test-call',
      fromUserId: creatorId,
      toUserId: calleeId,
      signal: { type: 'offer', sdp: { type: 'offer', sdp: 'v=0' } },
    })

    const getUserMedia = navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>

    await vi.waitFor(() => {
      expect(getUserMedia).toHaveBeenCalled()
      expect(mockPc.createAnswer).toHaveBeenCalled()
    })

    const getUserMediaOrder = getUserMedia.mock.invocationCallOrder[0]
    const createAnswerOrder = vi.mocked(mockPc.createAnswer).mock.invocationCallOrder[0]
    expect(getUserMediaOrder).toBeLessThan(createAnswerOrder)
    expect(emit).toHaveBeenCalledWith(
      'VOICE_SIGNAL',
      expect.objectContaining({ signal: expect.objectContaining({ type: 'answer' }) }),
    )
  })

  it('caller sends initial offer when callCreatorId matches', async () => {
    const creatorId = 'caller-zzz'
    const calleeId = 'callee-yyy'
    const mesh = new WebRTCVoiceMesh('call:test-call', creatorId, socket, {
      ...DEFAULT_VOICE_SETTINGS,
      micMuted: false,
      peerMutes: new Set(),
    })
    mesh.prefetchLocalStream(mockStream())
    mesh.applyRoster(callRoster(creatorId, calleeId))

    await vi.waitFor(() => {
      expect(mockPc.createOffer).toHaveBeenCalled()
      expect(emit).toHaveBeenCalledWith(
        'VOICE_SIGNAL',
        expect.objectContaining({
          toUserId: calleeId,
          signal: expect.objectContaining({ type: 'offer' }),
        }),
      )
    })
  })

  it('keeps audio sender attached when mic is muted on call channel', async () => {
    const creatorId = 'caller-1'
    const calleeId = 'callee-2'
    const mesh = new WebRTCVoiceMesh('call:test-call', creatorId, socket, {
      ...DEFAULT_VOICE_SETTINGS,
      micMuted: true,
      peerMutes: new Set(),
    })
    mesh.prefetchLocalStream(mockStream())
    mesh.applyRoster(callRoster(creatorId, calleeId))

    await vi.waitFor(() => expect(mockPc.addTrack).toHaveBeenCalled())

    const track = mockPc.senders[0]?.track as MediaStreamTrack | undefined
    expect(track).toBeDefined()
    expect(track?.enabled).toBe(false)
  })
})
