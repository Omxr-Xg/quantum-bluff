import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'
import * as giftCodesService from './giftCodes.service.js'

const router = express.Router()

// Middleware pour vérifier les tokens admin
const requireAdminToken = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) {
    return res.status(401).json({ error: 'Token manquant' })
  }

  try {
    const blacklisted = await isBlacklisted(token)
    if (blacklisted) {
      return res.status(401).json({ error: 'Token révoqué' })
    }

    const decoded = verifyToken(token)

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Accès administrateur requis' })
    }

    req.userId = decoded.userId
    return next()
  } catch (error: any) {
    return res.status(401).json({ error: 'Token invalide' })
  }
}

/**
 * GET /api/gift-codes/admin/list
 * Liste tous les codes cadeaux (admin only)
 */
router.get('/admin/list', requireAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const result = await giftCodesService.getAllGiftCodes(limit, offset)
    res.json(result)
  } catch (error: any) {
    console.error('Error fetching gift codes:', error)
    res.status(500).json({ error: 'Failed to fetch gift codes' })
  }
})

/**
 * POST /api/gift-codes/admin/create
 * Crée un nouveau code cadeau (admin only)
 */
router.post('/admin/create', requireAdminToken, async (req: express.Request, res: express.Response) => {
  try {
    const { code, amount, type, description, expiresAt, maxUses } = req.body

    // Validation
    if (!code || typeof code !== 'string' || !code.trim()) {
      return res.status(400).json({ error: 'Le code est requis' })
    }

    if (!amount || typeof amount !== 'number' || amount < 1) {
      return res.status(400).json({ error: 'Le montant doit être >= 1' })
    }

    if (!type || typeof type !== 'string' || !['ACHIEVEMENT', 'EVENT', 'SEASONAL', 'SPECIAL'].includes(type)) {
      return res.status(400).json({ error: 'Type invalide. Utilise: ACHIEVEMENT, EVENT, SEASONAL, SPECIAL' })
    }

    const giftCode = await giftCodesService.createGiftCode({
      code: code.trim(),
      amount,
      type,
      description: description || null,
      expiresAt: expiresAt || null,
      maxUses: maxUses ?? -1
    })

    res.status(201).json(giftCode)
  } catch (error: any) {
    console.error('Error creating gift code:', error)
    res.status(400).json({ error: error.message || 'Failed to create gift code' })
  }
})

// Appliquer authMiddleware UNIQUEMENT aux routes non-admin
router.use(authMiddleware)

/**
 * GET /api/gift-codes/available
 * Récupère les codes cadeaux disponibles pour l'utilisateur
 */
router.get('/available', async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const codes = await giftCodesService.getAvailableCodesForUser(userId)
    res.json(codes)
  } catch (error) {
    console.error('Error fetching available codes:', error)
    res.status(500).json({ error: 'Failed to fetch codes' })
  }
})

/**
 * POST /api/gift-codes/validate
 * Valide et utilise un code cadeau
 */
router.post('/validate', async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { code } = req.body
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid code' })
    }

    const result = await giftCodesService.validateAndUseCode(userId, code.trim())
    res.json(result)
  } catch (error: any) {
    console.error('Error validating code:', error)
    res.status(400).json({ error: error.message || 'Failed to validate code' })
  }
})

export default router
