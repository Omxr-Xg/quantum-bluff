import express from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { prisma } from '../config/database.js'

const router = express.Router()

router.use(authMiddleware)

/**
 * GET /api/wallet/history
 * Récupère l'historique des transactions de l'utilisateur
 */
router.get('/history', async (req: express.Request, res: express.Response) => {
  try {
    const userId = req.userId
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100)
    const offset = parseInt(req.query.offset as string) || 0

    const entries = await prisma.walletLedgerEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        amount: true,
        reason: true,
        balanceBefore: true,
        balanceAfter: true,
        createdAt: true
      }
    })

    const total = await prisma.walletLedgerEntry.count({
      where: { userId }
    })

    res.json({
      entries,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching wallet history:', error)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

export default router
