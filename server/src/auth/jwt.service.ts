import jwt, {
  type Algorithm,
  type JwtPayload,
  type SignOptions,
  type VerifyOptions,
} from 'jsonwebtoken'
import { env } from '../config/env.js'

const ACCESS_TOKEN_ALGORITHM: Algorithm = 'HS256'

export interface AccessTokenPayload extends JwtPayload {
  userId: string
  type: 'access'
  sub: string
  /** Présent uniquement pour le jeton « console admin » (login dédié). */
  role?: 'admin'
}

function assertAccessTokenPayload(decoded: string | JwtPayload): asserts decoded is AccessTokenPayload {
  if (typeof decoded === 'string') {
    throw new Error('Invalid token payload')
  }

  if (typeof decoded.userId !== 'string' || decoded.userId.length === 0) {
    throw new Error('Invalid token userId')
  }

  if (decoded.type !== 'access') {
    throw new Error('Invalid token type')
  }

  if (typeof decoded.sub !== 'string' || decoded.sub !== decoded.userId) {
    throw new Error('Invalid token subject')
  }

  if (decoded.role !== undefined && decoded.role !== 'admin') {
    throw new Error('Invalid token role')
  }
}

export function extractBearerToken(raw: unknown): string | null {
  if (Array.isArray(raw)) {
    return extractBearerToken(raw[0])
  }

  if (typeof raw !== 'string') {
    return null
  }

  const value = raw.trim()

  if (!value) {
    return null
  }

  if (/^Bearer\s+/i.test(value)) {
    const token = value.replace(/^Bearer\s+/i, '').trim()
    return token || null
  }

  return value
}

const signOptions: SignOptions = {
  algorithm: ACCESS_TOKEN_ALGORITHM,
  expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  issuer: env.jwtIssuer,
  audience: env.jwtAudience,
}

const verifyOptions: VerifyOptions = {
  algorithms: [ACCESS_TOKEN_ALGORITHM],
  issuer: env.jwtIssuer,
  audience: env.jwtAudience,
}

export function generateToken(payload: { userId: string; role?: 'admin' }): string {
  return jwt.sign(
    {
      userId: payload.userId,
      type: 'access',
      ...(payload.role === 'admin' ? { role: 'admin' as const } : {}),
    },
    env.jwtSecret,
    {
      ...signOptions,
      subject: payload.userId,
    }
  )
}

export function verifyToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwtSecret, verifyOptions)
  assertAccessTokenPayload(decoded)
  return decoded
}