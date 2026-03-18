import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sanitizeHtml from 'sanitize-html'
import { prisma } from '../config/database.js'
import { registerSchema, loginSchema } from '../validation/auth.validation.js'
import rateLimit from 'express-rate-limit'
import { logSuspiciousAction } from '../utils/securityLogger.js'
import { authMiddleware } from '../middleware/auth.middleware.js'

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

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'quantum_bluff_secret'
const TOKEN_EXPIRATION = '7d'

function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })
}

// REGISTER
router.post('/register', registerLimiter, async (req, res) => {

  const parsed = registerSchema.safeParse(req.body)

  if (!parsed.success) {
    return res.status(400).json({ 
      error: parsed.error.issues.map(issue => issue.message).join(', ') 
    })
  }

  let { email, password, username } = parsed.data

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

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword
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

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: user.chips,
        level: user.level,
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

    const token = generateToken(user.id)

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: user.chips,
        level: user.level,
        playerStats: user.playerStats // ✅ Corrigé ici
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

export default router