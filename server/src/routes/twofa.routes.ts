import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prisma } from '../config/database.js';
import redisClient from '../config/redis.config.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { generateTotpSecret, verifyTotpToken, getQRCodeDataUrl, protectTotpSecret } from '../auth/totp.service.js';

const router = express.Router();
const PENDING_TOTP_PREFIX = 'pending_totp:';
const PENDING_TOTP_TTL_SECONDS = 10 * 60;

const twoFaLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives 2FA. Réessaie plus tard.' },
});

async function savePendingTotpSecret(userId: string, secret: string): Promise<void> {
  await redisClient.setex(`${PENDING_TOTP_PREFIX}${userId}`, PENDING_TOTP_TTL_SECONDS, secret);
}

async function getPendingTotpSecret(userId: string): Promise<string | null> {
  return redisClient.get(`${PENDING_TOTP_PREFIX}${userId}`);
}

async function clearPendingTotpSecret(userId: string): Promise<void> {
  await redisClient.del(`${PENDING_TOTP_PREFIX}${userId}`);
}

// POST /api/auth/2fa/enable - Génère un secret TOTP et retourne QR code (appelé avant vérification)
router.post('/enable', twoFaLimiter, authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId;
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, totpSecret: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    if (user.totpSecret) return res.status(400).json({ error: '2FA déjà activé' });

    const { secret, otpauth } = generateTotpSecret(user.id, user.email);
    const qrDataUrl = await getQRCodeDataUrl(otpauth);
    await savePendingTotpSecret(user.id, secret);

    res.json({
      secret,
      qrCode: qrDataUrl,
      message: 'Scannez le QR code avec une app (Google Authenticator, Authy) puis validez avec POST /auth/2fa/verify',
    });
  } catch (err) {
    console.error('[2FA] enable error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/2fa/verify - Vérifie le code et active le 2FA
router.post('/verify', twoFaLimiter, authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId;
    const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
    if (!userId || !code || code.length !== 6) {
      return res.status(400).json({ error: 'Code invalide (6 chiffres)' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true },
    });
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const secret = user.totpSecret ?? (await getPendingTotpSecret(userId));
    if (!secret) return res.status(400).json({ error: 'Pas de secret. Appelez /enable d\'abord.' });

    if (!verifyTotpToken(secret, code)) {
      return res.status(400).json({ error: 'Code incorrect' });
    }

    if (!user.totpSecret) {
      await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: protectTotpSecret(secret) },
        select: { id: true },
      });
      await clearPendingTotpSecret(userId);
    }

    res.json({ ok: true, message: '2FA activé' });
  } catch (err) {
    console.error('[2FA] verify error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/2fa/disable - Désactive le 2FA (requiert le code actuel)
router.post('/disable', twoFaLimiter, authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId;
    const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Code invalide' });
    if (!currentPassword) return res.status(400).json({ error: 'Mot de passe actuel requis' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, totpSecret: true },
    });
    if (!user || !user.totpSecret) return res.status(400).json({ error: '2FA non activé' });

    const passwordOk = await bcrypt.compare(currentPassword, user.password);
    if (!passwordOk) return res.status(401).json({ error: 'Mot de passe actuel incorrect' });

    if (!verifyTotpToken(user.totpSecret, code)) {
      return res.status(400).json({ error: 'Code incorrect' });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { totpSecret: null },
      select: { id: true },
    });

    res.json({ ok: true, message: '2FA désactivé' });
  } catch (err) {
    console.error('[2FA] disable error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;
