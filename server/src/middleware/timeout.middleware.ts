import { Request, Response, NextFunction } from 'express';

const TIMEOUT_MS = 5000;

export const timeoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(TIMEOUT_MS, () => {
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