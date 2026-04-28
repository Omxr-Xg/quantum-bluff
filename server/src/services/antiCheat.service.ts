import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/logger.js';

/** Nombre minimum d'autres comptes sur la même IP pour lever une alerte multi-compte (réduit les faux positifs NAT / 4G / foyer). */
const MULTI_ACCOUNT_MIN_OTHERS_ON_IP = 2;

export class AntiCheatService {
  static async logIpAndCheckMultiAccount(userId: string, ip: string) {
    if (
      ip === '::1' ||
      ip === '127.0.0.1' ||
      ip.includes('localhost') ||
      ip === '192.168.100.50'  // Proxy université - tous les users ont cette IP
    ) {
      return;
   }

    await prisma.user.update({
      where: { id: userId },
      data: { lastIp: ip },
      select: { id: true },
    });

    const othersOnSameIp = await prisma.user.findMany({
      where: {
        lastIp: ip,
        id: { not: userId },
      },
      select: { id: true },
    });

    if (othersOnSameIp.length >= MULTI_ACCOUNT_MIN_OTHERS_ON_IP) {
      await this.addAlert(userId);
    }
  }

  static async checkBotAction(userId: string, actionTimeMs: number) {
    if (actionTimeMs < 200) {
      await this.addAlert(userId);
    }
  }

  private static async addAlert(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { antiCheatAlerts: { increment: 1 } },
      select: { antiCheatAlerts: true },
    });
    rootLogger.warn({
      msg: 'anticheat_alert_incremented',
      userId,
      totalAlerts: user.antiCheatAlerts,
    });
    if (user.antiCheatAlerts >= 5) {
      const bannedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await prisma.user.update({
        where: { id: userId },
        data: { bannedUntil },
        select: { id: true },
      });
      rootLogger.warn({
        msg: 'anticheat_auto_ban',
        userId,
        bannedUntil: bannedUntil.toISOString(),
      });
    }
  }
}
