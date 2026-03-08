// server/src/repositories/user.repository.ts
import { prisma } from '../config/database';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        stats: true,
        histories: true
      }
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email }
    });
  }

  async create(data: { 
    username: string; 
    email: string; 
    password: string 
  }) {
    // Crée l'utilisateur avec ses stats par défaut
    return prisma.user.create({
      data: {
        ...data,
        stats: {
          create: {} // Crée automatiquement UserStats avec valeurs par défaut
        }
      },
      include: {
        stats: true
      }
    });
  }

  async updateChips(id: string, chips: number) {
    return prisma.user.update({
      where: { id },
      data: { chips }
    });
  }

  async recordGameHistory(data: {
    winnerId: string;
    tableId: string;
    gameId: string;
    board: string[];
    pot: number;
  }) {
    return prisma.gameHistory.create({
      data,
      include: {
        winner: true
      }
    });
  }

  async getUserStats(id: string) {
    return prisma.userStats.findUnique({
      where: { userId: id }
    });
  }
}

export const userRepository = new UserRepository();