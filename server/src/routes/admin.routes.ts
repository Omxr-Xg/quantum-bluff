import { Router, type RequestHandler } from 'express';
import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/index.js';

const router = Router();

/** En production, `ADMIN_SECRET_TOKEN` est obligatoire (pas de secret par défaut dans le binaire). */
const requireAdmin: RequestHandler = (req, res, next) => {
  const adminSecret =
    process.env.NODE_ENV === 'production'
      ? process.env.ADMIN_SECRET_TOKEN
      : process.env.ADMIN_SECRET_TOKEN ?? 'super_admin_secret_dev';

  if (process.env.NODE_ENV === 'production' && !adminSecret) {
    rootLogger.error({ msg: 'admin_secret_not_configured' });
    res.status(503).json({
      error: 'Service administrateur indisponible (variable ADMIN_SECRET_TOKEN non définie).',
    });
    return;
  }

  const provided = req.headers['x-admin-token'];
  const token = Array.isArray(provided) ? provided[0] : provided;

  if (!token || !adminSecret || token !== adminSecret) {
    rootLogger.warn({ msg: 'unauthorized_admin_access', ip: req.ip });
    res.status(403).json({ error: 'Accès interdit : privilèges administrateur requis.' });
    return;
  }

  next();
};

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
    });
    res.json(cheaters);
  } catch (error) {
    rootLogger.error({ msg: 'admin_cheaters_fetch_error', detail: error });
    res.status(500).json({ error: 'Erreur lors de la récupération des données.' });
  }
});

export default router;
