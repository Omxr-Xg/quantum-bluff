import type { Socket } from 'socket.io-client'
import {
  canHearParticipant,
  shouldSendToRemote,
  shouldWirePeerTo,
} from './voicePolicy'
import type {
  VoiceParticipantPublic,
  VoiceRosterPayload,
  VoiceSettings,
} from './voiceTypes'

const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

/** JSON dans VITE_ICE_SERVERS, ex. [{"urls":"stun:..."},{"urls":"turn:...","username":"u","credential":"p"}] */
function resolveIceConfiguration(): RTCConfiguration {
  const raw = (import.meta.env.VITE_ICE_SERVERS ?? '').toString().trim()
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { iceServers: parsed as RTCIceServer[] }
      }
    } catch {
      console.warn('[voice] VITE_ICE_SERVERS invalide — STUN par défaut')
    }
  }
  return { iceServers: DEFAULT_ICE_SERVERS }
}

const ICE_SERVERS: RTCConfiguration = resolveIceConfiguration()

type PeerEntry = {
  pc: RTCPeerConnection
  audio: HTMLAudioElement
  makingOffer: boolean
  ignoreOffer: boolean
  hadLocalAudio: boolean
}

export type VoiceMeshCallbacks = {
  onSpeakingChange?: (userIds: string[]) => void
  onMicError?: (message: string) => void
}

function toSessionDescription(
  raw: RTCSessionDescriptionInit | RTCSessionDescription | null | undefined,
): RTCSessionDescriptionInit | null {
  if (!raw || typeof raw !== 'object') return null
  const sdp =
    typeof (raw as RTCSessionDescriptionInit).sdp === 'string'
      ? (raw as RTCSessionDescriptionInit).sdp
      : null
  const type = (raw as RTCSessionDescriptionInit).type
  if (!sdp || (type !== 'offer' && type !== 'answer')) return null
  return { type, sdp }
}

