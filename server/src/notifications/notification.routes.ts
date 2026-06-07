import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notification.service.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const unreadOnly = req.query.unread === '1'
    const payload = await listNotifications(userId, { unreadOnly })
    return res.json(payload)
  } catch (err) {
    console.error('[notifications] GET /', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const ok = await markNotificationRead(userId, req.params.id)
    if (!ok) return res.status(404).json({ error: 'Notification introuvable' })
    return res.json({ ok: true })
  } catch (err) {
    console.error('[notifications] PATCH read', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/read-all', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const count = await markAllNotificationsRead(userId)
    return res.json({ ok: true, count })
  } catch (err) {
    console.error('[notifications] POST read-all', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
