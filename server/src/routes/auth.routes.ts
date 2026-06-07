import express from 'express'
import bcrypt from 'bcryptjs'
import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'
import { pgPool, prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { registerSchema, loginSchema, resetPasswordSchema, setPasswordSchema, strongPasswordSchema } from '../validation/auth.validation.js'
import { resolveCountryFromRequest } from '../utils/registerCountryFromRequest.js'
import { evaluateRegisterAgeGate, parseIsoDateOfBirth, eligibilityUnblockAtUtc, isBeforeEligibilityDay } from '../utils/registerAgeGate.js'
import { normalizeSecretAnswer } from '../utils/secretAnswer.js'
import rateLimit from 'express-rate-limit'
import { logSuspiciousAction } from '../utils/securityLogger.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { addToBlacklist, isBlacklisted } from '../auth/tokenBlacklist.js'
import { verifyTotpToken } from '../auth/totp.service.js'
import { getGamificationBundle } from '../logic/gamification.js'
import { extractBearerToken, generateToken, verifyToken } from '../auth/jwt.service.js'
import { sanitizePublicAvatarUrl } from '../utils/avatarUrl.js'
import {
  canonicalStoredAvatarPath,
  ingestAvatarToBuffer,
  isUuidParam,
} from '../utils/userAvatarIngest.js'
import { clientAvatarUrlFromUser } from '../utils/userAvatarPublic.js'
import { ipKeyGenerator } from 'express-rate-limit'
import { rateLimitWithMetrics } from '../observability/index.js'
import { isFreeTopupPromoCode } from '../config/balanceResetPromo.js'
import { adminConsoleAuthMiddleware } from '../middleware/adminConsole.middleware.js'
import * as giftCodesService from '../giftCodes/giftCodes.service.js'
import { deleteUserAccount, UserDeletionError } from '../services/userDeletion.service.js'

function normalizeRateLimitIdentity(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function loginRateLimitKey(req: express.Request): string {
  const email = normalizeRateLimitIdentity(req.body?.email)
  if (email) return `${ipKeyGenerator(req.ip ?? '')}:login:${email}`  
  return `${ipKeyGenerator(req.ip ?? '')}:login`
}

function registerRateLimitKey(req: express.Request): string {
  const email = normalizeRateLimitIdentity(req.body?.email)
  const username = normalizeRateLimitIdentity(req.body?.username)
  if (email) return `${ipKeyGenerator(req.ip ?? '')}:register:${email}`
  if (username) return `${ipKeyGenerator(req.ip ?? '')}:register:${username}`
  return `${ipKeyGenerator(req.ip ?? '')}:register`
}

/** Connexion : 5 requêtes / 10 min / IP. */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: loginRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log('LOGIN LIMITER TRIGGERED')
    logSuspiciousAction('BRUTE_FORCE_LOGIN', {
      details: {
        ip: req.ip,
        route: '/api/auth/login',
        timestamp: new Date().toISOString()
      }
    })

    return res.status(429).json({
      error: 'Trop de tentatives de connexion. Réessaie dans 10 minutes.'
    })
  }
})

const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: registerRateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log('REGISTER LIMITER TRIGGERED')
    logSuspiciousAction('BRUTE_FORCE_REGISTER', {
      details: {
        ip: req.ip,
        route: '/api/auth/register',
        timestamp: new Date().toISOString()
      }
    })

    return res.status(429).json({
      error: 'Trop de créations de compte. Réessaie dans 10 minutes.'
    })
  }
})

const checkEmailLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Trop de tentatives. Réessayez plus tard.' })
  },
})

/** Polling solde / historique : plafond dédié par utilisateur (après authMiddleware). */
const balancePollLimiter = rateLimitWithMetrics({
  windowMs: 60 * 1000,
  limit: env.isProduction ? 240 : 2000,
  message: { error: 'Trop de lectures de solde, réessaie dans une minute' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: express.Request) => {
    const uid = (req as express.Request & { userId?: string }).userId
    if (uid) return `balancePoll:${uid}`
    return `balancePoll:${ipKeyGenerator(req.ip ?? '')}`
  },
})

const router = express.Router()

