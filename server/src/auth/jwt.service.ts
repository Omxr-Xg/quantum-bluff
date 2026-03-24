import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'quantum_bluff_secret'
const JWT_EXPIRES = '7d'

export function generateToken(payload: { userId: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES })
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET)
}