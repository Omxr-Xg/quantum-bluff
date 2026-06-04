import { useEffect, useRef } from 'react'
import incomingCallRingtone from '../../../music/voicebosch-ringtone-bubbly-bubbles-188202.mp3'

/** Sonnerie en boucle tant qu'un appel entrant est actif. */
export function useIncomingCallRingtone(active: boolean): void {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (!active) {
      const prev = audioRef.current
      if (prev) {
        prev.pause()
        prev.currentTime = 0
        audioRef.current = null
      }
      return
    }

    const audio = new Audio(incomingCallRingtone)
    audio.loop = true
    audio.volume = 0.9
    audioRef.current = audio
    void audio.play().catch(() => {
      /* autoplay bloqué tant que l'utilisateur n'a pas interagi avec la page */
    })

    return () => {
      audio.pause()
      audio.currentTime = 0
      if (audioRef.current === audio) audioRef.current = null
    }
  }, [active])
}
