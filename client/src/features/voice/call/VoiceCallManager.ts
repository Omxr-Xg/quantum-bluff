import type { Socket } from 'socket.io-client'
import {
  CallState,
  NEGOTIATION_TIMEOUT_MS,
  canTransitionCallState,
  type CallConnectedPayload,
  type CallSignalPayload,
  type VoiceCallManagerCallbacks,
} from './voiceCallTypes'
import { VoiceMediaManager } from './VoiceMediaManager'
import { VoicePeerConnection } from './VoicePeerConnection'
import { VoiceSignalingClient } from './VoiceSignalingClient'

export class VoiceCallManager {
  private state = CallState.IDLE
  private myUserId: string
  private socket: Socket
  private signaling: VoiceSignalingClient
  private media = new VoiceMediaManager()
  private pc: VoicePeerConnection | null = null
  private callbacks: VoiceCallManagerCallbacks

  private callId: string | null = null
  private channelId: string | null = null
  private callerId: string | null = null
  private remoteUserId: string | null = null
  private negotiationId: string | null = null
  private negotiationTimer: ReturnType<typeof setTimeout> | null = null
  /** Offer/answer reçus avant que le RTCPeerConnection soit prêt. */
  private pendingSignals: CallSignalPayload[] = []

  constructor(myUserId: string, socket: Socket, callbacks: VoiceCallManagerCallbacks = {}) {
    this.myUserId = myUserId
    this.socket = socket
    this.signaling = new VoiceSignalingClient(socket)
    this.callbacks = callbacks
  }

  getState(): CallState {
    return this.state
  }

  isMicMuted(): boolean {
    return this.media.isMicMuted()
  }

  async prefetchMic(): Promise<boolean> {
    const ok = await this.media.prefetchMic()
    if (!ok) this.callbacks.onMicDenied?.()
    return ok
  }

  attachPrefetchedMic(stream: MediaStream): void {
    this.media.attachPrefetched(stream)
  }

  setMicMuted(muted: boolean): void {
    this.media.setMicMuted(muted)
  }

  setSoundMuted(muted: boolean): void {
    this.pc?.setRemotePlaybackMuted(muted)
  }

  onOutgoingStarted(): void {
    this.transition(CallState.OUTGOING)
  }

  onIncoming(): void {
    this.transition(CallState.INCOMING)
  }

  async onCallConnected(payload: CallConnectedPayload, remoteUserId: string): Promise<void> {
    this.callId = payload.callId
    this.channelId = payload.channelId
    this.callerId = payload.callerId
    this.remoteUserId = remoteUserId
    this.negotiationId = payload.negotiationId

    if (this.state === CallState.OUTGOING || this.state === CallState.INCOMING) {
      this.transition(CallState.ACCEPTED)
    }
    await this.startNegotiation()
  }

  async handleSignal(payload: CallSignalPayload): Promise<void> {
    if (!this.canReceiveSignals()) return

    const sessionReady = Boolean(this.negotiationId && this.callId && this.channelId)
    if (!sessionReady || !this.matchesSession(payload)) {
      if (sessionReady) return
      this.pendingSignals.push(payload)
      return
    }

    if (!this.pc) {
      this.pendingSignals.push(payload)
      return
    }
    await this.processSignal(payload)
  }

  teardown(): void {
    this.clearNegotiationTimer()
    this.pendingSignals = []
    this.pc?.close()
    this.pc = null
    this.media.destroy()
    this.callId = null
    this.channelId = null
    this.callerId = null
    this.remoteUserId = null
    this.negotiationId = null
    if (this.state !== CallState.IDLE) {
      this.state = CallState.ENDED
      this.callbacks.onStateChange?.(CallState.ENDED)
      this.state = CallState.IDLE
      this.callbacks.onStateChange?.(CallState.IDLE)
    }
  }

  private transition(to: CallState): void {
    if (!canTransitionCallState(this.state, to)) {
      if (import.meta.env.DEV) {
        console.warn('[voice-call] invalid transition', this.state, '→', to)
      }
      return
    }
    this.state = to
    this.callbacks.onStateChange?.(to)
  }

