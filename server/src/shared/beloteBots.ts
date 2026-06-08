import { randomUUID } from 'crypto'

export const BELOTE_BOT_PREFIX = 'qb-belote-bot-'

const BOT_NAMES = ['Léa', 'Nora', 'Samir', 'Inès', 'Yanis', 'Clara', 'Mehdi', 'Zoé'] as const

export type BeloteBotDifficulty = 'EASY' | 'NORMAL' | 'EXPERT'

export function isBeloteBotId(id: string): boolean {
  return id.startsWith(BELOTE_BOT_PREFIX)
}

export function makeBeloteBotId(): string {
  return `${BELOTE_BOT_PREFIX}${randomUUID().slice(0, 8)}`
}

export function beloteBotDisplayName(nameIndex: number): string {
  const name = BOT_NAMES[nameIndex % BOT_NAMES.length] ?? 'Bot'
  return `QB Bot ${name}`
}

export function normalizeBeloteBotDifficulty(raw: unknown): BeloteBotDifficulty {
  const v = String(raw ?? 'NORMAL').toUpperCase()
  if (v === 'EASY' || v === 'EXPERT') return v
  return 'NORMAL'
}
