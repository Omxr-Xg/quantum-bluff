import type { Request } from 'express'
import { getRegisterClientIp } from './registerClientIp.js'

const TWO_LETTER = /^[A-Za-z]{2}$/

/**
 * Pays ISO 3166-1 alpha-2 depuis les en-têtes habituels des hébergeurs (sans appel réseau).
 */
export function readCountryFromProxyHeaders(req: Request): string | null {
  const read = (name: string): string | null => {
    const raw = req.headers[name.toLowerCase()]
    const v = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? raw[0]?.trim() ?? '' : ''
    if (!TWO_LETTER.test(v)) return null
    const up = v.toUpperCase()
    if (up === 'XX' || up === 'T1') return null
    return up
  }

  const fromCf = read('cf-ipcountry')
  if (fromCf) return fromCf
  const vercel = read('x-vercel-ip-country')
  if (vercel) return vercel
  const cfFront = read('cloudfront-viewer-country')
  if (cfFront) return cfFront
  const appengine = read('x-appengine-country')
  if (appengine) return appengine

  const force = process.env.REGISTER_FORCE_COUNTRY_CODE?.trim()
  if (force && TWO_LETTER.test(force)) return force.toUpperCase()

  return null
}

/**
 * Résout le pays pour les règles d’âge à l’inscription : en-têtes proxy d’abord, puis lookup public
 * (ipapi.co puis ipwho.is) si l’IP est exploitable.
 *
 * Limite inévitable : un VPN « Arabie saoudite » dont la **sortie réelle** est géolocalisée hors SA
 * (très fréquent) ne sera pas détecté comme SA. Seule l’IP vue par le serveur compte.
 */
export async function resolveCountryFromRequest(req: Request): Promise<string | null> {
  const fromHeaders = readCountryFromProxyHeaders(req)
  if (fromHeaders) return fromHeaders

  const ip = getRegisterClientIp(req)
  if (!ip || isLoopbackOrPrivate(ip)) {
    const devDefault = process.env.REGISTER_DEV_DEFAULT_COUNTRY?.trim()
    if (process.env.NODE_ENV === 'development' && devDefault && TWO_LETTER.test(devDefault)) {
      return devDefault.toUpperCase()
    }
    return null
  }

  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 2800)
    try {
      const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
        signal: ac.signal,
        headers: { 'User-Agent': 'QuantumBluff/1.0 (register)' },
      })
      if (res.ok) {
        const text = (await res.text()).trim()
        if (TWO_LETTER.test(text)) return text.toUpperCase()
      }
    } finally {
      clearTimeout(t)
    }
  } catch {
    /* ignore */
  }

  /* Second fournisseur si ipapi.co rate / limite — améliore la couverture des IP VPN. */
  try {
    const ac = new AbortController()
    const t = setTimeout(() => ac.abort(), 2800)
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
        signal: ac.signal,
        headers: { Accept: 'application/json', 'User-Agent': 'QuantumBluff/1.0 (register)' },
      })
      if (res.ok) {
        const j = (await res.json()) as { success?: boolean; country_code?: string }
        if (j && j.success === false) return null
        const cc = typeof j?.country_code === 'string' ? j.country_code.trim().toUpperCase() : ''
        if (TWO_LETTER.test(cc)) return cc
      }
    } finally {
      clearTimeout(t)
    }
  } catch {
    /* ignore */
  }

  return null
}

function isLoopbackOrPrivate(ip: string): boolean {
  if (ip === '::1' || ip === '127.0.0.1' || ip.startsWith('127.')) return true
  if (ip.startsWith('10.')) return true
  if (ip.startsWith('192.168.')) return true
  const m = /^172\.(\d{1,3})\./.exec(ip)
  if (m) {
    const n = Number(m[1])
    if (n >= 16 && n <= 31) return true
  }
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true
  return false
}
