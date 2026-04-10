import type { Request, Response, NextFunction } from 'express'
import { extractBearerToken, verifyToken } from '../auth/jwt.service.js'
import { isBlacklisted } from '../auth/tokenBlacklist.js'

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  console.log("-----------------------------------------");
  console.log("[AUTH MIDDLEWARE]  Analyse d'une requête entrante...");
  console.log("[AUTH MIDDLEWARE] Header reçu :", req.headers.authorization);
  
  const token = extractBearerToken(req.headers.authorization)

  if (!token) {
    console.log("[AUTH MIDDLEWARE]  REJETÉ : Aucun token extrait du header.");
    return res.status(401).json({ error: 'Token manquant ou mal formé' })
  }

  try {
    const blacklisted = await isBlacklisted(token);
    if (blacklisted) {
      console.log("[AUTH MIDDLEWARE]  REJETÉ : Ce token est sur la liste noire (déconnecté).");
      return res.status(401).json({ error: 'Token révoqué' })
    }

    console.log("[AUTH MIDDLEWARE]  Vérification de la signature JWT...");
    const decoded = verifyToken(token)
    
    console.log(`[AUTH MIDDLEWARE]  SUCCÈS ! Token valide pour l'utilisateur ID: ${decoded.userId}`);
    req.userId = decoded.userId

    return next()
  } catch (error: any) {
    // C'EST ICI QUE LE SECRET VA ÊTRE RÉVÉLÉ :
    console.log("[AUTH MIDDLEWARE]  CRASH DE VÉRIFICATION JWT :", error.message);
    return res.status(401).json({ error: 'Token invalide' })
  }
}