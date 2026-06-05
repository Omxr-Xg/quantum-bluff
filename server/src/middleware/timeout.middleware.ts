import { Request, Response, NextFunction } from 'express';

/** GET : lectures lobby (plus lentes sous charge). Mutations : délai court. */
const TIMEOUT_MS_GET = 12_000;
const TIMEOUT_MS_WRITE = 8_000;

export const timeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const timeoutMs = req.method === 'GET' || req.method === 'HEAD' ? TIMEOUT_MS_GET : TIMEOUT_MS_WRITE;
  req.setTimeout(timeoutMs, () => {
    if (!res.headersSent) {
      console.warn(`[TIMEOUT] La requête ${req.method} ${req.originalUrl} a mis trop de temps !`);
      
      res.status(503).json({ 
        error: 'Le serveur met trop de temps à répondre.',
        code: 'TIMEOUT',
        retryable: true 
      });
    }
  });

  next();
};