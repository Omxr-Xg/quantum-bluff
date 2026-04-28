import { prisma } from '../config/database.js';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        chips: true,
        level: true,
        experience: true,
        stats: true,
        histories: true,
      },
    });
  }
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        chips: true,
        level: true,
        experience: true,
      },
    });
  }
  async create(data: { username: string; email: string; password: string }) {
    return prisma.user.create({ data: { ...data, stats: { create: {} } }, include: { stats: true } });
  }
  async updateChips(id: string, chips: number) {
    return prisma.user.update({
      where: { id },
      data: { chips },
      select: { id: true, chips: true },
    });
  }
  async getUserStats(id: string) {
    return prisma.userStats.findUnique({ where: { userId: id } });
  }
}
export const userRepository = new UserRepository();