/** Avatar binaire en base — lecture publique (UUID non devinable). */
router.get('/avatars/:userId', async (req, res) => {
  try {
    const userId = typeof req.params.userId === 'string' ? req.params.userId : ''
    if (!isUuidParam(userId)) {
      return res.status(400).json({ error: 'Identifiant invalide' })
    }
    const result = await pgPool.query<{
      avatarImage: Buffer | null
      avatarMime: string | null
      avatarUrl: string | null
    }>(
      'SELECT "avatarImage", "avatarMime", "avatarUrl" FROM "User" WHERE "id" = $1 LIMIT 1',
      [userId],
    )
    const user = result.rows[0]
    if (!user) {
      return res.status(404).end()
    }
    if (user.avatarImage != null && user.avatarImage.length > 0 && user.avatarMime) {
      res.setHeader('Content-Type', user.avatarMime)
      res.setHeader('Cache-Control', 'private, no-cache, max-age=0, must-revalidate')
      return res.send(user.avatarImage)
    }
    const legacy = user.avatarUrl?.trim() ?? ''
    if (legacy.startsWith('http://') || legacy.startsWith('https://')) {
      return res.redirect(302, legacy)
    }
    return res.status(404).end()
  } catch (error) {
    console.error('[AUTH] GET avatar error:', error)
    return res.status(500).end()
  }
})

// Regex format email: xxx@yyy.zzz
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function userNeedsPasswordSetup(user: { authProvider: string; passwordSetAt: Date | null }): boolean {
  return user.authProvider !== 'LOCAL' && user.passwordSetAt == null
}

