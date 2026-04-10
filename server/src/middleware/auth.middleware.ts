import type { Request, Response, NextFunction } from 'express'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'
import { env } from '../config/env.js'

function debugAuth(message: string, details?: Record<string, unknown>) {
  if (!env.isDevelopment) return
  if (details) console.log('[AUTH]', message, details)
  else console.log('[AUTH]', message)
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  debugAuth('request', {
    path: req.path,
    method: req.method,
    hasAuthorization: Boolean(req.headers.authorization),
  })

  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    debugAuth('rejected: missing or malformed token')
    return res.status(401).json({ error: 'Token manquant ou mal formé' })
  }

  try {
    const blacklisted = await isBlacklisted(token)
    if (blacklisted) {
      debugAuth('rejected: token blacklisted')
      return res.status(401).json({ error: 'Token révoqué' })
    }

    const decoded = verifyToken(token)
    debugAuth('ok', { userId: decoded.userId })
    req.userId = decoded.userId

    return next()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'unknown'
    debugAuth('jwt verification failed', { message })
    return res.status(401).json({ error: 'Token invalide' })
  }
}
