import { getIceServersConfig } from '../shared/iceConfig'
import { unlockPageAudio } from '../ringtoneAudio'

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

export type VoicePeerConnectionCallbacks = {
  onIceCandidate?: (candidate: RTCIceCandidateInit) => void
  onConnectionState?: (state: RTCPeerConnectionState) => void
  onIceConnectionState?: (state: RTCIceConnectionState) => void
  onRemoteTrack?: (stream: MediaStream) => void
}

export type LocalAudioRef = {
  track: MediaStreamTrack
  stream: MediaStream
}

export class VoicePeerConnection {
  private pc: RTCPeerConnection
  private pendingCandidates: RTCIceCandidateInit[] = []
  private remoteAudio: HTMLAudioElement
  private remoteStream: MediaStream | null = null
  private callbacks: VoicePeerConnectionCallbacks

  constructor(callbacks: VoicePeerConnectionCallbacks = {}) {
    this.callbacks = callbacks
    this.pc = new RTCPeerConnection(getIceServersConfig())
    this.remoteAudio = document.createElement('audio')
    this.remoteAudio.autoplay = true
    this.remoteAudio.setAttribute('playsinline', 'true')
    this.remoteAudio.style.display = 'none'
    if (!this.remoteAudio.isConnected) document.body.appendChild(this.remoteAudio)

    this.pc.onicecandidate = (ev) => {
      if (!ev.candidate) return
      this.callbacks.onIceCandidate?.(ev.candidate.toJSON())
    }

    this.pc.ontrack = (ev) => {
      let stream = ev.streams[0]
      if (!stream) {
        if (!this.remoteStream) this.remoteStream = new MediaStream()
        stream = this.remoteStream
        if (!stream.getTracks().includes(ev.track)) {
          stream.addTrack(ev.track)
        }
      } else {
        this.remoteStream = stream
      }
      this.remoteAudio.srcObject = stream
      ev.track.onunmute = () => this.tryPlayRemote()
      this.tryPlayRemote()
      this.callbacks.onRemoteTrack?.(stream)
    }

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState
      if (state === 'connected') this.tryPlayRemote()
      this.callbacks.onConnectionState?.(state)
    }

    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc.iceConnectionState
      if (state === 'connected' || state === 'completed') this.tryPlayRemote()
      this.callbacks.onIceConnectionState?.(state)
    }
  }

  get connectionState(): RTCPeerConnectionState {
    return this.pc.connectionState
  }

  attachLocalTrack(track: MediaStreamTrack, stream: MediaStream): void {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === 'audio')
    if (sender?.track?.id === track.id) return
    if (sender) {
      void sender.replaceTrack(track)
      return
    }

    if (this.pc.remoteDescription) {
      const negotiated = this.pc.getTransceivers().find((t) => t.mid != null)
      if (negotiated) {
        void negotiated.sender.replaceTrack(track)
        if (negotiated.direction === 'recvonly' || negotiated.direction === 'inactive') {
          negotiated.direction = 'sendrecv'
        }
        return
      }
    }

    this.pc.addTrack(track, stream)
  }

  async createOffer(): Promise<RTCSessionDescriptionInit | null> {
    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)
    return toSessionDescription(this.pc.localDescription)
  }

  async handleOffer(
    sdp: RTCSessionDescriptionInit,
    local?: LocalAudioRef,
  ): Promise<RTCSessionDescriptionInit | null> {
    const desc = toSessionDescription(sdp)
    if (!desc) return null
    await this.pc.setRemoteDescription(desc)
    await this.flushPendingCandidates()
    if (local) {
      this.attachLocalTrack(local.track, local.stream)
    }
    const answer = await this.pc.createAnswer()
    await this.pc.setLocalDescription(answer)
    return toSessionDescription(this.pc.localDescription)
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    const desc = toSessionDescription(sdp)
    if (!desc) return
    if (this.pc.signalingState !== 'have-local-offer') return
    await this.pc.setRemoteDescription(desc)
    await this.flushPendingCandidates()
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.pc.remoteDescription) {
      this.pendingCandidates.push(candidate)
      return
    }
    try {
      await this.pc.addIceCandidate(candidate)
    } catch (err) {
      console.warn('[voice-call] addIceCandidate', err)
    }
  }

  setRemotePlaybackMuted(muted: boolean): void {
    this.remoteAudio.muted = muted
    this.remoteAudio.volume = muted ? 0 : 1
  }

  private async flushPendingCandidates(): Promise<void> {
    const queue = [...this.pendingCandidates]
    this.pendingCandidates = []
    for (const c of queue) {
      try {
        await this.pc.addIceCandidate(c)
      } catch (err) {
        console.warn('[voice-call] ice flush', err)
      }
    }
  }

  private tryPlayRemote(): void {
    unlockPageAudio()
    void this.remoteAudio.play().catch(() => undefined)
  }

  close(): void {
    this.pendingCandidates = []
    this.remoteStream = null
    this.pc.close()
    this.remoteAudio.srcObject = null
    this.remoteAudio.remove()
  }
}
