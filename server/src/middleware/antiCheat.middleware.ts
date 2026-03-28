import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { AntiCheatService } from '../services/antiCheat.service.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const antiCheatMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Extraction du token (Header ou Cookies)
    const authHeader = req.headers.authorization;
    
    // 👇 ICI : On utilise directement req.cookies, sans aucun "as any" !
    const token = (authHeader && authHeader.startsWith('Bearer ')) 
      ? authHeader.split(' ')[1] 
      : req.cookies?.token;

    let userId: string | undefined;

    // 2. Décodage silencieux du token
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id?: string, userId?: string };
        userId = decoded.id || decoded.userId; 
      } catch { 
        // Token invalide : on ignore ici
      }
    }
    
    // Si aucun utilisateur n'est identifié (visiteur ou route publique), on laisse passer
    if (!userId) return next(); 

    // 3. Vérification du statut de bannissement
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return next();

    if (user.bannedUntil && user.bannedUntil > new Date()) {
      return res.status(403).json({ 
          error: `Votre compte a été suspendu pour activités suspectes (Multi-compte ou Bot). Fin de la sanction : ${user.bannedUntil.toLocaleString('fr-FR')}` 
      });
    }

    // 4. Récupération de l'IP du joueur
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (Array.isArray(ip)) ip = ip[0];

    // 5. Analyse multi-comptes en arrière-plan (ne bloque pas le temps de réponse)
    if (ip !== 'unknown') {
      AntiCheatService.logIpAndCheckMultiAccount(userId, ip).catch(console.error);
    }

    next();
  } catch (error) {
    console.error("[AntiCheat Middleware Error]", error);
    next(); 
  }
};