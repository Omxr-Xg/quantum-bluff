import express from 'express'
import type { Server } from 'socket.io'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  applyReferralCode,
  getReferralMe,
  isReferralError,
  listReferralInvites,
} from './referral.service.js'

const router = express.Router()
router.use(authMiddleware)

  router.get('/me', async (req, res) => {
    try {
      const userId = req.userId
      if (!userId) return res.status(401).json({ error: 'Non authentifié' })
      const publicBaseUrl = typeof req.headers.origin === 'string' ? req.headers.origin : undefined
      const payload = await getReferralMe(userId, publicBaseUrl)
      return res.json(payload)
    } catch (err) {
      if (isReferralError(err)) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code })
      }
      console.error('[referral] GET /me', err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  })

  router.get('/invites', async (req, res) => {
    try {
      const userId = req.userId
      if (!userId) return res.status(401).json({ error: 'Non authentifié' })
      const invites = await listReferralInvites(userId)
      return res.json({ invites })
    } catch (err) {
      console.error('[referral] GET /invites', err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  })

  router.post('/apply', async (req, res) => {
    try {
      const userId = req.userId
      if (!userId) return res.status(401).json({ error: 'Non authentifié' })
      const code = typeof req.body?.code === 'string' ? req.body.code : ''
      const io = req.app.get('io') as Server | undefined
      await applyReferralCode(userId, code, io)
      return res.json({ ok: true })
    } catch (err) {
      if (isReferralError(err)) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code })
      }
      console.error('[referral] POST /apply', err)
      return res.status(500).json({ error: 'Erreur serveur' })
    }
  })

export default router
