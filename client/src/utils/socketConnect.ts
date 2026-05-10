import { getApiBaseUrl } from './apiBase'

/**
 * Résout l’origine + le chemin Socket.IO pour le reverse-proxy (/vm…/socket.io).
 * Socket.IO n’utilise que l’origine de l’URL passée à `io()` : si `VITE_SOCKET_URL` est
 * seulement `https://hôte` (sans `/vm…`), il faut quand même prendre le segment vm depuis
 * `VITE_API_URL` quand c’est la même origine.
 */
export function getSocketIoUrlAndPath(): { url: string; path: string } {
  const explicitPathRaw = (import.meta.env.VITE_SOCKET_PATH ?? '').toString().trim()
  const explicitPath = explicitPathRaw
    ? explicitPathRaw.startsWith('/')
      ? explicitPathRaw
      : `/${explicitPathRaw}`
    : ''

  if (typeof window !== 'undefined') {
    const h = window.location.hostname
    if (import.meta.env.DEV && (h === 'localhost' || h === '127.0.0.1')) {
      const apiBase = (import.meta.env.VITE_API_URL ?? '').toString().replace(/\/$/, '').trim()
      return { url: apiBase || 'http://localhost:3000', path: '/socket.io' }
    }
  }

  const socketEnv = (import.meta.env.VITE_SOCKET_URL ?? '').toString().trim()
  const apiEnv = (import.meta.env.VITE_API_URL ?? '').toString().trim()

  const vmSegFromHttpUrl = (raw: string): string | null => {
    const trimmed = raw.replace(/\/$/, '').trim()
    if (!trimmed || !/^https?:\/\//i.test(trimmed)) return null
    try {
      const segs = new URL(trimmed).pathname.split('/').filter(Boolean)
      return segs.find((s) => /^vmprojet/i.test(s)) ?? null
    } catch {
      return null
    }
  }

  /** Fusionne plusieurs URLs absolues : évite que `VITE_SOCKET_URL=https://hôte` seul impose `/socket.io` racine. */
  const mergeAbsoluteEnv = (): { url: string; path: string } | null => {
    const abs = [socketEnv, apiEnv].filter((s) => s && /^https?:\/\//i.test(s.trim()))
    if (abs.length === 0) return null

    let origin = ''
    let vmSeg: string | null = null
    for (const raw of abs) {
      try {
        const u = new URL(raw.replace(/\/$/, '').trim())
        if (!origin) origin = u.origin
        const v = vmSegFromHttpUrl(raw)
        if (v) vmSeg = v
      } catch {
        /* ignore */
      }
    }
    if (!origin) return null

    const path =
      explicitPath || (vmSeg ? `/${vmSeg}/socket.io` : '/socket.io')
    return { url: origin, path }
  }

  const tryAbsolute = (raw: string): { url: string; path: string } | null => {
    const trimmed = raw.replace(/\/$/, '').trim()
    if (!trimmed || trimmed.startsWith('/') || !/^https?:\/\//i.test(trimmed)) return null
    try {
      const u = new URL(trimmed)
      const origin = u.origin
      const segs = u.pathname.split('/').filter(Boolean)
      const vmSeg = segs.find((s) => /^vmprojet/i.test(s))
      const path =
        explicitPath || (vmSeg ? `/${vmSeg}/socket.io` : '/socket.io')
      return { url: origin, path }
    } catch {
      return null
    }
  }

  const merged = mergeAbsoluteEnv()
  if (merged) return merged

  for (const raw of [socketEnv, apiEnv]) {
    const hit = tryAbsolute(raw)
    if (hit) return hit
  }

  let base = ''
  if (typeof window !== 'undefined') {
    base = getApiBaseUrl().replace(/\/$/, '').trim()
    if (base.startsWith('/')) {
      base = `${window.location.origin}${base}`
    }
  } else {
    base = apiEnv.replace(/\/$/, '').trim()
    if (base.startsWith('/')) base = ''
  }

  const fromBase = base ? tryAbsolute(base) : null
  if (fromBase) return fromBase

  if (typeof window !== 'undefined') {
    const parts = window.location.pathname.split('/').filter(Boolean)
    const vmSeg = parts.find((s) => /^vmprojet/i.test(s))
    if (vmSeg) {
      return { url: window.location.origin, path: `/${vmSeg}/socket.io` }
    }

    const { protocol } = window.location
    if (protocol === 'capacitor:' || protocol === 'ionic:' || protocol === 'file:') {
      return {
        url: 'http://localhost:3000',
        path: explicitPath || '/socket.io',
      }
    }
    return {
      url: window.location.origin,
      path: explicitPath || '/vmProjetIntegrateurgrp10-0/socket.io',
    }
  }

  return { url: 'http://localhost:3000', path: '/socket.io' }
}
