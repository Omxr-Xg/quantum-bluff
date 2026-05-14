import type { Request } from 'express'

/**
 * IP client la plus fiable disponible (nécessite `trust proxy` côté Express si reverse-proxy).
 */
export function getRegisterClientIp(req: Request): string {
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
