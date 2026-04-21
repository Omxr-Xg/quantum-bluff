import { z } from 'zod'

export const playerReportReasonSchema = z.enum([
  'INAPPROPRIATE_LANGUAGE',
  'CHEATING',
  'HARASSMENT',
  'SPAM',
  'OTHER',
])

export const playerReportCreateSchema = z.object({
  reportedUserId: z.string().uuid(),
  gameId: z.string().max(128).optional().nullable(),
  reason: playerReportReasonSchema,
  detail: z.string().max(2000).optional().nullable(),
})