// CHECK EMAIL - Vérifie si l'email existe (pour flux login/register unifié)
router.post('/check-email', checkEmailLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_FORMAT.test(email)) {
    return res.status(400).json({ error: 'Email invalide' })
  }
  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
    res.json({ exists: !!user })
  } catch (error) {
    console.error('[AUTH] check-email error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// REGISTER
router.post('/register', registerLimiter, async (req, res) => {

  const parsed = registerSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ 
      error: parsed.error.issues.map(issue => issue.message).join(', ') 
    })
  }

  let { email, password, username, secretQuestionId, secretAnswer, dateOfBirth, referralCode } = parsed.data

  if (referralCode) {
    const { normalizeReferralCode } = await import('../referral/referralCode.js')
    const normalized = normalizeReferralCode(referralCode)
    referralCode = normalized.length >= 4 ? normalized : undefined
  }

  email = sanitizeHtml(email)
  username = sanitizeHtml(username)
  const emailKey = email.trim().toLowerCase()
  const now = new Date()

  try {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingEmail) {
      return res.status(400).json({ error: 'Email déjà utilisé' })
    }

    const ageBlock = await prisma.emailRegistrationAgeBlocklist.findUnique({
      where: { email: emailKey },
      select: { unblockAt: true },
    })
    if (ageBlock) {
      if (isBeforeEligibilityDay(now, ageBlock.unblockAt)) {
        return res.status(403).json({
          error:
            'Cet e-mail ne peut pas être utilisé pour s’inscrire avant la date d’éligibilité liée à votre âge.',
          code: 'REGISTER_EMAIL_AGE_BLACKLISTED',
          unblockAt: ageBlock.unblockAt.toISOString(),
        })
      }
      await prisma.emailRegistrationAgeBlocklist.delete({ where: { email: emailKey } }).catch(() => {
        /* concurrent delete */
      })
    }

    const countryCode = await resolveCountryFromRequest(req)
    const gate = evaluateRegisterAgeGate(dateOfBirth, countryCode, now)
    if (!gate.ok) {
      const messages: Record<string, string> = {
        REGISTER_DATE_INVALID: 'Date de naissance invalide.',
        REGISTER_GAMBLING_FORBIDDEN:
          'Les jeux d’argent en ligne ne sont pas autorisés depuis votre pays (Arabie saoudite ou Iran).',
        REGISTER_AGE_US_21:
          'Aux États-Unis, l’accès aux jeux d’argent en ligne est réservé aux personnes de 21 ans ou plus.',
        REGISTER_AGE_MIN_18: 'Vous devez avoir au moins 18 ans pour créer un compte.',
      }
      const status = gate.code === 'REGISTER_GAMBLING_FORBIDDEN' ? 403 : 400

      if (gate.code === 'REGISTER_AGE_US_21' || gate.code === 'REGISTER_AGE_MIN_18') {
        const dobUtc = parseIsoDateOfBirth(dateOfBirth)
        if (dobUtc) {
          const minYears = gate.code === 'REGISTER_AGE_US_21' ? 21 : 18
          const candidate = eligibilityUnblockAtUtc(dobUtc, minYears)
          const prev = await prisma.emailRegistrationAgeBlocklist.findUnique({
            where: { email: emailKey },
            select: { unblockAt: true },
          })
          const merged = new Date(
            Math.max(candidate.getTime(), prev?.unblockAt.getTime() ?? 0),
          )
          await prisma.emailRegistrationAgeBlocklist.upsert({
            where: { email: emailKey },
            create: { email: emailKey, unblockAt: merged },
            update: { unblockAt: merged },
          })
        }
      }

      return res.status(status).json({
        error: messages[gate.code] ?? 'Inscription refusée.',
        code: gate.code,
      })
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    if (existingUsername) {
      return res.status(400).json({ error: 'Nom d’utilisateur déjà utilisé' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const secretAnswerHash = await bcrypt.hash(normalizeSecretAnswer(secretAnswer), 10)

    const { generateReferralCode } = await import('../referral/referralCode.js')
    let newReferralCode = generateReferralCode()
    for (let i = 0; i < 8; i++) {
      const clash = await prisma.user.findFirst({ where: { referralCode: newReferralCode }, select: { id: true } })
      if (!clash) break
      newReferralCode = generateReferralCode()
    }

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        secretQuestionId,
        secretAnswerHash,
        dateOfBirth: gate.dobUtc,
        referralCode: newReferralCode,
        passwordSetAt: now,
      },
      include: { playerStats: true }
    })

    // Créer PlayerStats si pas encore fait (relation optionnelle)
    let playerStats = user.playerStats
    if (!playerStats) {
      try {
        playerStats = await prisma.playerStats.create({
          data: { playerId: user.id }
        })
      } catch (statsErr) {
        console.warn('[AUTH] PlayerStats non créé à l\'inscription:', statsErr)
      }
    }

    const token = generateToken({ userId: user.id })
    const g = await getGamificationBundle(prisma, user.id)

    let chipsAfterRegister = user.chips
    let referralMeta: {
      applied: true
      bonusChips: number
      referrerUsername: string
      friendAdded: true
    } | null = null
    try {
      const { applyReferralOnRegister } = await import('../referral/referral.service.js')
      const { REFERRAL_REFERRED_CHIPS } = await import('../referral/referral.types.js')
      const io = req.app.get('io') as import('socket.io').Server | undefined
      const referralResult = await applyReferralOnRegister(user.id, referralCode, io)
      if (referralResult) {
        chipsAfterRegister = referralResult.referredChips
        referralMeta = {
          applied: true,
          bonusChips: REFERRAL_REFERRED_CHIPS,
          referrerUsername: referralResult.referrerUsername,
          friendAdded: true,
        }
      }
    } catch (refErr) {
      console.warn('[AUTH] Parrainage à l\'inscription:', refErr)
    }

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      select: { chips: true },
    })
    if (refreshed) chipsAfterRegister = refreshed.chips

    if (!referralMeta && referralCode) {
      const { REFERRAL_REFERRED_CHIPS } = await import('../referral/referral.types.js')
      const appliedRow = await prisma.referral.findUnique({
        where: { referredUserId: user.id },
        include: { referrer: { select: { username: true } } },
      })
      if (appliedRow?.status === 'COMPLETED') {
        referralMeta = {
          applied: true,
          bonusChips: REFERRAL_REFERRED_CHIPS,
          referrerUsername: appliedRow.referrer.username,
          friendAdded: true,
        }
      }
    }

    await prisma.emailRegistrationAgeBlocklist.deleteMany({ where: { email: emailKey } }).catch(() => {})

    res.status(201).json({
      token,
      referral: referralMeta,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: chipsAfterRegister,
        level: g?.level ?? user.level,
        experience: g?.experience ?? user.experience,
        xpToNext: g?.xpToNext ?? 0,
        badges: g?.badges ?? [],
        maxBetSlot: g?.maxBetSlot,
        maxBetRouletteLine: g?.maxBetRouletteLine,
        maxRouletteTotalStake: g?.maxRouletteTotalStake,
        maxBetBlackjack: g?.maxBetBlackjack,
        playerStats: playerStats ?? null,
        lobbyTutorialCompleted: user.lobbyTutorialCompletedAt != null,
        avatarUrl: clientAvatarUrlFromUser(user),
        needsPasswordSetup: false,
      }
    })

  } catch (error) {
    console.error('[AUTH] Erreur inscription:', error)
    const message =
      process.env.NODE_ENV === 'development'
        ? String((error as Error)?.message ?? error)
        : 'Erreur serveur'
    res.status(500).json({ error: message })
  }

})

