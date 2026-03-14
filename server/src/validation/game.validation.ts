import { z } from "zod";

export const gameActionSchema = z.object({
  playerId: z.string().uuid(),
  action: z.enum(["FOLD", "CALL", "RAISE", "CHECK"]),
  amount: z.number().optional()
});

export const botActionSchema = z.object({
  gameId: z.string().min(1),
  playerId: z.string().min(1),
  action: z.enum(["FOLD", "CALL", "RAISE", "CHECK"]),
  amount: z.number().int().positive().optional()
})