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
    return prisma.user.create({
      data: {
        ...data,
        stats: {
          create: {}
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

  async getUserStats(id: string) {
    return prisma.userStats.findUnique({
      where: { userId: id }
    });
  }
}

export const userRepository = new UserRepository();
