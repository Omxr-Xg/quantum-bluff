import { Router } from 'express';
import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/index.js';

const router = Router();

// Middleware de protection Admin
const requireAdmin = (req: any, res: any, next: any) => {
  const adminSecret = process.env.ADMIN_SECRET_TOKEN || 'super_admin_secret_dev';
  const providedToken = req.headers['x-admin-token'];

  if (!providedToken || providedToken !== adminSecret) {
    rootLogger.warn({ msg: 'unauthorized_admin_access', ip: req.ip });
    return res.status(403).json({ error: "Accès interdit : Privilèges administrateur requis." });
  }
  next();
};

router.get('/cheaters', requireAdmin, async (req, res) => {
  try {
    const cheaters = await prisma.user.findMany({
      where: { antiCheatAlerts: { gt: 0 } },
      select: {
        id: true,
        username: true,
        antiCheatAlerts: true,
        bannedUntil: true,
        lastIp: true
      },
      orderBy: { antiCheatAlerts: 'desc' }
    });
    res.json(cheaters);
  } catch (error) {
    rootLogger.error({ msg: 'admin_cheaters_fetch_error', detail: error });
    res.status(500).json({ error: "Erreur lors de la récupération des données." });
  }
});

export default router;