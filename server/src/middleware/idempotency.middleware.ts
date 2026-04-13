import { Request, Response, NextFunction } from 'express';

const idempotencyCache = new Map<string, number>();

setInterval(() => {
  const now = Date.now();
  for (const [key, expiry] of idempotencyCache.entries()) {
    if (now > expiry) {
      idempotencyCache.delete(key);
    }
  }
}, 60000);

export const idempotencyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Règle 1 : On ne protège que les requêtes dangereuses (qui modifient la BDD ou l'argent). 
  // Les requêtes GET (ex: lire les stats) ne sont pas dangereuses en double.
  if (['GET', 'OPTIONS', 'HEAD'].includes(req.method)) {
    return next();
  }

  // Règle 2 : On lit le ticket envoyé par RTK Query
  const idempotencyKey = req.headers['x-idempotency-key'] as string;

  if (!idempotencyKey) {
    return next(); // Si pas de ticket (ex: une ancienne version de l'app), on laisse passer pour l'instant
  }

  const now = Date.now();

  // Règle 3 : Le verdict ! Si le ticket est déjà dans notre boîte depuis moins de 5 secondes...
  if (idempotencyCache.has(idempotencyKey) && now < idempotencyCache.get(idempotencyKey)!) {
    console.warn(`[IDEMPOTENCE]  Requête fantôme bloquée ! Ticket : ${idempotencyKey}`);
    
    // On renvoie un code 409 (Conflict) pour dire "C'est un doublon"
    return res.status(409).json({
      error: "Cette action est déjà en cours de traitement.",
      code: "DUPLICATE_REQUEST"
    });
  }

  // Règle 4 : Si le ticket est nouveau, on le tamponne et on le garde pendant 5 secondes (5000 ms)
  idempotencyCache.set(idempotencyKey, now + 5000);

  // Et on laisse passer la requête !
  next();
};