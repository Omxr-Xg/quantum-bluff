import type { NextFunction, Request, Response } from 'express'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'

/**
 * JWT émis par POST /api/auth/admin/login uniquement (payload role: admin).
 */
export async function adminConsoleAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    return res.status(401).json({ error: 'Token manquant ou mal formé' })
  }

  try {
    const blacklisted = await isBlacklisted(token)
    if (blacklisted) {
      return res.status(401).json({ error: 'Token révoqué' })
    }

    const decoded = verifyToken(token)
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Accès administrateur requis.' })
    }

    req.userId = decoded.userId
    return next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}
