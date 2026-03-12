import { verifyToken } from '../auth/jwt.service.js'

export function socketAuth(socket, next) {

  const token = socket.handshake.auth?.token

  if (!token) {
    return next(new Error('Authentication error'))
  }

  try {
    const decoded = verifyToken(token)
    socket.data.userId = decoded.userId
    next()
  } catch {
    next(new Error('Invalid token'))
  }
}