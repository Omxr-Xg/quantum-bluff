import type { Socket } from 'socket.io-client'
import {
  canHearParticipant,
  shouldSendToRemote,
} from './voicePolicy'
import type {
  VoiceParticipantPublic,
  VoiceRosterPayload,
  VoiceSettings,
} from './voiceTypes'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

type PeerEntry = {
  pc: RTCPeerConnection
  audio: HTMLAudioElement
  makingOffer: boolean
  ignoreOffer: boolean
}

export type VoiceMeshCallbacks = {
  onSpeakingChange?: (userIds: string[]) => void
  onMicError?: (message: string) => void
}

export class WebRTCVoiceMesh {
  private channelId: string
  private myUserId: string
  private socket: Socket
  private settings: VoiceSettings
  private peers = new Map<string, PeerEntry>()
  private localStream: MediaStream | null = null
  private roster: VoiceRosterPayload | null = null
  private friendIds = new Set<string>()
  private blockedIds = new Set<string>()
  private speakingTimer: ReturnType<typeof setInterval> | null = null
  private analyserCtx: AudioContext | null = null
  private callbacks: VoiceMeshCallbacks

  setChannelId(channelId: string): void {
    this.channelId = channelId
  }

  constructor(
    channelId: string,
    myUserId: string,
    socket: Socket,
    settings: VoiceSettings,
    callbacks: VoiceMeshCallbacks = {},
  ) {
    this.channelId = channelId
    this.myUserId = myUserId
    this.socket = socket
    this.settings = { ...settings, peerMutes: new Set(settings.peerMutes) }
    this.callbacks = callbacks
  }

  updateSettings(settings: VoiceSettings): void {
    this.settings = { ...settings, peerMutes: new Set(settings.peerMutes) }
    void this.syncPeers()
    this.applyPlaybackVolumes()
  }

  applyRoster(roster: VoiceRosterPayload): void {
    this.roster = roster
    this.friendIds = new Set(roster.friendIds)
    this.blockedIds = new Set(roster.blockedUserIds)
    void this.syncPeers()
    this.emitSpeakingFromRoster()
  }

  handleSignal(payload: {
    channelId?: string
    gameId?: string
    fromUserId: string
    toUserId: string
    signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
  }): void {
    const cid = payload.channelId ?? payload.gameId
    if (cid && cid !== this.channelId) return
    if (payload.toUserId !== this.myUserId) return
    void this.onRemoteSignal(payload.fromUserId, payload.signal)
  }

  handlePeerLeft(userId: string): void {
    this.closePeer(userId)
  }

