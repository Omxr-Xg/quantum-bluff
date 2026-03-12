import { verifyToken } from '../auth/jwt.service.js'
import { Socket } from 'socket.io'
import { JwtPayload } from 'jsonwebtoken'

export function socketAuth(socket: Socket, next: (err?: Error) => void) {

  const token = socket.handshake.auth?.token

  if (!token) {
    return next(new Error('Authentication error'))
  }

  try {

    const decoded = verifyToken(token) as JwtPayload & { userId: string }

    socket.data.userId = decoded.userId

    next()

  } catch {
    next(new Error('Invalid token'))
  }

}