  private async startNegotiation(): Promise<void> {
    if (this.state !== CallState.ACCEPTED) return
    this.transition(CallState.NEGOTIATING)
    this.startNegotiationTimer()

    const micOk = await this.media.ensureMic()
    if (!micOk) {
      this.failNegotiation('mic_denied')
      return
    }

    const stream = this.media.getLocalStream()
    const track = stream?.getAudioTracks().find((t) => t.readyState === 'live')
    if (!stream || !track) {
      this.failNegotiation('mic_denied')
      return
    }

    const isCaller = this.callerId === this.myUserId

    this.pc = new VoicePeerConnection({
      onIceCandidate: (candidate) => this.emitSignal('ice', undefined, candidate),
      onConnectionState: (connState) => {
        if (connState === 'connected') {
          this.markConnected()
        } else if (connState === 'failed') {
          this.failNegotiation('ice_failed')
        }
      },
      onIceConnectionState: (iceState) => {
        if (iceState === 'connected' || iceState === 'completed') {
          this.markConnected()
        } else if (iceState === 'failed') {
          console.warn('[voice-call] ICE failed — vérifier VITE_ICE_SERVERS (TURN) sur Vercel.')
        }
      },
    })

    // Appelant : attacher le micro avant l’offer. Callee : attacher après setRemoteDescription (dans handleOffer).
    if (isCaller) {
      this.pc.attachLocalTrack(track, stream)
    }

    await this.flushPendingSignals()

    if (isCaller) {
      const offer = await this.pc.createOffer()
      if (offer) this.emitSignal('offer', offer)
      await this.flushPendingSignals()
    }
  }

  private getLocalAudio(): { track: MediaStreamTrack; stream: MediaStream } | undefined {
    const stream = this.media.getLocalStream()
    const track = stream?.getAudioTracks().find((t) => t.readyState === 'live')
    if (!stream || !track) return undefined
    return { track, stream }
  }

  private async processSignal(payload: CallSignalPayload): Promise<void> {
    if (!this.pc) return
    const { signal } = payload
    if (signal.type === 'offer') {
      if (this.callerId === this.myUserId) return
      const answer = await this.pc.handleOffer(
        signal.sdp ?? { type: 'offer', sdp: '' },
        this.getLocalAudio(),
      )
      if (answer) {
        this.emitSignal('answer', answer)
      }
    } else if (signal.type === 'answer') {
      if (this.callerId !== this.myUserId) return
      await this.pc.handleAnswer(signal.sdp ?? { type: 'answer', sdp: '' })
    } else if (signal.type === 'ice' && signal.candidate) {
      await this.pc.addIceCandidate(signal.candidate)
    }
  }

  private async flushPendingSignals(): Promise<void> {
    if (!this.pc || this.pendingSignals.length === 0) return
    const queue = [...this.pendingSignals]
    this.pendingSignals = []
    for (const payload of queue) {
      if (!this.matchesSession(payload)) continue
      await this.processSignal(payload)
    }
  }

  private markConnected(): void {
    if (this.state !== CallState.NEGOTIATING) return
    this.clearNegotiationTimer()
    this.transition(CallState.CONNECTED)
    this.callbacks.onConnected?.()
  }

  private emitSignal(
    type: 'offer' | 'answer' | 'ice',
    sdp?: RTCSessionDescriptionInit,
    candidate?: RTCIceCandidateInit,
  ): void {
    if (!this.callId || !this.channelId || !this.negotiationId || !this.remoteUserId) return
    this.signaling.emitSignal({
      callId: this.callId,
      channelId: this.channelId,
      negotiationId: this.negotiationId,
      toUserId: this.remoteUserId,
      type,
      sdp,
      candidate,
    })
  }

  private canReceiveSignals(): boolean {
    return (
      this.state === CallState.INCOMING ||
      this.state === CallState.OUTGOING ||
      this.state === CallState.ACCEPTED ||
      this.state === CallState.NEGOTIATING
    )
  }

  private matchesSession(payload: CallSignalPayload): boolean {
    if (!this.negotiationId || !this.callId || !this.channelId) return false
    if (payload.negotiationId !== this.negotiationId) return false
    if (payload.callId && payload.callId !== this.callId) return false
    if (payload.channelId !== this.channelId) return false
    return true
  }

  private startNegotiationTimer(): void {
    this.clearNegotiationTimer()
    this.negotiationTimer = setTimeout(() => {
      if (this.state === CallState.NEGOTIATING && this.pc?.connectionState !== 'connected') {
        this.failNegotiation('negotiation_timeout')
      }
    }, NEGOTIATION_TIMEOUT_MS)
  }

  private clearNegotiationTimer(): void {
    if (this.negotiationTimer) {
      clearTimeout(this.negotiationTimer)
      this.negotiationTimer = null
    }
  }

  private failNegotiation(reason: 'negotiation_timeout' | 'ice_failed' | 'mic_denied'): void {
    this.clearNegotiationTimer()
    this.transition(CallState.ENDED)
    this.callbacks.onFailed?.(reason)
    this.pc?.close()
    this.pc = null
    this.negotiationId = null
    this.transition(CallState.IDLE)
  }
}
