import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../config/database.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'quantum_bluff_secret'
const TOKEN_EXPIRATION = '7d'

function generateToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })
}

// REGISTER
router.post('/register', async (req, res) => {
  const { email, password, username } = req.body

  if (!email || !password || !username) {
    return res.status(400).json({ error: 'Champs manquants' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (min 6 caractères)' })
  }

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
      include: {
        stats: true
      }
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
    console.error('Erreur register:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// LOGIN
router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' })
  }

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
    console.error('Erreur login:', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router