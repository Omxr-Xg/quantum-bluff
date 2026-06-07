import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../config/database.js'
import { generateToken } from './jwt.service.js'
import { getGamificationBundle } from '../logic/gamification.js'

export type GoogleUserInfo = {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

function slugUsername(raw: string): string {
  const slug = raw
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20)
  return slug || 'player'
}

async function generateUniqueUsername(base: string): Promise<string> {
  const root = slugUsername(base)
  for (let i = 0; i < 16; i++) {
    const candidate = i === 0 ? root : `${root}_${i}`
    const clash = await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    })
    if (!clash) return candidate
  }
  return `${root}_${crypto.randomBytes(3).toString('hex')}`
}

async function ensurePlayerStats(userId: string): Promise<void> {
  const existing = await prisma.playerStats.findUnique({ where: { playerId: userId } })
  if (!existing) {
    await prisma.playerStats.create({ data: { playerId: userId } }).catch(() => {})
  }
}

export async function findOrCreateUserFromGoogle(
  profile: GoogleUserInfo,
): Promise<{ userId: string; token: string; bannedUntil: Date | null }> {
  const googleId = profile.sub?.trim()
  if (!googleId) {
    throw new Error('GOOGLE_PROFILE_INVALID')
  }

  const email = profile.email?.trim().toLowerCase()
  if (!email || profile.email_verified === false) {
    throw new Error('GOOGLE_EMAIL_REQUIRED')
  }

  const byGoogle = await prisma.user.findUnique({
    where: { googleId },
    select: { id: true, bannedUntil: true },
  })

  if (byGoogle) {
    if (byGoogle.bannedUntil && byGoogle.bannedUntil > new Date()) {
      return { userId: byGoogle.id, token: '', bannedUntil: byGoogle.bannedUntil }
    }
    const token = generateToken({ userId: byGoogle.id })
    return { userId: byGoogle.id, token, bannedUntil: null }
  }

  const byEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true, googleId: true, bannedUntil: true },
  })

  if (byEmail) {
    if (byEmail.googleId && byEmail.googleId !== googleId) {
      throw new Error('GOOGLE_EMAIL_CONFLICT')
    }
    if (byEmail.bannedUntil && byEmail.bannedUntil > new Date()) {
      return { userId: byEmail.id, token: '', bannedUntil: byEmail.bannedUntil }
    }
    await prisma.user.update({
      where: { id: byEmail.id },
      data: { googleId, authProvider: 'GOOGLE' },
    })
    const token = generateToken({ userId: byEmail.id })
    return { userId: byEmail.id, token, bannedUntil: null }
  }

  const username = await generateUniqueUsername(profile.name ?? email.split('@')[0] ?? 'player')
  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10)
  const { generateReferralCode } = await import('../referral/referralCode.js')
  let referralCode = generateReferralCode()
  for (let i = 0; i < 8; i++) {
    const clash = await prisma.user.findFirst({ where: { referralCode }, select: { id: true } })
    if (!clash) break
    referralCode = generateReferralCode()
  }

  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: passwordHash,
      googleId,
      authProvider: 'GOOGLE',
      referralCode,
      avatarUrl: typeof profile.picture === 'string' ? profile.picture : undefined,
    },
    select: { id: true },
  })

  await ensurePlayerStats(user.id)
  await getGamificationBundle(prisma, user.id).catch(() => {})

  const token = generateToken({ userId: user.id })
  return { userId: user.id, token, bannedUntil: null }
}
