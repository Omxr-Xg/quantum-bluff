import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  const token = authHeader.split(' ')[1]

  try {
    if (await isBlacklisted(token)) {
      return res.status(401).json({ error: 'Token révoqué' })
    }

    const decoded = verifyToken(token) as { userId: string }

    req.userId = String(decoded.userId)

    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}