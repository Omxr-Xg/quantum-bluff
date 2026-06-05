/** True si le stream a au moins une piste audio encore active (non stoppée). */
export function hasLiveLocalAudio(stream: MediaStream | null | undefined): boolean {
  return Boolean(stream?.getAudioTracks().some((t) => t.readyState === 'live'))
}
