import { hasLiveLocalAudio } from '../voiceMicUtils'

export class VoiceMediaManager {
  private stream: MediaStream | null = null
  private micMuted = false

  getLocalStream(): MediaStream | null {
    return this.stream
  }

  isMicMuted(): boolean {
    return this.micMuted
  }

  hasLiveMic(): boolean {
    return hasLiveLocalAudio(this.stream)
  }

  /** Pré-acquis au clic Appeler / Accepter (geste utilisateur). */
  async prefetchMic(): Promise<boolean> {
    if (hasLiveLocalAudio(this.stream)) return true
    return this.acquireMic()
  }

  async ensureMic(): Promise<boolean> {
    if (hasLiveLocalAudio(this.stream)) {
      this.applyTrackEnabled()
      return true
    }
    return this.acquireMic()
  }

  private async acquireMic(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      this.stopStreamTracks()
      this.stream = stream
      this.applyTrackEnabled()
      return true
    } catch {
      return false
    }
  }

  /** Mute sans SDP — track.enabled uniquement. */
  setMicMuted(muted: boolean): void {
    this.micMuted = muted
    this.applyTrackEnabled()
  }

  private applyTrackEnabled(): void {
    if (!this.stream) return
    for (const track of this.stream.getAudioTracks()) {
      track.enabled = !this.micMuted
    }
  }

  attachPrefetched(stream: MediaStream): void {
    if (!hasLiveLocalAudio(stream)) return
    this.stopStreamTracks()
    this.stream = stream
    this.applyTrackEnabled()
  }

  destroy(): void {
    this.stopStreamTracks()
    this.stream = null
    this.micMuted = false
  }

  private stopStreamTracks(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
  }
}
