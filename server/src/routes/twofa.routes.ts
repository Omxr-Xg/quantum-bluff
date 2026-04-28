import express from 'express';
import { prisma } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { generateTotpSecret, verifyTotpToken, getQRCodeDataUrl } from '../auth/totp.service.js';

const router = express.Router();

// POST /api/auth/2fa/enable - Génère un secret TOTP et retourne QR code (appelé avant vérification)
router.post('/enable', authMiddleware, async (req, res) => {
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
router.post('/verify', authMiddleware, async (req, res) => {
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

    const secret = typeof req.body?.secret === 'string' ? req.body.secret : user.totpSecret;
    if (!secret) return res.status(400).json({ error: 'Pas de secret. Appelez /enable d\'abord.' });

    if (!verifyTotpToken(secret, code)) {
      return res.status(400).json({ error: 'Code incorrect' });
    }

    if (!user.totpSecret) {
      await prisma.user.update({
        where: { id: userId },
        data: { totpSecret: secret },
        select: { id: true },
      });
    }

    res.json({ ok: true, message: '2FA activé' });
  } catch (err) {
    console.error('[2FA] verify error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/2fa/disable - Désactive le 2FA (requiert le code actuel)
router.post('/disable', authMiddleware, async (req, res) => {
  try {
    const userId = (req as express.Request & { userId?: string }).userId;
    const code = typeof req.body?.code === 'string' ? req.body.code.replace(/\s/g, '') : '';
    if (!userId) return res.status(401).json({ error: 'Non authentifié' });
    if (!code || code.length !== 6) return res.status(400).json({ error: 'Code invalide' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, totpSecret: true },
    });
    if (!user || !user.totpSecret) return res.status(400).json({ error: '2FA non activé' });

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
