import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../auth/jwt.service.js'

export function authMiddleware(req: Request, res: Response, next: NextFunction) {

  const authHeader = req.headers.authorization

  if (!authHeader) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyToken(token) as any
    req.userId = decoded.userId
    next()
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide' })
  }
}