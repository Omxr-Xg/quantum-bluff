import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AntiCheatService } from '../services/antiCheat.service.js';
import { rootLogger } from '../observability/index.js';
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js';
import { isBlacklisted } from '../auth/tokenBlacklist.js';

export const antiCheatMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Uniquement via le Header Authorization (plus de cookies non parsés)
    const token = extractBearerToken(req.headers.authorization) ?? undefined;

    let userId: string | undefined;

    if (token) {
      try {
        if (!(await isBlacklisted(token))) {
          const decoded = verifyToken(token)
          userId = decoded.role === 'admin' ? undefined : decoded.userId
        }
      } catch {
        // Token invalide : on ignore silencieusement
      }
    }

    if (!userId) return next()

    // Cuid / UUID : évite findUnique avec chaîne vide ou valeur invalide
    if (userId.length < 8) return next()

    // 2. Vérification du statut de bannissement (ne doit pas casser la route si la DB est en retard sur les migrations)
    let bannedUntil: Date | null = null
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { bannedUntil: true },
      })
      if (!user) return next()
      bannedUntil = user.bannedUntil
    } catch (err) {
      rootLogger.error({
        msg: 'anticheat_ban_lookup_failed',
        requestId: req.requestId,
        detail: err instanceof Error ? err.message : String(err),
      })
      return next()
    }

    if (bannedUntil && bannedUntil > new Date()) {
      return res.status(403).json({
        error: `Compte suspendu jusqu'au ${bannedUntil.toLocaleString('fr-FR')}.`,
      })
    }

    // 3. Récupération IP
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (Array.isArray(ip)) ip = ip[0];

    // 4. Journal IP en arrière-plan (pas de sanction multi-compte sur même IP)
    AntiCheatService.logLastIp(userId, ip).catch((err) => {
      rootLogger.error({ msg: 'anticheat_service_error', detail: err });
    });

    next();
  } catch (error) {
    rootLogger.error({ msg: 'anticheat_middleware_error', detail: error });
    next();
  }
};
