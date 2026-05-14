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
 * (ipapi.co) si l’IP est exploitable. En local sans IP publique, retourne `null` → règle « reste du monde » (18 ans).
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
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      signal: ac.signal,
      headers: { 'User-Agent': 'QuantumBluff/1.0 (register)' },
    })
    clearTimeout(t)
    if (!res.ok) return null
    const text = (await res.text()).trim()
    if (TWO_LETTER.test(text)) return text.toUpperCase()
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
