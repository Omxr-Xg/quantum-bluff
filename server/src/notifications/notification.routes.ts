import express from 'express'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notification.service.js'
import {
  acceptCosmeticGift,
  CosmeticGiftError,
  declineCosmeticGift,
  getCosmeticGiftOfferDetail,
} from '../shop/cosmeticGift.service.js'

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

router.get('/cosmetic-gifts/:offerId', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const detail = await getCosmeticGiftOfferDetail(userId, req.params.offerId)
    return res.json(detail)
  } catch (e) {
    if (e instanceof CosmeticGiftError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code })
    }
    console.error('[notifications] cosmetic-gift detail', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

const acceptGiftBody = z.object({
  apply: z.boolean().optional().default(true),
})

router.post('/cosmetic-gifts/:offerId/accept', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const parsed = acceptGiftBody.safeParse(req.body ?? {})
    const apply = parsed.success ? parsed.data.apply : true
    const result = await acceptCosmeticGift(userId, req.params.offerId, apply)
    return res.json(result)
  } catch (e) {
    if (e instanceof CosmeticGiftError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code })
    }
    console.error('[notifications] cosmetic-gift accept', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/cosmetic-gifts/:offerId/decline', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const result = await declineCosmeticGift(userId, req.params.offerId)
    return res.json(result)
  } catch (e) {
    if (e instanceof CosmeticGiftError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code })
    }
    console.error('[notifications] cosmetic-gift decline', e)
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
