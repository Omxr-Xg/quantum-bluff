import { prisma } from '../config/database.js';
import { rootLogger } from '../observability/logger.js';

export class AntiCheatService {
  /** Journalise la dernière IP connue — sans alerte multi-compte (foyer, NAT, campus). */
  static async logLastIp(userId: string, ip: string) {
    if (
      ip === '::1' ||
      ip === '127.0.0.1' ||
      ip.includes('localhost') ||
      ip === 'unknown'
    ) {
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { lastIp: ip },
      select: { id: true },
    });
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
