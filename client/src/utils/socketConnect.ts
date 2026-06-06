import { getApiBaseUrl } from './apiBase'

/**
 * Résout l’origine + le chemin Socket.IO (défaut `/socket.io`, surcharge via VITE_SOCKET_PATH).
 */
export function getSocketIoUrlAndPath(): { url: string; path: string } {
  const explicitPathRaw = (import.meta.env.VITE_SOCKET_PATH ?? '').toString().trim()
  const socketPath = explicitPathRaw
    ? explicitPathRaw.startsWith('/')
      ? explicitPathRaw
      : `/${explicitPathRaw}`
    : '/socket.io'

  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (import.meta.env.DEV && (h === 'localhost' || h === '127.0.0.1')) {
      const apiBase = (import.meta.env.VITE_API_URL ?? '').toString().replace(/\/$/, '').trim()
      return { url: apiBase || 'http://localhost:3000', path: '/socket.io' }
    }
  }

  const socketEnv = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim()
  const apiEnv = (import.meta.env.VITE_API_URL ?? '').toString().trim()

  const tryAbsolute = (raw: string): { url: string; path: string } | null => {
    const trimmed = raw.replace(/\/$/, '').trim()
    if (!trimmed || trimmed.startsWith('/') || !/^https?:\/\//i.test(trimmed)) return null
    try {
      return { url: new URL(trimmed).origin, path: socketPath }
    } catch {
      return null
    }
  }

  for (const raw of [socketEnv, apiEnv]) {
    const hit = tryAbsolute(raw)
    if (hit) return hit
  }

  let base = getApiBaseUrl().replace(/\/$/, '').trim()
  if (base.startsWith('/') && typeof window !== 'undefined') {
    base = `${window.location.origin}${base}`
  }
  const fromBase = base ? tryAbsolute(base) : null
  if (fromBase) return fromBase

  if (typeof window !== 'undefined') {
    const { protocol } = window.location
    if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
      return { url: 'http://localhost:3000', path: socketPath }
    }
    return { url: window.location.origin, path: socketPath }
  }

  return { url: 'http://localhost:3000', path: '/socket.io' }
}
