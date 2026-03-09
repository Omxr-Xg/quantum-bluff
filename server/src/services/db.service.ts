import { prisma } from '../config/database.js';

export const dbService = {
  async checkConnection() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection error:', error);
      return false;
    }
  },

  async getStats() {
    const userCount = await prisma.user.count();
    const gameCount = await prisma.gameHistory.count();
    
    return {
      userCount,
      gameCount,
      timestamp: new Date()
    };
  }
};
