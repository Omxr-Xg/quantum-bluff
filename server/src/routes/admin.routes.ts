import { Router } from 'express'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/index.js'
import { requireAdminAccess } from '../middleware/admin.middleware.js'

const router = Router()

const requireAdmin = requireAdminAccess({
  routeName: 'admin_cheaters',
})

router.get('/cheaters', requireAdmin, async (_req, res) => {
  try {
    const cheaters = await prisma.user.findMany({
      where: {
        OR: [
          { antiCheatAlerts: { gt: 0 } },
          { bannedUntil: { not: null } },
        ],
      },
      select: {
        id: true,
        username: true,
        antiCheatAlerts: true,
        bannedUntil: true,
        lastIp: true,
      },
      orderBy: { antiCheatAlerts: 'desc' },
    })

    return res.json(cheaters)
  } catch (error) {
    rootLogger.error({
      msg: 'admin_cheaters_fetch_error',
      detail: error instanceof Error ? error.message : String(error),
    })

    return res.status(500).json({
      error: 'Erreur lors de la récupération des données.',
    })
  }
})

export default router