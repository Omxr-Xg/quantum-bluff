import { z } from 'zod'

export const gameRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  message: z
    .string()
    .max(2000)
    .optional()
    .transform((s) => (s === undefined || s.trim() === '' ? undefined : s.trim())),
})
