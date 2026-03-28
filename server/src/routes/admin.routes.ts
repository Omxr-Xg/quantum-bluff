import { Router } from 'express';
import { prisma } from '../config/database.js';

const router = Router();

// Route : GET /api/admin/cheaters
// Permet de lister tous les joueurs suspects ou bannis
router.get('/cheaters', async (req, res) => {
  try {
    // Note : Idéalement, il faudrait ajouter un middleware ici pour vérifier 
    // que l'utilisateur qui fait la requête a bien le rôle "ADMIN".
    
    const suspiciousUsers = await prisma.user.findMany({
      where: {
        OR: [
          { antiCheatAlerts: { gt: 0 } }, // Ceux qui ont au moins 1 alerte
          { bannedUntil: { not: null } }  // Ceux qui sont bannis
        ]
      },
      select: {
        id: true,
        username: true,
        lastIp: true,
        antiCheatAlerts: true,
        bannedUntil: true
      },
      orderBy: {
        antiCheatAlerts: 'desc' // Les pires tricheurs en premier
      }
    });

    res.json(suspiciousUsers);
  } catch (error) {
    console.error("[Admin API Error]", error);
    res.status(500).json({ error: "Erreur lors de la récupération des données anti-triche" });
  }
});

export default router;