/**
 * Helpers WebRTC partagés entre appels 1v1 (VoicePeerConnection) et mesh waiting/table.
 */

export function attachLocalAudioTrack(
  pc: RTCPeerConnection,
  track: MediaStreamTrack,
  stream: MediaStream,
): void {
  const sender = pc.getSenders().find((s) => s.track?.kind === 'audio')
  if (sender?.track?.id === track.id) return
  if (sender) {
    void sender.replaceTrack(track)
    return
  }

  if (pc.remoteDescription) {
    const negotiated = pc.getTransceivers().find((t) => t.mid != null)
    if (negotiated) {
      void negotiated.sender.replaceTrack(track)
      if (negotiated.direction === 'recvonly' || negotiated.direction === 'inactive') {
        negotiated.direction = 'sendrecv'
      }
      return
    }
  }

  pc.addTrack(track, stream)
}

export function resolveRemotePlaybackStream(
  ev: RTCTrackEvent,
  existing: MediaStream | null,
): MediaStream {
  if (ev.streams[0]) return ev.streams[0]
  const stream = existing ?? new MediaStream()
  if (!stream.getTracks().includes(ev.track)) {
    stream.addTrack(ev.track)
  }
  return stream
}
