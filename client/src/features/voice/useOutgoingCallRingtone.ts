import { useEffect } from 'react'
import outgoingCallRingtone from '../../../music/universfield-classic-telephone-signal-151918.mp3'
import { startLoopingAudio } from './ringtoneAudio'

/** Sonnerie en boucle pour l'appelant tant que l'appel est en composition (dialing). */
export function useOutgoingCallRingtone(active: boolean): void {
  useEffect(() => {
    if (!active) return
    const handle = startLoopingAudio(outgoingCallRingtone, 0.9)
    return () => handle.stop()
  }, [active])
}
