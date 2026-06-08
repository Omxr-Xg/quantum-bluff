import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { prisma } from '../config/database.js'
import { emitWaitingRoomUpdated } from '../routes/waitingRoom.routes.js'
import { getGameIo } from '../sockets/gameIo.registry.js'
import { listAvatarPresets, purchaseAvatarPreset } from './avatar.service.js'
import {
  getTablePreferences,
  listTableThemeShop,
  purchaseTableUnlock,
  saveCustomTableBackground,
  updateTablePreferences,
} from './tableTheme.service.js'
import { ingestAvatarToBuffer } from '../utils/userAvatarIngest.js'
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
    const memberships = await prisma.roomPlayer.findMany({
      where: { userId },
      select: { roomId: true, room: { select: { status: true } } },
    })
    const io = getGameIo()
    for (const membership of memberships) {
      if (membership.room.status === 'WAITING') {
        void emitWaitingRoomUpdated(membership.roomId, io).catch(() => {})
      }
    }
    return res.json(loadout)
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] PATCH /loadout', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/avatars', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const items = await listAvatarPresets(userId)
    return res.json({ items })
  } catch (err) {
    console.error('[shop] GET /avatars', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/avatars/:id/purchase', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const result = await purchaseAvatarPreset(userId, req.params.id)
    return res.json({ ok: true, ...result })
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] POST /avatars/:id/purchase', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/table-themes', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const shop = await listTableThemeShop(userId)
    const prefs = await getTablePreferences(userId)
    return res.json({ ...shop, preferences: prefs })
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] GET /table-themes', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/table-themes/:id/purchase', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const result = await purchaseTableUnlock(userId, req.params.id)
    return res.json({ ok: true, ...result })
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] POST /table-themes/:id/purchase', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.patch('/table-preferences', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const body = req.body ?? {}
    const preferences = await updateTablePreferences(userId, {
      feltThemeId: body.feltThemeId,
      feltCustomColor: body.feltCustomColor,
      feltBackgroundId: body.feltBackgroundId,
    })
    return res.json({ preferences })
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] PATCH /table-preferences', err)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/table-background', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const imageData = typeof req.body?.imageData === 'string' ? req.body.imageData.trim() : ''
    if (!imageData) {
      return res.status(400).json({ error: 'Image requise' })
    }
    const ingested = await ingestAvatarToBuffer(imageData)
    if (!ingested) {
      return res.status(400).json({ error: 'Impossible d’enregistrer cette image (format ou taille).' })
    }
    const preferences = await saveCustomTableBackground(userId, ingested.buffer, ingested.mime)
    return res.json({ preferences })
  } catch (err) {
    if (isShopError(err)) {
      return res.status(err.statusCode).json({ error: err.message, code: err.code })
    }
    console.error('[shop] POST /table-background', err)
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
