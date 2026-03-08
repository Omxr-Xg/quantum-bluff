// services/db.service.ts
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export interface HandSummary {
  tableId: string;
  gameId: string;
  board: string[];
  pot: number;
  winnerId: string;
}

/**
 * Incrémente les chips d'un utilisateur (atomique)
 */
export async function creditWinner(userId: string, amount: number) {
  if (amount <= 0) throw new Error("Amount must be positive");

  return prisma.user.update({
    where: { id: userId },
    data: {
      chips: { increment: amount },
    },
  });
}

/**
 * Décrémente les chips d'un utilisateur si suffisant
 */
export async function debitPlayer(userId: string, amount: number) {
  if (amount <= 0) throw new Error("Amount must be positive");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (user.chips < amount) throw new Error("Fonds insuffisants");

  return prisma.user.update({
    where: { id: userId },
    data: {
      chips: { decrement: amount },
    },
  });
}

/**
 * Enregistre un historique de partie
 */
export async function logHand(handData: HandSummary) {
  return prisma.gameHistory.create({
    data: {
      tableId: handData.tableId,
      gameId: handData.gameId,
      board: handData.board,
      pot: handData.pot,
      winnerId: handData.winnerId,
    },
  });
}

/**
 * Ferme la connexion à la DB (tests)
 */
export async function closeDB() {
  await prisma.$disconnect();
  await pool.end();
}
