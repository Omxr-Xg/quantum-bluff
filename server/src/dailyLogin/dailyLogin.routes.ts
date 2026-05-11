import express from 'express'
import type { Server } from 'socket.io'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { env } from '../config/env.js'
import { emitUserRewardsUpdated } from '../rewards/userRewards.socket.js'
import {
  claimDailyLogin,
  getDailyLoginStatus,
  isDailyLoginError,
} from './dailyLogin.service.js'

/** Colonne / table absente : migrations Prisma non appliquées sur cette base. */
function prismaKnownCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const e = error as { name?: string; code?: string }
  if (e.name === 'PrismaClientKnownRequestError' && typeof e.code === 'string') {
    return e.code
  }
  return null
}

function isSchemaOutdatedPrismaError(error: unknown): boolean {
  const code = prismaKnownCode(error)
  // P2022 colonne absente, P2021 table absente, P2010 échec SQL brut (souvent même cause)
  return code === 'P2022' || code === 'P2021' || code === 'P2010'
}

const router = express.Router()

router.use(authMiddleware)

/** GET /api/daily-login/me — état du streak et récompense disponible aujourd'hui. */
router.get('/me', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const payload = await getDailyLoginStatus(userId)
    return res.json(payload)
  } catch (error) {
    if (isDailyLoginError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    if (isSchemaOutdatedPrismaError(error)) {
      console.error('[dailyLogin] GET /me schema / DB mismatch — exécuter prisma migrate deploy:', error)
      return res.status(503).json({
        error:
          'Base de données non à jour (colonnes daily login manquantes). Sur le serveur : cd server && npx prisma migrate deploy',
        code: 'SCHEMA_OUTDATED',
      })
    }
    console.error('[dailyLogin] GET /me error:', error)
    const message =
      env.isDevelopment && error instanceof Error ? error.message : 'Erreur serveur'
    return res.status(500).json({ error: message })
  }
})

/** POST /api/daily-login/claim — réclame la récompense du jour (si pas encore prise). */
router.post('/claim', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const payload = await claimDailyLogin(userId)
    const io = req.app.get('io') as Server | undefined
    if (io) {
      emitUserRewardsUpdated(io, userId, { chips: payload.chips, source: 'daily_login' })
    }
    return res.json({ success: true, ...payload })
  } catch (error) {
    if (isDailyLoginError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    if (isSchemaOutdatedPrismaError(error)) {
      console.error('[dailyLogin] POST /claim schema / DB mismatch — exécuter prisma migrate deploy:', error)
      return res.status(503).json({
        error:
          'Base de données non à jour (colonnes daily login manquantes). Sur le serveur : cd server && npx prisma migrate deploy',
        code: 'SCHEMA_OUTDATED',
      })
    }
    console.error('[dailyLogin] POST /claim error:', error)
    const message =
      env.isDevelopment && error instanceof Error ? error.message : 'Erreur serveur'
    return res.status(500).json({ error: message })
  }
})

export default router
