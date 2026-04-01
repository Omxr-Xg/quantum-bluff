import type { Request, Response, NextFunction } from 'express'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    return res.status(401).json({ error: 'Token manquant ou mal formé' })
  }

  try {
    if (await isBlacklisted(token)) {
      return res.status(401).json({ error: 'Token révoqué' })
    }

    const decoded = verifyToken(token)

    req.userId = decoded.userId

    return next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}