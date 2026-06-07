import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  getUserLoadout,
  isShopError,
  listCosmetics,
  purchaseCosmetic,
  updateLoadout,
} from './shop.service.js'

const router = express.Router()
router.use(authMiddleware)

router.get('/cosmetics', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const items = await listCosmetics(userId)
    return res.json({ items })
  } catch (err) {
    console.error('[shop] GET /cosmetics', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/cosmetics/:id/purchase', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const result = await purchaseCosmetic(userId, req.params.id)
    return res.json({ ok: true, ...result })
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] POST /cosmetics/:id/purchase', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.patch('/loadout', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const body = req.body ?? {}
    const loadout = await updateLoadout(userId, {
      bannerId: body.bannerId ?? body.equippedBannerId,
      frameId: body.frameId ?? body.equippedFrameId,
      titleId: body.titleId ?? body.equippedTitleId,
    })
    return res.json(loadout)
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] PATCH /loadout', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/loadout', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const loadout = await getUserLoadout(userId)
    return res.json(loadout)
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] GET /loadout', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
