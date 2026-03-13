import { z } from "zod";

export const gameActionSchema = z.object({
  playerId: z.string().uuid(),
  action: z.enum(["FOLD", "CALL", "RAISE", "CHECK"]),
  amount: z.number().optional()
});