import type { Request } from 'express'

/**
 * IP du visiteur la plus fiable pour la géolocalisation d’inscription.
 * Ordre : en-têtes CDN / reverse-proxy courants, puis `X-Forwarded-For`, puis `req.ip`.
 * (Sans `trust proxy` + en-têtes corrects, on peut géolocaliser le proxy au lieu du client.)
 */
export function getRegisterClientIp(req: Request): string {
  const single = (name: string): string | null => {
    const raw = req.headers[name.toLowerCase()]
    const v = typeof raw === 'string' ? raw.trim() : Array.isArray(raw) ? raw[0]?.trim() ?? '' : ''
    return v.length > 0 ? stripIpv4Mapped(v) : null
  }

  const fromCf = single('cf-connecting-ip')
  if (fromCf) return fromCf
  const trueClient = single('true-client-ip')
  if (trueClient) return trueClient
  const realIp = single('x-real-ip')
  if (realIp) return realIp

  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string') {
    const first = xf.split(',')[0]?.trim()
    if (first) return stripIpv4Mapped(first)
  }
  if (typeof req.ip === 'string' && req.ip.length > 0) {
    return stripIpv4Mapped(req.ip)
  }
  const ra = req.socket?.remoteAddress
  return ra ? stripIpv4Mapped(ra) : ''
}

function stripIpv4Mapped(ip: string): string {
  return ip.replace(/^::ffff:/i, '')
}