// Question secrète pour réinitialisation (l’id ; le libellé est côté client i18n)
router.post('/recovery-question', recoveryLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_FORMAT.test(email)) {
    return res.status(400).json({ error: 'Email invalide' })
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { secretQuestionId: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'Aucun compte associé à cet email.' })
    }
    if (user.secretQuestionId == null) {
      return res.status(400).json({
        code: 'NO_SECRET_QUESTION',
        error: 'Ce compte ne permet pas la récupération en ligne. Contactez le support.',
      })
    }
    res.json({ questionId: user.secretQuestionId })
  } catch (error) {
    console.error('[AUTH] recovery-question error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Réinitialiser le mot de passe avec la réponse secrète
router.post('/reset-password', recoveryLimiter, async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues.map((issue) => issue.message).join(', '),
    })
  }
  let { email, secretAnswer, newPassword } = parsed.data
  email = email.trim().toLowerCase()
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, secretQuestionId: true, secretAnswerHash: true, totpSecret: true },
    })
    if (!user) {
      return res.status(404).json({ error: 'Aucun compte associé à cet email.' })
    }
    if (user.secretQuestionId == null || !user.secretAnswerHash) {
      return res.status(400).json({ error: 'Récupération impossible pour ce compte.' })
    }
    const ok = await bcrypt.compare(normalizeSecretAnswer(secretAnswer), user.secretAnswerHash)
    if (!ok) {
      return res.status(401).json({ error: 'Réponse secrète incorrecte.' })
    }
    if (user.totpSecret) {
      const code = typeof req.body?.totpCode === 'string' ? req.body.totpCode.replace(/\s/g, '') : ''
      if (!code || code.length !== 6) {
        return res.status(401).json({ error: 'Code 2FA requis', requires2FA: true })
      }
      if (!verifyTotpToken(user.totpSecret, code)) {
        return res.status(401).json({ error: 'Code 2FA incorrect' })
      }
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
      select: { id: true },
    })
    res.json({ ok: true })
  } catch (error) {
    console.error('[AUTH] reset-password error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {

  const parsed = loginSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ 
      error: parsed.error.issues.map(issue => issue.message).join(', ') 
    })
  }

  const { email, password } = parsed.data

  try {

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        chips: true,
        level: true,
        experience: true,
        totpSecret: true,
        secretQuestionId: true,
        secretAnswerHash: true,
        lobbyTutorialCompletedAt: true,
        avatarUrl: true,
        avatarHasBinary: true,
        bannedUntil: true,
        playerStats: true,
        authProvider: true,
        passwordSetAt: true,
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({
        error: `Compte suspendu jusqu'au ${user.bannedUntil.toLocaleString('fr-FR')}.`,
        code: 'ACCOUNT_SUSPENDED',
        bannedUntil: user.bannedUntil.toISOString(),
      })
    }

    if (user.totpSecret) {
      const code = typeof req.body?.totpCode === 'string' ? req.body.totpCode.replace(/\s/g, '') : ''
      if (!code || code.length !== 6) {
        return res.status(401).json({ error: 'Code 2FA requis', requires2FA: true })
      }
      if (!verifyTotpToken(user.totpSecret, code)) {
        return res.status(401).json({ error: 'Code 2FA incorrect' })
      }
    }

    const token = generateToken({ userId: user.id })
    const g = await getGamificationBundle(prisma, user.id)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: user.chips,
        level: g?.level ?? user.level,
        experience: g?.experience ?? user.experience,
        xpToNext: g?.xpToNext ?? 0,
        badges: g?.badges ?? [],
        maxBetSlot: g?.maxBetSlot,
        maxBetRouletteLine: g?.maxBetRouletteLine,
        maxRouletteTotalStake: g?.maxRouletteTotalStake,
        maxBetBlackjack: g?.maxBetBlackjack,
        playerStats: user.playerStats,
        lobbyTutorialCompleted: user.lobbyTutorialCompletedAt != null,
        avatarUrl: clientAvatarUrlFromUser(user),
        needsPasswordSetup: userNeedsPasswordSetup(user),
      }
    })

  } catch (error) {
    console.error('[AUTH] Erreur login:', error)
    const message = process.env.NODE_ENV === 'development'
      ? String((error as Error).message)
      : 'Erreur serveur'
    res.status(500).json({ error: message })
  }

})

