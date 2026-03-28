import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AntiCheatService } from '../services/antiCheat.service.js';
import jwt from 'jsonwebtoken';
import { rootLogger } from '../observability/index.js';

// Alignement sur le secret global du projet
const JWT_SECRET = process.env.JWT_SECRET || 'quantum_bluff_secret';

export const antiCheatMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Uniquement via le Header Authorization (plus de cookies non parsés)
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer ')) ? authHeader.split(' ')[1] : undefined;

    let userId: string | undefined;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id?: string, userId?: string };
        userId = decoded.id || decoded.userId; 
      } catch { 
        // Token invalide : on ignore silencieusement
      }
    }
    
    if (!userId) return next(); 

    // 2. Vérification du statut de bannissement
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { bannedUntil: true } // Optimisation DB : on ne demande que ce dont on a besoin
    });
    
    if (!user) return next();

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({ 
          error: `Compte suspendu jusqu'au ${user.bannedUntil.toLocaleString('fr-FR')}.` 
      });
    }

    // 3. Récupération IP
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (Array.isArray(ip)) ip = ip[0];

    // 4. Analyse en arrière-plan
    if (ip !== 'unknown') {
      AntiCheatService.logIpAndCheckMultiAccount(userId, ip).catch(err => {
        rootLogger.error({ msg: 'anticheat_service_error', detail: err });
      });
    }

    next();
  } catch (error) {
    rootLogger.error({ msg: 'anticheat_middleware_error', detail: error });
    next(); 
  }
};