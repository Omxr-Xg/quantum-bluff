import type { Request } from 'express'

/** UUID v4 (insensible à la casse). */
const UUID_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi

/**
 * Réduit un path brut vers un groupe faible cardinalité (jamais de path complet avec IDs).
 */
export function pathToRouteGroup(path: string): string {
  const clean = (path.split('?')[0] || '/').trim() || '/'
  return clean.replace(UUID_RE, ':id').replace(/\/+/g, '/') || '/'
}

/**
 * Préfère le template Express (`req.route`) après matching ; sinon normalisation du path.
 */
export function getRouteGroup(req: Request): string {
  const r = req as Request & { route?: { path: string } }
  if (r.route?.path) {
    const base = req.baseUrl || ''
    const combined = `${base}${r.route.path}`.replace(/\/+/g, '/')
    return combined || '/'
  }
  return pathToRouteGroup(req.path || '/')
}
