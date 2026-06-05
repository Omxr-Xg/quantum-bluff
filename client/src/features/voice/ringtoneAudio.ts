export type LoopingAudioHandle = {
  stop: () => void
}

/**
 * Lecture en boucle avec contournement autoplay (Safari « Load failed » / silence ~50 %).
 * Réessaie sur interaction utilisateur et quand l’onglet redevient visible.
 */
export function startLoopingAudio(src: string, volume = 0.9): LoopingAudioHandle {
  const audio = new Audio(src)
  audio.loop = true
  audio.volume = volume
  audio.preload = 'auto'

  let stopped = false
  const cleanups: Array<() => void> = []

  const tryPlay = () => {
    if (stopped) return
    void audio.play().catch(() => undefined)
  }

  tryPlay()

  const unlock = () => tryPlay()
  for (const ev of ['pointerdown', 'keydown', 'touchstart', 'click'] as const) {
    document.addEventListener(ev, unlock, { passive: true })
    cleanups.push(() => document.removeEventListener(ev, unlock))
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') tryPlay()
  }
  document.addEventListener('visibilitychange', onVisibility)
  cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility))

  return {
    stop: () => {
      stopped = true
      audio.pause()
      audio.currentTime = 0
      audio.removeAttribute('src')
      audio.load()
      for (const fn of cleanups) fn()
    },
  }
}

/** Débloque lecture distante WebRTC + sonneries après un geste utilisateur. */
export function unlockPageAudio(): void {
  try {
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (Ctx) {
      const ctx = new Ctx()
      void ctx.resume().finally(() => void ctx.close())
    }
  } catch {
    /* ignore */
  }
}
