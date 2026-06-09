/** Client AdSense (déjà chargé dans index.html). */
export const ADSENSE_CLIENT = 'ca-pub-3578057764167883'

export type DiscreteAdPlacement = 'lobby-sidebar' | 'profile-inline' | 'games-hub'

const SLOT_ENV_KEYS: Record<DiscreteAdPlacement, string> = {
  'lobby-sidebar': 'VITE_ADSENSE_SLOT_LOBBY',
  'profile-inline': 'VITE_ADSENSE_SLOT_PROFILE',
  'games-hub': 'VITE_ADSENSE_SLOT_GAMES',
}

export function getAdSlotId(placement: DiscreteAdPlacement): string | undefined {
  const raw = import.meta.env[SLOT_ENV_KEYS[placement]]
  if (typeof raw !== 'string') return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

/**
 * Routes où aucune pub ne doit s'afficher (gameplay actif, salles d'attente, tutoriels).
 * Préfixes — le composant vérifie pathname + search.
 */
export const AD_DENYLIST_PREFIXES = [
  '/game',
  '/waiting-room',
  '/belote/game',
  '/belote/waiting-room',
  '/blackjack/table',
  '/tutorial',
  '/minigames/crash',
  '/minigames/mines',
  '/minigames/wheel',
  '/minigames/lucky-number',
] as const

/** Mini-jeux actifs via hub ?game= (roulette, slots). */
export const AD_DENYLIST_SEARCH_GAME = new Set(['roulette', 'slots'])

export function isAdAllowedOnPath(pathname: string, search: string): boolean {
  if (AD_DENYLIST_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false
  }
  if (pathname === '/minigames' || pathname === '/minigames/') {
    try {
      const game = new URLSearchParams(search).get('game')
      if (game && AD_DENYLIST_SEARCH_GAME.has(game)) return false
    } catch {
      /* ignore */
    }
  }
  if (pathname.startsWith('/tournaments/') && !pathname.endsWith('/waiting') && !pathname.endsWith('/results')) {
    return false
  }
  return true
}
