import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sanitizeHtml from 'sanitize-html'
import { prisma } from '../config/database.js'
import { registerSchema, loginSchema, resetPasswordSchema } from '../validation/auth.validation.js'
import { normalizeSecretAnswer } from '../utils/secretAnswer.js'
import rateLimit from 'express-rate-limit'
import { logSuspiciousAction } from '../utils/securityLogger.js'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { addToBlacklist } from '../auth/tokenBlacklist.js'
import { verifyTotpToken } from '../auth/totp.service.js'
import { getGamificationBundle } from '../logic/gamification.js'

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
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
  max: 5,
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

const JWT_SECRET = process.env.JWT_SECRET || 'quantum_bluff_secret'
const TOKEN_EXPIRATION = '7d'

function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })
}

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

    const token = generateToken(user.id)
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
        playerStats: playerStats ?? null
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
      include: { playerStats: true } // ✅ Corrigé ici
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

    const token = generateToken(user.id)
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
        playerStats: user.playerStats
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

// POST /api/auth/logout - Invalide le token côté serveur (blacklist)
router.post('/logout', authMiddleware, async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Token manquant' })
  const token = authHeader.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token manquant' })
  try {
    await addToBlacklist(token)
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router