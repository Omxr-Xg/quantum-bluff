import express from 'express'
import bcrypt from 'bcryptjs'
import sanitizeHtml from 'sanitize-html'
import { z } from 'zod'
import { pgPool, prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { registerSchema, loginSchema, resetPasswordSchema } from '../validation/auth.validation.js'
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

/** Connexion : 5 requêtes / 10 min / IP. */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 5,
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

// CHECK EMAIL - Vérifie si l'email existe (pour flux login/register unifié)
router.post('/check-email', checkEmailLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  if (!email || !EMAIL_FORMAT.test(email)) {
    return res.status(400).json({ error: 'Email invalide' })
  }
  try {
    const user = await prisma.user.findUnique({ where: { email } })
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

  let { email, password, username, secretQuestionId, secretAnswer } = parsed.data

  email = sanitizeHtml(email)
  username = sanitizeHtml(username)

  try {

    const existingEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingEmail) {
      return res.status(400).json({ error: 'Email déjà utilisé' })
    }

    const existingUsername = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUsername) {
      return res.status(400).json({ error: 'Nom d’utilisateur déjà utilisé' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const secretAnswerHash = await bcrypt.hash(normalizeSecretAnswer(secretAnswer), 10)

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        secretQuestionId,
        secretAnswerHash,
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

    res.status(201).json({
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
        playerStats: playerStats ?? null,
        lobbyTutorialCompleted: user.lobbyTutorialCompletedAt != null,
        avatarUrl: clientAvatarUrlFromUser(user),
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
    const user = await prisma.user.findUnique({ where: { email } })
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
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
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
      },
    })

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    }

    const validPassword = await bcrypt.compare(password, user.password)

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
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
  newPassword: z.string().min(6).max(100).optional(),
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
router.get('/balance', authMiddleware, async (req, res) => {
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

// POST /api/auth/add-dev-money - Ajoute des jetons (validation "dev" côté serveur, pas de confiance client)
router.post('/add-dev-money', authMiddleware, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: "Bien essayé !  L'ajout d'argent gratuit est désactivé en production." })
  }

  try {
    const userId = (req as express.Request & { userId?: string }).userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const secret = typeof req.body?.secret === 'string' ? req.body.secret.trim().toLowerCase() : ''
    if (secret !== 'dev') return res.status(403).json({ error: 'Validation requise' })
    const rawAmount = typeof req.body?.amount === 'number' ? req.body.amount : Number(req.body?.amount)
    const amount = Math.min(999999, Math.max(1, Math.floor(Number(rawAmount))))
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'Montant invalide' })
    const user = await prisma.user.update({
      where: { id: userId },
      data: { chips: { increment: amount } },
      select: { chips: true }
    })
    res.json({ ok: true, chips: user.chips })
  } catch (error) {
    console.error('add-dev-money error:', error)
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
    return res.status(503).json({ error: 'Console administrateur non configurée.' })
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
