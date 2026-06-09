import type { Socket } from 'socket.io'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'
import { prisma } from '../config/database.js'

export async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const authToken = socket.handshake.auth?.token
  const headerToken = extractBearerToken(socket.handshake.headers.authorization)
  const token = typeof authToken === 'string' && authToken.trim() ? authToken.trim() : headerToken

  if (!token) {
    return next(new Error('Authentication error'))
  }

  try {
    if (await isBlacklisted(token)) {
      return next(new Error('Token revoked'))
    }

    const decoded = verifyToken(token)
    if (decoded.role === 'admin') {
      socket.data.userId = decoded.userId
      socket.data.isAdminSpectator = true
      return next()
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, bannedUntil: true },
    })
    if (!user) {
      return next(new Error('Session expired'))
    }
    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return next(new Error('Account suspended'))
    }

    socket.data.userId = decoded.userId

    return next()
  } catch {
    return next(new Error('Invalid token'))
  }
}
