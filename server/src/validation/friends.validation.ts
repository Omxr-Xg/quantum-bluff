import { z } from "zod";

export const searchUserSchema = z.object({
  query: z.string().min(2).max(20)
});

export const friendRequestSchema = z.object({
  receiverUsername: z.string().min(3).max(20)
});

export const updateRequestSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"])
});