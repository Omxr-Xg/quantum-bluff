import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import sanitizeHtml from 'sanitize-html'
import { prisma } from '../config/database.js'
import { registerSchema, loginSchema } from '../validation/auth.validation.js'
import rateLimit from 'express-rate-limit'
import { logSuspiciousAction } from '../utils/securityLogger.js'

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
        password: hashedPassword,
        stats: { create: {} }
      },
      include: { stats: true }
    })

    const token = generateToken(user.id)

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        chips: user.chips,
        level: user.level,
        stats: user.stats
      }
    })

  } catch (error) {
    console.error(error)
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
      include: { stats: true }
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
        stats: user.stats
      }
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Erreur serveur' })
  }

})

export default router