  async ensureMic(enabled: boolean): Promise<void> {
    if (!enabled) {
      this.stopLocalTracks()
      void this.syncPeers()
      return
    }
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = true
      })
      void this.syncPeers()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      this.localStream = stream
      this.startSpeakingDetector(stream)
      void this.syncPeers()
    } catch {
      this.callbacks.onMicError?.('mic_denied')
    }
  }

  destroy(): void {
    for (const uid of [...this.peers.keys()]) this.closePeer(uid)
    this.stopLocalTracks()
    if (this.speakingTimer) clearInterval(this.speakingTimer)
    this.speakingTimer = null
    void this.analyserCtx?.close()
    this.analyserCtx = null
  }

  private stopLocalTracks(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop())
      this.localStream = null
    }
    if (this.speakingTimer) clearInterval(this.speakingTimer)
    this.speakingTimer = null
    this.socket.emit('VOICE_SPEAKING', { channelId: this.channelId, speaking: false })
  }

  private participants(): VoiceParticipantPublic[] {
    return this.roster?.participants ?? []
  }

  private remoteParticipant(userId: string): VoiceParticipantPublic | undefined {
    return this.participants().find((p) => p.userId === userId)
  }

  private shouldConnectTo(remoteId: string): boolean {
    const remote = this.remoteParticipant(remoteId)
    if (!remote) return false
    const send = shouldSendToRemote(
      this.myUserId,
      remoteId,
      this.settings.speakTo,
      this.settings.micMuted,
      this.friendIds,
      this.blockedIds,
    )
    const hear = canHearParticipant(
      this.myUserId,
      remote,
      this.settings.listenTo,
      this.settings.soundMuted,
      this.settings.peerMutes,
      this.friendIds,
      this.blockedIds,
    )
    return send || hear
  }

  private async syncPeers(): Promise<void> {
    const ids = new Set(
      this.participants()
        .map((p) => p.userId)
        .filter((id) => id !== this.myUserId && this.shouldConnectTo(id)),
    )

    for (const uid of this.peers.keys()) {
      if (!ids.has(uid)) this.closePeer(uid)
    }

    for (const uid of ids) {
      if (!this.peers.has(uid)) await this.ensurePeer(uid)
      await this.refreshPeerTracks(uid)
    }
    this.applyPlaybackVolumes()
  }

  private async ensurePeer(remoteId: string): Promise<void> {
    if (this.peers.has(remoteId)) return

    const polite = this.myUserId > remoteId
    const pc = new RTCPeerConnection(ICE_SERVERS)
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.setAttribute('playsinline', 'true')

    const entry: PeerEntry = { pc, audio, makingOffer: false, ignoreOffer: false }
    this.peers.set(remoteId, entry)

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return
      this.socket.emit('VOICE_SIGNAL', {
        channelId: this.channelId,
        toUserId: remoteId,
        signal: { type: 'ice', candidate: ev.candidate.toJSON() },
      })
    }

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] ?? new MediaStream([ev.track])
      audio.srcObject = stream
      void audio.play().catch(() => undefined)
      this.applyVolumeForPeer(remoteId)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(remoteId)
      }
    }

    await this.refreshPeerTracks(remoteId)

    if (this.myUserId < remoteId) {
      try {
        entry.makingOffer = true
        await pc.setLocalDescription(await pc.createOffer())
        this.socket.emit('VOICE_SIGNAL', {
          channelId: this.channelId,
          toUserId: remoteId,
          signal: { type: 'offer', sdp: pc.localDescription ?? undefined },
        })
      } catch (err) {
        console.warn('[voice] initial offer', err)
      } finally {
        entry.makingOffer = false
      }
    }
  }

  private async refreshPeerTracks(remoteId: string): Promise<void> {
    const entry = this.peers.get(remoteId)
    if (!entry) return
    const { pc } = entry
    const send = shouldSendToRemote(
      this.myUserId,
      remoteId,
      this.settings.speakTo,
      this.settings.micMuted,
      this.friendIds,
      this.blockedIds,
    )

    const senders = pc.getSenders().filter((s) => s.track?.kind === 'audio')
    if (send && this.localStream) {
      const track = this.localStream.getAudioTracks()[0]
      if (track) {
        const existing = senders[0]
        if (existing?.track?.id === track.id) {
          track.enabled = !this.settings.micMuted
        } else if (existing) {
          await existing.replaceTrack(track)
        } else {
          pc.addTrack(track, this.localStream)
        }
      }
    } else {
      for (const s of senders) {
        await s.replaceTrack(null)
      }
    }
  }

  private async onRemoteSignal(
    fromUserId: string,
    signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit },
  ): Promise<void> {
    if (!this.shouldConnectTo(fromUserId)) return
    await this.ensurePeer(fromUserId)
    const entry = this.peers.get(fromUserId)
    if (!entry) return
    const { pc } = entry
    const polite = this.myUserId > fromUserId

    try {
      if (signal.type === 'offer' && signal.sdp) {
        const offerCollision = entry.makingOffer || pc.signalingState !== 'stable'
        entry.ignoreOffer = !polite && offerCollision
        if (entry.ignoreOffer) return
        await pc.setRemoteDescription(signal.sdp)
        await pc.setLocalDescription(await pc.createAnswer())
        this.socket.emit('VOICE_SIGNAL', {
          channelId: this.channelId,
          toUserId: fromUserId,
          signal: { type: 'answer', sdp: pc.localDescription ?? undefined },
        })
        await this.refreshPeerTracks(fromUserId)
      } else if (signal.type === 'answer' && signal.sdp) {
        await pc.setRemoteDescription(signal.sdp)
      } else if (signal.type === 'ice' && signal.candidate) {
        await pc.addIceCandidate(signal.candidate)
      }
    } catch (err) {
      console.warn('[voice] signal', err)
    }
  }

  private closePeer(userId: string): void {
    const entry = this.peers.get(userId)
    if (!entry) return
    entry.pc.close()
    entry.audio.srcObject = null
    this.peers.delete(userId)
  }

  private applyPlaybackVolumes(): void {
    for (const uid of this.peers.keys()) this.applyVolumeForPeer(uid)
  }

  private applyVolumeForPeer(remoteId: string): void {
    const entry = this.peers.get(remoteId)
    const remote = this.remoteParticipant(remoteId)
    if (!entry || !remote) return
    const audible = canHearParticipant(
      this.myUserId,
      remote,
      this.settings.listenTo,
      this.settings.soundMuted,
      this.settings.peerMutes,
      this.friendIds,
      this.blockedIds,
    )
    entry.audio.muted = !audible
    entry.audio.volume = audible ? 1 : 0
  }

  private startSpeakingDetector(stream: MediaStream): void {
    if (this.speakingTimer) clearInterval(this.speakingTimer)
    try {
      const ctx = new AudioContext()
      this.analyserCtx = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      let last = false

      this.speakingTimer = setInterval(() => {
        if (this.settings.micMuted) {
          if (last) {
            last = false
            this.socket.emit('VOICE_SPEAKING', { channelId: this.channelId, speaking: false })
          }
          return
        }
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        const speaking = avg > 18
        if (speaking !== last) {
          last = speaking
          this.socket.emit('VOICE_SPEAKING', { channelId: this.channelId, speaking })
        }
      }, 250)
    } catch {
      /* ignore */
    }
  }

  private emitSpeakingFromRoster(): void {
    const ids = this.participants()
      .filter((p) => p.speaking)
      .map((p) => p.userId)
    this.callbacks.onSpeakingChange?.(ids)
  }
}