export class WebRTCVoiceMesh {
  private channelId: string
  private myUserId: string
  private socket: Socket
  private settings: VoiceSettings
  private peers = new Map<string, PeerEntry>()
  private pendingIce = new Map<string, RTCIceCandidateInit[]>()
  /** Une signalisation à la fois par pair (évite offer/answer en parallèle). */
  private signalChains = new Map<string, Promise<void>>()
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
    this.enqueueRemoteSignal(payload.fromUserId, payload.signal)
  }

  private enqueueRemoteSignal(
    fromUserId: string,
    signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit },
  ): void {
    const prev = this.signalChains.get(fromUserId) ?? Promise.resolve()
    const next = prev
      .then(() => this.onRemoteSignal(fromUserId, signal))
      .catch((err) => console.warn('[voice] signal', err))
    this.signalChains.set(fromUserId, next)
    void next.finally(() => {
      if (this.signalChains.get(fromUserId) === next) {
        this.signalChains.delete(fromUserId)
      }
    })
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
      await this.renotifyAllPeers()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      this.localStream = stream
      this.startSpeakingDetector(stream)
      await this.renotifyAllPeers()
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

  private async renotifyAllPeers(): Promise<void> {
    await this.syncPeers()
    for (const uid of this.peers.keys()) {
      const entry = this.peers.get(uid)
      if (!entry) continue
      const send = shouldSendToRemote(
        this.myUserId,
        uid,
        this.settings.speakTo,
        this.settings.micMuted,
        this.friendIds,
        this.blockedIds,
      )
      const hasTrack = Boolean(
        send && this.localStream?.getAudioTracks()[0],
      )
      if (hasTrack && !entry.hadLocalAudio && entry.pc.signalingState === 'stable') {
        await this.renegotiate(uid)
      }
      entry.hadLocalAudio = hasTrack
    }
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
    return shouldWirePeerTo(
      this.myUserId,
      remote,
      this.settings.listenTo,
      this.settings.speakTo,
      this.settings.soundMuted,
      this.settings.micMuted,
      this.settings.peerMutes,
      this.friendIds,
      this.blockedIds,
    )
  }

  private emitSignal(
    toUserId: string,
    signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit },
  ): void {
    this.socket.emit('VOICE_SIGNAL', {
      channelId: this.channelId,
      toUserId,
      signal,
    })
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

  private ensureRecvTransceiver(pc: RTCPeerConnection): void {
    const hasAudio = pc.getTransceivers().some((t) => t.receiver.track?.kind === 'audio')
    if (!hasAudio) {
      pc.addTransceiver('audio', { direction: 'recvonly' })
    }
  }

  private async ensurePeer(remoteId: string): Promise<void> {
    if (this.peers.has(remoteId)) return

    const polite = this.myUserId > remoteId
    const pc = new RTCPeerConnection(ICE_SERVERS)
    const audio = document.createElement('audio')
    audio.autoplay = true
    audio.setAttribute('playsinline', 'true')
    audio.dataset.voicePeer = remoteId
    audio.style.display = 'none'
    if (!audio.isConnected) document.body.appendChild(audio)

    const entry: PeerEntry = {
      pc,
      audio,
      makingOffer: false,
      ignoreOffer: false,
      hadLocalAudio: false,
    }
    this.peers.set(remoteId, entry)
    this.pendingIce.set(remoteId, [])

    pc.onicecandidate = (ev) => {
      if (!ev.candidate) return
      this.emitSignal(remoteId, {
        type: 'ice',
        candidate: ev.candidate.toJSON(),
      })
    }

    pc.ontrack = (ev) => {
      const stream = ev.streams[0] ?? new MediaStream([ev.track])
      audio.srcObject = stream
      void audio.play().catch(() => {
        const resume = () => {
          void audio.play().catch(() => undefined)
          document.removeEventListener('pointerdown', resume)
        }
        document.addEventListener('pointerdown', resume, { once: true })
      })
      this.applyVolumeForPeer(remoteId)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        void this.renegotiate(remoteId)
      } else if (pc.connectionState === 'closed') {
        this.closePeer(remoteId)
      }
    }

    this.ensureRecvTransceiver(pc)
    await this.refreshPeerTracks(remoteId)
    entry.hadLocalAudio = Boolean(
      shouldSendToRemote(
        this.myUserId,
        remoteId,
        this.settings.speakTo,
        this.settings.micMuted,
        this.friendIds,
        this.blockedIds,
      ) && this.localStream?.getAudioTracks()[0],
    )

    if (this.myUserId < remoteId) {
      try {
        entry.makingOffer = true
        const offer = await pc.createOffer({ offerToReceiveAudio: true })
        await pc.setLocalDescription(offer)
        const desc = toSessionDescription(pc.localDescription)
        if (desc) {
          this.emitSignal(remoteId, { type: 'offer', sdp: desc })
        }
      } catch (err) {
        console.warn('[voice] initial offer', err)
      } finally {
        entry.makingOffer = false
      }
    }
  }

  private async rollbackLocalOffer(pc: RTCPeerConnection): Promise<boolean> {
    if (pc.signalingState === 'stable') return true
    if (pc.signalingState !== 'have-local-offer') return false
    try {
      await pc.setLocalDescription({ type: 'rollback' })
      return pc.signalingState === 'stable'
    } catch {
      return false
    }
  }

  private async renegotiate(remoteId: string): Promise<void> {
    const entry = this.peers.get(remoteId)
    if (!entry || entry.makingOffer) return
    const { pc } = entry
    if (pc.signalingState === 'closed' || pc.signalingState !== 'stable') return
    try {
      entry.makingOffer = true
      const offer = await pc.createOffer({ offerToReceiveAudio: true })
      await pc.setLocalDescription(offer)
      const desc = toSessionDescription(pc.localDescription)
      if (desc) {
        this.emitSignal(remoteId, { type: 'offer', sdp: desc })
      }
    } catch (err) {
      console.warn('[voice] renegotiate', err)
    } finally {
      entry.makingOffer = false
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

    const track = send ? this.localStream?.getAudioTracks()[0] : undefined
    const senders = pc.getSenders().filter((s) => s.track?.kind === 'audio')

    if (track) {
      track.enabled = !this.settings.micMuted
      const existing = senders[0]
      const needsRenegotiate = !entry.hadLocalAudio && pc.signalingState === 'stable'
      if (existing?.track?.id === track.id) {
        /* unchanged */
      } else if (existing) {
        await existing.replaceTrack(track)
        if (needsRenegotiate) await this.renegotiate(remoteId)
      } else {
        pc.addTrack(track, this.localStream!)
        if (needsRenegotiate) await this.renegotiate(remoteId)
      }
      entry.hadLocalAudio = true
    } else {
      for (const s of senders) {
        await s.replaceTrack(null)
      }
      entry.hadLocalAudio = false
      this.ensureRecvTransceiver(pc)
    }
  }

  private async flushPendingIce(remoteId: string): Promise<void> {
    const entry = this.peers.get(remoteId)
    const queue = this.pendingIce.get(remoteId) ?? []
    if (!entry?.pc.remoteDescription || queue.length === 0) return
    this.pendingIce.set(remoteId, [])
    for (const candidate of queue) {
      try {
        await entry.pc.addIceCandidate(candidate)
      } catch (err) {
        console.warn('[voice] ice flush', err)
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
      if (signal.type === 'offer') {
        const desc = toSessionDescription(signal.sdp ?? null)
        if (!desc) return
        const offerCollision = entry.makingOffer || pc.signalingState !== 'stable'
        if (offerCollision) {
          if (!polite) {
            entry.ignoreOffer = true
            return
          }
          const rolled = await this.rollbackLocalOffer(pc)
          if (!rolled) {
            this.closePeer(fromUserId)
            return
          }
          entry.makingOffer = false
        }
        entry.ignoreOffer = false
        await pc.setRemoteDescription(desc)
        if (pc.signalingState !== 'have-remote-offer') return
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        const local = toSessionDescription(pc.localDescription)
        if (local) {
          this.emitSignal(fromUserId, { type: 'answer', sdp: local })
        }
        await this.refreshPeerTracks(fromUserId)
        await this.flushPendingIce(fromUserId)
      } else if (signal.type === 'answer') {
        const desc = toSessionDescription(signal.sdp ?? null)
        if (!desc) return
        if (entry.ignoreOffer) return
        if (pc.signalingState !== 'have-local-offer') return
        await pc.setRemoteDescription(desc)
        entry.makingOffer = false
        await this.flushPendingIce(fromUserId)
      } else if (signal.type === 'ice' && signal.candidate) {
        if (!pc.remoteDescription) {
          const q = this.pendingIce.get(fromUserId) ?? []
          q.push(signal.candidate)
          this.pendingIce.set(fromUserId, q)
          return
        }
        await pc.addIceCandidate(signal.candidate)
      }
    } catch (err) {
      console.warn('[voice] signal', err)
    }
  }

  private closePeer(userId: string): void {
    this.signalChains.delete(userId)
    const entry = this.peers.get(userId)
    if (!entry) return
    entry.pc.close()
    entry.audio.srcObject = null
    entry.audio.remove()
    this.peers.delete(userId)
    this.pendingIce.delete(userId)
  }

  private applyPlaybackVolumes(): void {
    for (const uid of this.peers.keys()) this.applyVolumeForPeer(uid)
  }

  private isCallChannel(): boolean {
    return this.channelId.startsWith('call:')
  }

  private applyVolumeForPeer(remoteId: string): void {
    const entry = this.peers.get(remoteId)
    const remote = this.remoteParticipant(remoteId)
    if (!entry || !remote) return
    const audible = this.isCallChannel()
      ? !this.settings.soundMuted &&
        !this.settings.peerMutes.has(remoteId) &&
        !this.blockedIds.has(remoteId)
      : canHearParticipant(
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
