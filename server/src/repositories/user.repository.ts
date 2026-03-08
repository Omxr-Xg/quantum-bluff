import { PrismaClient } from "@prisma/client";

import { PrismaClient } from '@prisma/client';

// Will be used for database operations
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const prisma = new PrismaClient();



export class UserRepository {
  static async create(data: {
    username: string;
    email: string;
    password: string;
  }) {
    return prisma.user.create({ data });
  }

  static async credit(userId: string, amount: number) {
    return prisma.user.update({
      where: { id: userId },
      data: { chips: { increment: amount } },
    });
  }

  static async debit(userId: string, amount: number) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.chips < amount) {
        throw new Error("Fonds insuffisants");
      }

      return tx.user.update({
        where: { id: userId },
        data: { chips: { decrement: amount } },
      });
    });
  }

  static async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }
}
