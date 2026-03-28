import { prisma } from '../config/database.js';

export class AntiCheatService {
  // 1. Détection Multi-comptes (basée sur l'IP)
  static async logIpAndCheckMultiAccount(userId: string, ip: string) {

    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
      return; // On ignore l'analyse si on est en développement local
    }
    // On met à jour la dernière IP connue du joueur
    await prisma.user.update({ 
        where: { id: userId }, 
        data: { lastIp: ip } 
    });

    // On cherche si d'autres joueurs utilisent exactement la même IP
    const multiAccounts = await prisma.user.findMany({
      where: { 
          lastIp: ip, 
          id: { not: userId } 
      }
    });

    // S'il y en a, on considère que c'est du multi-compte
    if (multiAccounts.length > 0) {
      await this.addAlert(userId);
    }
  }

  // 2. Détection de Bot (Temps de réponse < 200ms)
  static async checkBotAction(userId: string, actionTimeMs: number) {
    if (actionTimeMs < 200) {
      await this.addAlert(userId);
    }
  }

  // 3. Gestion des alertes et Sanction automatique
  private static async addAlert(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { antiCheatAlerts: { increment: 1 } }
    });
    console.log(`🚨 [AntiCheat] Alerte ajoutée pour ${userId} ! (Total: ${user.antiCheatAlerts}/5)`);
    // Si le joueur a 5 alertes ou plus, on le ban automatiquement pour 24h
    if (user.antiCheatAlerts >= 5) {
      const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24 heures
      await prisma.user.update({
        where: { id: userId },
        data: { bannedUntil }
      });
      console.warn(`[ANTI-CHEAT] Utilisateur ${userId} banni automatiquement pour 24h.`);
    }
  }
}