/** Profil courant (login OAuth, refresh client). */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        chips: true,
        level: true,
        experience: true,
        lobbyTutorialCompletedAt: true,
        avatarUrl: true,
        avatarHasBinary: true,
        playerStats: true,
        authProvider: true,
        passwordSetAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable' })
    }

    const g = await getGamificationBundle(prisma, user.id)

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: user.chips,
        level: g?.level ?? user.level,
        experience: g?.experience ?? user.experience,
        xpToNext: g?.xpToNext ?? 0,
        badges: g?.badges ?? [],
        maxBetSlot: g?.maxBetSlot,
        maxBetRouletteLine: g?.maxBetRouletteLine,
        maxRouletteTotalStake: g?.maxRouletteTotalStake,
        maxBetBlackjack: g?.maxBetBlackjack,
        playerStats: user.playerStats,
        lobbyTutorialCompleted: user.lobbyTutorialCompletedAt != null,
        avatarUrl: clientAvatarUrlFromUser(user),
        authProvider: user.authProvider,
        needsPasswordSetup: userNeedsPasswordSetup(user),
      },
    })
  } catch (error) {
    console.error('[AUTH] me GET error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** Définit un mot de passe pour les comptes Google (avant lobby / suppression de compte). */
router.post('/set-password', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const parsed = setPasswordSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map((issue) => issue.message).join(', '),
      })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, authProvider: true, passwordSetAt: true },
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    if (user.passwordSetAt) {
      return res.status(409).json({ error: 'Un mot de passe est déjà défini pour ce compte.' })
    }
    if (user.authProvider === 'LOCAL') {
      return res.status(400).json({ error: 'Ce compte utilise déjà un mot de passe local.' })
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 10)
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        passwordSetAt: new Date(),
      },
    })

    return res.json({ ok: true, needsPasswordSetup: false })
  } catch (error) {
    console.error('[AUTH] set-password error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** État du tutoriel lobby (par compte, stocké en base). */
router.get('/lobby-tutorial-status', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lobbyTutorialCompletedAt: true },
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    return res.json({ completed: user.lobbyTutorialCompletedAt != null })
  } catch (error) {
    console.error('[AUTH] lobby-tutorial-status error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

const profileUpdateSchema = z.object({
  avatarUrl: z.string().nullable().optional(),
  username: z.string().trim().min(3).max(20).optional(),
  email: z.string().trim().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: strongPasswordSchema.optional(),
})

/**
 * Met à jour le profil : username/email/password et avatar.
 * L’avatar uploadé est ingéré en BYTEA + URL canonique `/api/auth/avatars/:id`.
 */
router.patch('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const parsed = profileUpdateSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues.map(issue => issue.message).join(', '),
      })
    }

    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        avatarUrl: true,
        avatarHasBinary: true,
      },
    })
    if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const data: Record<string, unknown> = {}
    const nextUsername = parsed.data.username != null ? sanitizeHtml(parsed.data.username).trim() : undefined
    const nextEmail = parsed.data.email != null ? sanitizeHtml(parsed.data.email).trim().toLowerCase() : undefined

    if (parsed.data.username != null && (!nextUsername || nextUsername.length < 3 || nextUsername.length > 20)) {
      return res.status(400).json({ error: 'Nom d’utilisateur invalide' })
    }

    if (parsed.data.email != null && (!nextEmail || !EMAIL_FORMAT.test(nextEmail))) {
      return res.status(400).json({ error: 'Email invalide' })
    }

    if (nextUsername && nextUsername !== existing.username) {
      const taken = await prisma.user.findUnique({ where: { username: nextUsername }, select: { id: true } })
      if (taken && taken.id !== userId) {
        return res.status(400).json({ error: 'Nom d’utilisateur déjà utilisé' })
      }
      data.username = nextUsername
    }

    if (nextEmail && nextEmail !== existing.email) {
      const taken = await prisma.user.findUnique({ where: { email: nextEmail }, select: { id: true } })
      if (taken && taken.id !== userId) {
        return res.status(400).json({ error: 'Email déjà utilisé' })
      }
      data.email = nextEmail
    }

    if (parsed.data.newPassword) {
      if (!parsed.data.currentPassword) {
        return res.status(400).json({ error: 'Mot de passe actuel requis' })
      }
      const passwordOk = await bcrypt.compare(parsed.data.currentPassword, existing.password)
      if (!passwordOk) {
        return res.status(400).json({ error: 'Mot de passe actuel incorrect' })
      }
      data.password = await bcrypt.hash(parsed.data.newPassword, 10)
    }

    const avatarProvided = Object.prototype.hasOwnProperty.call(req.body ?? {}, 'avatarUrl')
    if (avatarProvided) {
      const raw = parsed.data.avatarUrl
      if (raw === null || raw === undefined || raw === '') {
        data.avatarUrl = null
        data.avatarImage = null
        data.avatarMime = null
        data.avatarHasBinary = false
      } else {
        const sanitized = sanitizePublicAvatarUrl(raw)
        if (sanitized == null) {
          return res.status(400).json({ error: 'URL d’avatar invalide' })
        }
        const canonical = canonicalStoredAvatarPath(userId)
        if (sanitized === canonical && existing.avatarHasBinary) {
          data.avatarUrl = canonical
          data.avatarHasBinary = true
        } else {
          const ingested = await ingestAvatarToBuffer(sanitized)
          if (ingested == null) {
            return res.status(400).json({ error: 'Impossible d’enregistrer cette image (format ou taille).' })
          }
          data.avatarImage = new Uint8Array(ingested.buffer)
          data.avatarMime = ingested.mime
          data.avatarUrl = canonical
          data.avatarHasBinary = true
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, email: true, avatarUrl: true, avatarHasBinary: true },
    })
    return res.json({
      username: user.username,
      email: user.email,
      avatarUrl: clientAvatarUrlFromUser(user),
    })
  } catch (error) {
    console.error('[AUTH] profile PATCH error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** Marque le tutoriel lobby comme vu (terminer ou ignorer). Idempotent. */
router.post('/lobby-tutorial/complete', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    await prisma.user.update({
      where: { id: userId },
      data: { lobbyTutorialCompletedAt: new Date() },
      select: { id: true },
    })
    return res.json({ ok: true })
  } catch (error) {
    console.error('[AUTH] lobby-tutorial/complete error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/auth/gamification — XP, niveau, badges, plafonds slot/roulette
router.get('/gamification', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const g = await getGamificationBundle(prisma, userId)
    if (!g) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json(g)
  } catch (error) {
    console.error('[AUTH] gamification error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/auth/balance - Récupère la balance serveur (source de vérité, jamais le client)
router.get('/balance', authMiddleware, balancePollLimiter, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true }
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    res.json({ chips: user.chips })
  } catch (error) {
    console.error('balance GET error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// GET /api/auth/balance-history - Historique des mouvements de solde (casino ledger)
router.get('/balance-history', authMiddleware, balancePollLimiter, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const rawLimit = Number(req.query.limit)
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50

    const entries = await prisma.walletLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        reason: true,
        gameType: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        roundId: true,
      },
    })

    res.json({ entries })
  } catch (error) {
    console.error('balance-history GET error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** Valide un code promo pour le faux checkout « alimenter le compte » (effets connus uniquement côté serveur). */
router.post('/validate-topup-promo', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const code = typeof req.body?.code === 'string' ? req.body.code : ''
    if (!code.trim()) return res.json({ valid: false })
    if (isFreeTopupPromoCode(code)) {
      return res.json({ valid: true, freeCheckout: true })
    }
    return res.json({ valid: false })
  } catch (error) {
    console.error('validate-topup-promo error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/auth/add-dev-money - Ajoute des jetons (validation "dev" côté serveur, pas de confiance client)
router.post('/add-dev-money', authMiddleware, async (req, res) => {
  const promoRaw = typeof req.body?.promoCode === 'string' ? req.body.promoCode : ''
  const promoFreeTopup = isFreeTopupPromoCode(promoRaw)
  const allowInProduction = String(process.env.ALLOW_DEV_TOPUP ?? '').toLowerCase() === 'true'
  if (process.env.NODE_ENV === 'production' && !allowInProduction && !promoFreeTopup) {
    return res.status(403).json({ error: "Bien essayé !  L'ajout d'argent gratuit est désactivé en production." })
  }

  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const secret = typeof req.body?.secret === 'string' ? req.body.secret.trim().toLowerCase() : ''
    if (secret !== 'dev') return res.status(403).json({ error: 'Validation requise' })

    const before = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!before) return res.status(404).json({ error: 'Utilisateur non trouvé' })

    const rawAmount = typeof req.body?.amount === 'number' ? req.body.amount : Number(req.body?.amount)
    const amount = Math.min(999999, Math.max(1, Math.floor(Number(rawAmount))))
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Montant invalide' })

    if (promoFreeTopup) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { chips: { increment: amount } },
        select: { chips: true },
      })
      await prisma.walletLedgerEntry.create({
        data: {
          userId,
          amount,
          reason: 'PROMO_FREE_TOPUP',
          gameType: 'wallet',
          balanceBefore: before.chips,
          balanceAfter: user.chips,
          settlementState: 'SETTLED',
        },
      })
      return res.json({ ok: true, chips: user.chips, freeCheckout: true })
    }

    if (process.env.NODE_ENV === 'production' && !allowInProduction) {
      return res.status(403).json({ error: "Bien essayé !  L'ajout d'argent gratuit est désactivé en production." })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { chips: { increment: amount } },
      select: { chips: true }
    })

    // Trace comptable explicite du rajout de solde (utile pour l'historique client).
    await prisma.walletLedgerEntry.create({
      data: {
        userId,
        amount,
        reason: 'DEV_TOPUP',
        gameType: 'wallet',
        balanceBefore: before.chips,
        balanceAfter: user.chips,
        settlementState: 'SETTLED',
      },
    })
    res.json({ ok: true, chips: user.chips })
  } catch (error) {
    console.error('add-dev-money error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// POST /api/auth/withdraw-money - Demande de retrait (debite le solde, ecrit un ledger)
// Sequel de /add-dev-money : pas de monnaie reelle, pas de virement bancaire reel,
// mais on validate la structure IBAN et on decremente le solde via une transaction
// avec garde "amount <= chips" pour eviter les soldes negatifs en cas de concurrence.
router.post('/withdraw-money', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const secret = typeof req.body?.secret === 'string' ? req.body.secret.trim().toLowerCase() : ''
    if (secret !== 'dev') return res.status(403).json({ error: 'Validation requise' })

    const rawAmount = typeof req.body?.amount === 'number' ? req.body.amount : Number(req.body?.amount)
    const amount = Math.min(999999, Math.max(1, Math.floor(Number(rawAmount))))
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' })
    }

    const ibanRaw = typeof req.body?.iban === 'string' ? req.body.iban : ''
    const iban = ibanRaw.replace(/[\s-]+/g, '').toUpperCase()
    if (iban.length < 15 || iban.length > 34 || !/^[A-Z]{2}[A-Z0-9]+$/.test(iban)) {
      return res.status(400).json({ error: 'IBAN invalide' })
    }

    const holderRaw = typeof req.body?.holder === 'string' ? req.body.holder.trim() : ''
    if (holderRaw.length < 2) {
      return res.status(400).json({ error: 'Titulaire requis' })
    }

    /* Decrement avec garde anti-overdraft. Si chips < amount, le `where`
     * ne matchera aucune ligne et l'update echouera proprement. */
    const before = await prisma.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!before) return res.status(404).json({ error: 'Utilisateur non trouvé' })
    if (before.chips < amount) return res.status(400).json({ error: 'Solde insuffisant' })

    const updated = await prisma.user.update({
      where: { id: userId, chips: { gte: amount } },
      data: { chips: { decrement: amount } },
      select: { chips: true },
    }).catch(() => null)
    if (!updated) return res.status(409).json({ error: 'Solde insuffisant (concurrence)' })

    /* On ne stocke pas l'IBAN complet dans le ledger (PII / privacy) :
     * uniquement les 4 derniers caracteres pour traceabilite. */
    const ibanTail = iban.slice(-4)
    await prisma.walletLedgerEntry.create({
      data: {
        userId,
        amount: -amount,
        reason: 'WITHDRAWAL_REQUEST',
        gameType: 'wallet',
        roundId: `iban_****${ibanTail}`,
        balanceBefore: before.chips,
        balanceAfter: updated.chips,
        settlementState: 'SETTLED',
      },
    })

    res.json({ ok: true, chips: updated.chips })
  } catch (error) {
    console.error('withdraw-money error:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// DÉPRÉCIÉ : Ne plus accepter de balance envoyée par le client (risque de triche)
router.post('/sync-balance', authMiddleware, async (_req, res) => {
  res.status(410).json({ error: 'Endpoint désactivé pour sécurité. Utilisez GET /api/auth/balance.' })
})

/** Connexion « console admin » web : identifiants dans ADMIN_CONSOLE_* (hash bcrypt). */
const adminConsoleLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
})

const adminConsoleLoginSchema = z.object({
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
})

router.post('/admin/login', adminConsoleLoginLimiter, async (req, res) => {
  if (!env.adminConsoleUsername || !env.adminConsolePasswordHash) {
    return res.status(503).json({
      error: 'Console administrateur non configurée.',
      code: 'ADMIN_CONSOLE_NOT_CONFIGURED',
    })
  }
  const parsed = adminConsoleLoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Requête invalide' })
  }
  const { username, password } = parsed.data
  const passwordOk = await bcrypt.compare(password, env.adminConsolePasswordHash)
  if (username !== env.adminConsoleUsername || !passwordOk) {
    return res.status(401).json({ error: 'Identifiants invalides' })
  }
  const token = generateToken({ userId: env.adminConsoleJwtUserId, role: 'admin' })
  return res.json({
    token,
    user: {
      id: env.adminConsoleJwtUserId,
      username: 'admin',
      role: 'admin' as const,
    },
  })
})

/** Codes cadeaux console admin — sous /api/auth/admin/* (même JWT que /admin/login). */
const adminGiftCodeCreateSchema = z.object({
  code: z.string().min(1).max(64),
  amount: z.number().int().min(1),
  usageType: z.enum(['TOKENS', 'FIXED_DISCOUNT', 'PERCENTAGE_DISCOUNT']),
  type: z.enum(['ACHIEVEMENT', 'EVENT', 'SEASONAL', 'SPECIAL']),
  description: z.string().max(500).nullable().optional(),
  expiresAt: z.string().nullable().optional(),
  maxUses: z.number().int().optional(),
})

router.get('/admin/gift-codes', adminConsoleAuthMiddleware, async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? '50'), 10) || 50, 100)
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'), 10) || 0, 0)
    const result = await giftCodesService.getAllGiftCodes(limit, offset)
    return res.json(result)
  } catch (e) {
    console.error('[auth] admin gift-codes list', e)
    return res.status(500).json({ error: 'Impossible de charger les codes cadeaux' })
  }
})

