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
import { unlockPageAudio } from './ringtoneAudio'
import { hasLiveLocalAudio } from './voiceMicUtils'
import {
  isPolitePeer,
  shouldInitiateOffer,
  shouldKeepAttachedAudioTrack,
} from './voiceNegotiationPolicy'
import type { VoiceChannelKind } from './voiceTypes'

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
        const hasTurn = parsed.some(
          (s) =>
            typeof s === 'object' &&
            s != null &&
            String((s as RTCIceServer).urls ?? '')
              .toLowerCase()
              .includes('turn'),
        )
        if (!hasTurn && import.meta.env.PROD) {
          console.warn(
            '[voice] VITE_ICE_SERVERS sans TURN — audio inter-réseaux (4G/box) souvent impossible.',
          )
        }
        return { iceServers: parsed as RTCIceServer[], iceCandidatePoolSize: 10 }
      }
    } catch {
      console.warn('[voice] VITE_ICE_SERVERS invalide — STUN par défaut')
    }
  }
  if (import.meta.env.PROD) {
    console.warn('[voice] Pas de VITE_ICE_SERVERS — STUN seul (ajouter TURN Metered sur Vercel).')
  }
  return { iceServers: DEFAULT_ICE_SERVERS, iceCandidatePoolSize: 10 }
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
  private callCreatorId: string | null = null

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
    this.callCreatorId = roster.callCreatorId ?? null
    this.friendIds = new Set(roster.friendIds)
    this.blockedIds = new Set(roster.blockedUserIds)
    void this.syncPeersWhenReady()
    this.emitSpeakingFromRoster()
  }

  /** Micro pré-acquis au clic « Appeler » / « Accepter » (geste utilisateur). */
  prefetchLocalStream(stream: MediaStream): void {
    if (!hasLiveLocalAudio(stream)) return
    if (this.localStream === stream) return
    if (this.localStream && hasLiveLocalAudio(this.localStream)) return
    if (this.localStream && !hasLiveLocalAudio(this.localStream)) {
      this.localStream = null
    }
    this.localStream = stream
    this.startSpeakingDetector(stream)
    void this.renotifyAllPeers()
  }

  /** Préserve un MediaStream partagé (prefetch) avant destroy() du mesh. */
  detachSharedLocalStream(stream: MediaStream): void {
    if (this.localStream !== stream) return
    if (this.speakingTimer) clearInterval(this.speakingTimer)
    this.speakingTimer = null
    this.localStream = null
  }

  private async syncPeersWhenReady(): Promise<void> {
    if (this.isCallChannel() && !hasLiveLocalAudio(this.localStream)) return
    await this.syncPeers()
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
    if (this.localStream && hasLiveLocalAudio(this.localStream)) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = true
      })
      await this.renotifyAllPeers()
      return
    }
    if (this.localStream) {
      this.stopLocalTracks()
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
      const hasTrack = Boolean(send && hasLiveLocalAudio(this.localStream))
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

  /** Après join canal call:* — micro puis négociation WebRTC. */
  async bootstrapCallAudio(): Promise<void> {
    await this.ensureMic(true)
    await this.syncPeers()
  }

  /** Sur call:* — micro live avant négociation SDP. */
  private async ensureCallAudioReady(): Promise<boolean> {
    if (!this.isCallChannel()) return hasLiveLocalAudio(this.localStream)
    if (!hasLiveLocalAudio(this.localStream)) {
      await this.ensureMic(true)
    }
    const ready = hasLiveLocalAudio(this.localStream)
    if (!ready) this.callbacks.onMicError?.('mic_denied')
    return ready
  }

  /** Coupe le micro sans stopper le MediaStream (toggle mute UI). */
  applyLocalMicMute(muted: boolean): void {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => {
        t.enabled = !muted
      })
    }
    if (muted) {
      this.socket.emit('VOICE_SPEAKING', { channelId: this.channelId, speaking: false })
    }
    void this.syncPeers()
  }

  private tryPlayRemoteAudio(audio: HTMLAudioElement): void {
    unlockPageAudio()
    void audio.play().catch(() => {
      const resume = () => {
        unlockPageAudio()
        void audio.play().catch(() => undefined)
        document.removeEventListener('pointerdown', resume)
        document.removeEventListener('keydown', resume)
        document.removeEventListener('touchstart', resume)
      }
      document.addEventListener('pointerdown', resume, { once: true })
      document.addEventListener('keydown', resume, { once: true })
      document.addEventListener('touchstart', resume, { once: true, passive: true })
    })
  }

  private shouldConnectTo(remoteId: string): boolean {
    if (this.isCallChannel()) {
      if (remoteId === this.myUserId) return false
      if (this.blockedIds.has(remoteId)) return false
      return this.remoteParticipant(remoteId) != null
    }
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

  private hasAudioTransceiver(pc: RTCPeerConnection): boolean {
    return pc.getTransceivers().some((t) => {
      if (t.sender.track?.kind === 'audio') return true
      if (t.receiver.track?.kind === 'audio') return true
      const d = t.direction
      return d === 'sendrecv' || d === 'recvonly' || d === 'sendonly'
    })
  }

  private ensureRecvTransceiver(pc: RTCPeerConnection): void {
    if (!this.hasAudioTransceiver(pc)) {
      pc.addTransceiver('audio', { direction: 'recvonly' })
    }
  }

  private async ensurePeer(remoteId: string): Promise<void> {
    if (this.peers.has(remoteId)) return

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
      this.tryPlayRemoteAudio(audio)
      this.applyVolumeForPeer(remoteId)
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.tryPlayRemoteAudio(audio)
      } else if (pc.connectionState === 'failed') {
        void this.renegotiate(remoteId)
      } else if (pc.connectionState === 'closed') {
        this.closePeer(remoteId)
      }
    }

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        this.tryPlayRemoteAudio(audio)
      } else if (pc.iceConnectionState === 'failed') {
        console.warn(
          '[voice] ICE failed — vérifier VITE_ICE_SERVERS (TURN) sur Vercel si réseaux différents.',
          { remoteId, channelId: this.channelId },
        )
      }
    }

    this.ensureRecvTransceiver(pc)
    if (this.isCallChannel()) {
      await this.ensureCallAudioReady()
    }
    await this.refreshPeerTracks(remoteId)
    entry.hadLocalAudio = this.peerHasAttachedLocalAudio(remoteId)

    const canSend = shouldSendToRemote(
      this.myUserId,
      remoteId,
      this.settings.speakTo,
      this.settings.micMuted,
      this.friendIds,
      this.blockedIds,
    )
    const sendInitialOffer = shouldInitiateOffer({
      channelKind: this.channelKind(),
      myUserId: this.myUserId,
      remoteUserId: remoteId,
      callCreatorId: this.callCreatorId,
      hasLiveMic: hasLiveLocalAudio(this.localStream),
      canSend,
    })

    if (sendInitialOffer) {
      try {
        entry.makingOffer = true
        this.logPeerAudioState(remoteId, 'before-initial-offer')
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
      return (pc.signalingState as RTCSignalingState) === 'stable'
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
      if (this.isCallChannel()) {
        await this.ensureCallAudioReady()
      }
      await this.refreshPeerTracks(remoteId)
      this.logPeerAudioState(remoteId, 'before-renegotiate-offer')
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

    const liveTrack = hasLiveLocalAudio(this.localStream)
      ? this.localStream!.getAudioTracks().find((t) => t.readyState === 'live')
      : undefined
    const keepAttached = shouldKeepAttachedAudioTrack(this.channelKind(), Boolean(liveTrack))
    const attachTrack = liveTrack && (send || keepAttached) ? liveTrack : undefined
    const senders = pc.getSenders().filter((s) => s.track?.kind === 'audio')

    if (attachTrack) {
      attachTrack.enabled = send && !this.settings.micMuted
      const existing = senders[0]
      const needsRenegotiate =
        !entry.hadLocalAudio &&
        pc.signalingState === 'stable' &&
        (!this.isCallChannel() || this.callCreatorId === this.myUserId)
      if (existing?.track?.id === attachTrack.id) {
        /* unchanged */
      } else if (existing) {
        await existing.replaceTrack(attachTrack)
        if (needsRenegotiate) await this.renegotiate(remoteId)
      } else {
        pc.addTrack(attachTrack, this.localStream!)
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
    const polite = isPolitePeer({
      channelKind: this.channelKind(),
      myUserId: this.myUserId,
      remoteUserId: fromUserId,
    })

    try {
      if (signal.type === 'offer') {
        const desc = toSessionDescription(signal.sdp ?? null)
        if (!desc) return
        if (this.isCallChannel()) {
          await this.ensureCallAudioReady()
        }
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
        await this.refreshPeerTracks(fromUserId)
        this.logPeerAudioState(fromUserId, 'before-answer')
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        const local = toSessionDescription(pc.localDescription)
        if (local) {
          this.emitSignal(fromUserId, { type: 'answer', sdp: local })
        }
        await this.flushPendingIce(fromUserId)
      } else if (signal.type === 'answer') {
        const desc = toSessionDescription(signal.sdp ?? null)
        if (!desc) return
        if (entry.ignoreOffer) return
        if (pc.signalingState !== 'have-local-offer') return
        if (this.isCallChannel()) {
          await this.ensureCallAudioReady()
        }
        await pc.setRemoteDescription(desc)
        entry.makingOffer = false
        await this.refreshPeerTracks(fromUserId)
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

  private channelKind(): VoiceChannelKind {
    return this.roster?.channel.kind ?? (this.isCallChannel() ? 'call' : 'waiting')
  }

  private peerHasAttachedLocalAudio(remoteId: string): boolean {
    const entry = this.peers.get(remoteId)
    if (!entry) return false
    return entry.pc
      .getSenders()
      .some((s) => s.track?.kind === 'audio' && s.track.readyState === 'live')
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

  private logPeerAudioState(remoteId: string, phase: string): void {
    if (!import.meta.env.DEV) return
    const entry = this.peers.get(remoteId)
    if (!entry) return
    const sendTrack = entry.pc.getSenders().find((s) => s.track?.kind === 'audio')?.track
    const localTrack = this.localStream?.getAudioTracks()[0]
    console.warn('[voice] peer audio', {
      remoteId,
      phase,
      localReadyState: localTrack?.readyState,
      senderReadyState: sendTrack?.readyState,
      ice: entry.pc.iceConnectionState,
    })
  }
}
