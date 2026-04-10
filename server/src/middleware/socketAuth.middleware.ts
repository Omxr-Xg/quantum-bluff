import type { Socket } from 'socket.io'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'

export async function socketAuth(socket: Socket, next: (err?: Error) => void) {
  const rawToken = socket.handshake.auth?.token ?? socket.handshake.headers.authorization
  const token = extractBearerToken(rawToken)

  if (!token) {
    return next(new Error('Authentication error'))
  }

  try {
    if (await isBlacklisted(token)) {
      return next(new Error('Token revoked'))
    }

    const decoded = verifyToken(token)

    socket.data.userId = decoded.userId

    return next()
  } catch {
    return next(new Error('Invalid token'))
  }
}