router.post('/admin/gift-codes', adminConsoleAuthMiddleware, async (req, res) => {
  const parsed = adminGiftCodeCreateSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides' })
  }
  const { code, amount, usageType, type, description, expiresAt, maxUses } = parsed.data
  try {
    const giftCode = await giftCodesService.createGiftCode({
      code: code.trim(),
      amount,
      usageType,
      type,
      description: description ?? null,
      expiresAt: expiresAt ?? null,
      maxUses: maxUses ?? -1,
    })
    return res.status(201).json(giftCode)
  } catch (e) {
    console.error('[auth] admin gift-codes create', e)
    return res.status(400).json({
      error: e instanceof Error ? e.message : 'Création impossible',
    })
  }
})

const deleteAccountSchema = z.object({
  password: z.string().optional(),
  confirmUsername: z.string().trim().optional(),
})

/** Suppression définitive du compte connecté (paramètres joueur). */
router.delete('/account', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })

    const parsed = deleteAccountSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({ error: 'Données invalides' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, password: true, authProvider: true, passwordSetAt: true },
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

    const requiresPassword = user.authProvider === 'LOCAL' || user.passwordSetAt != null
    if (requiresPassword) {
      const password = parsed.data.password ?? ''
      if (!password) {
        return res.status(400).json({ error: 'Mot de passe requis pour supprimer le compte.' })
      }
      const ok = await bcrypt.compare(password, user.password)
      if (!ok) {
        return res.status(401).json({ error: 'Mot de passe incorrect.' })
      }
    } else {
      const confirm = parsed.data.confirmUsername?.trim() ?? ''
      if (confirm.toLowerCase() !== user.username.toLowerCase()) {
        return res.status(400).json({ error: 'Confirmez votre pseudo pour supprimer le compte.' })
      }
    }

    await deleteUserAccount(userId)

    const token = extractBearerToken(req.headers.authorization)
    if (token) {
      try {
        await addToBlacklist(token)
      } catch {
        /* token déjà invalide */
      }
    }

    return res.json({ ok: true })
  } catch (e) {
    if (e instanceof UserDeletionError) {
      return res.status(e.statusCode).json({ error: e.message })
    }
    console.error('[AUTH] delete account', e)
    return res.status(500).json({ error: 'Suppression impossible' })
  }
})

// POST /api/auth/logout - Invalide le token (joueur ou console admin)
router.post('/logout', async (req, res) => {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) return res.status(401).json({ error: 'Token manquant' })
  try {
    const blacklisted = await isBlacklisted(token)
    if (blacklisted) {
      return res.status(401).json({ error: 'Token révoqué' })
    }
    verifyToken(token)
    await addToBlacklist(token)
    res.json({ ok: true })
  } catch {
    res.status(401).json({ error: 'Token invalide' })
  }
})

export default router
