import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { crashService } from '../crash/crash.service.js'

const router = express.Router()

function sendServiceError(res: express.Response, e: unknown) {
  const err = e as Error & { code?: string; status?: number; payload?: Record<string, unknown> }
  if (err.payload && err.status) {
    return res.status(err.status).json(err.payload)
  }
  const code = err.code ?? 'SERVER_ERROR'
  const status = err.status ?? (code === 'INSUFFICIENT_CHIPS' ? 409 : code === 'USER_NOT_FOUND' ? 404 : 400)
  return res.status(status).json({ error: code, code })
}

router.get('/active', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    return res.json(crashService.getActive(userId))
  } catch (e) {
    console.error('[crash/active]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/start', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const result = await crashService.start(userId, req.body ?? {})
    return res.json(result)
  } catch (e) {
    if ((e as Error).message === 'ACTIVE_CRASH_ROUND' || (e as { code?: string }).code) {
      return sendServiceError(res, e)
    }
    console.error('[crash/start]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/cashout', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const roundId = String(req.body?.roundId ?? '').trim()
    const result = await crashService.cashout(userId, roundId, req.body?.actionId)
    return res.json(result)
  } catch (e) {
    if ((e as { code?: string }).code) {
      return sendServiceError(res, e)
    }
    console.error('[crash/cashout]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

/** Tick / settle : état autoritaire de la manche + multiplicateur courant. */
router.post('/settle', authMiddleware, async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const roundId = String(req.body?.roundId ?? '').trim()
    const result = await crashService.tick(userId, roundId)
    return res.json(result)
  } catch (e) {
    if ((e as { code?: string }).code) {
      return sendServiceError(res, e)
    }
    console.error('[crash/settle]', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
