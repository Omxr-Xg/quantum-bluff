import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface HandSummary {
  tableId: string;
  gameId: string;
  board: string[];
  pot: number;
  winnerId: string;
}

export class GameHistoryRepository {
  static async logHand(hand: HandSummary) {
    return prisma.gameHistory.create({ data: hand });
  }
}
