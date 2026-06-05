import { useEffect } from 'react'
import incomingCallRingtone from '../../../music/voicebosch-ringtone-bubbly-bubbles-188202.mp3'
import { startLoopingAudio } from './ringtoneAudio'

/** Sonnerie en boucle tant qu'un appel entrant est actif. */
export function useIncomingCallRingtone(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const handle = startLoopingAudio(incomingCallRingtone, 0.9)
    return () => handle.stop()
  }, [active])
}
