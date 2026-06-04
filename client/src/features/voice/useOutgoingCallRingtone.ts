import { useEffect, useRef } from 'react'

/** Son public (Vite) — évite les échecs de résolution d’import sur Vercel. */
function outgoingCallRingtoneUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/'
  const root = base.endsWith('/') ? base : `${base}/`
  return `${root}music/neo_panda_25-girl-child-calling-mom-385605.mp3`
}

/** Sonnerie en boucle pour l'appelant tant que l'appel est en composition (dialing). */
export function useOutgoingCallRingtone(active: boolean): void {
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

    const audio = new Audio(outgoingCallRingtoneUrl())
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
