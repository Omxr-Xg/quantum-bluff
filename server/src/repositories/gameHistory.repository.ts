import { prisma } from '../config/database.js';

export class GameHistoryRepository {
  async create(data: { winnerId: string; tableId: string; gameId: string; board: string[]; pot: number; }) {
    return prisma.gameHistory.create({ data, include: { winner: true } });
  }
  async findByUserId(userId: string) {
    return prisma.gameHistory.findMany({ where: { winnerId: userId }, include: { winner: true }, orderBy: { createdAt: 'desc' } });
  }
}
export const gameHistoryRepository = new GameHistoryRepository();
