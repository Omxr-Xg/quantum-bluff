import type { Request, Response, NextFunction } from 'express'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'

/**
 * Middleware pour vérifier qu'un token JWT admin est valide
 * (utilisé pour les routes administrateur accessibles via la console admin)
 */
export async function requireAdminRole(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    const blacklisted = await isBlacklisted(token)
    if (blacklisted) {
      return res.status(401).json({ error: 'Token révoqué' })
    }

    const decoded = verifyToken(token)

    // Vérifier que le token a le rôle 'admin'
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Accès administrateur requis' })
    }

    req.userId = decoded.userId

    return next()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown'
    console.error('[adminRole] verification failed', { message })
    return res.status(401).json({ error: 'Token invalide' })
  }
}
