import { z } from 'zod'

const suitSchema = z.enum(['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'])
const rankSchema = z.enum(['7', '8', '9', '10', 'J', 'Q', 'K', 'A'])

const cardSchema = z.object({
  suit: suitSchema,
  rank: rankSchema,
})

export const beloteActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PASS') }),
  z.object({ type: z.literal('TAKE') }),
  z.object({ type: z.literal('CHOOSE_TRUMP'), trump: suitSchema }),
  z.object({ type: z.literal('PLAY_CARD'), card: cardSchema }),
])

export type ParsedBeloteAction = z.infer<typeof beloteActionSchema>
