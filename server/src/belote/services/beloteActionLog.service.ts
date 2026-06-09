import type { BeloteAction, BeloteLastAction } from '../../logic/belote/types.js'
import { appendActionLog, clearActionLog } from '../../config/redis.config.js'

const appendedVersionByGame = new Map<string, number>()

export function serializeBeloteActionLogLine(entry: BeloteLastAction): string {
  return [
    entry.phase,
    entry.playerName,
    entry.action,
    entry.value ?? '',
    entry.trump ?? '',
    entry.card?.suit ?? '',
    entry.card?.rank ?? '',
  ].join('|')
}

export function parseBeloteActionLogLine(line: string): {
  phase: string
  playerName: string
  action: string
  value?: number
  trump?: string
  cardSuit?: string
  cardRank?: string
} | null {
  const parts = line.split('|')
  if (parts.length < 3) return null
  const [phase, playerName, action, valueRaw, trump, cardSuit, cardRank] = parts
  const value = valueRaw ? Number(valueRaw) : undefined
  return {
    phase,
    playerName,
    action,
    value: Number.isFinite(value) ? value : undefined,
    trump: trump || undefined,
    cardSuit: cardSuit || undefined,
    cardRank: cardRank || undefined,
  }
}

export function beloteActionLogKey(action: BeloteAction): Pick<
  BeloteLastAction,
  'action' | 'value' | 'trump' | 'card'
> {
  switch (action.type) {
    case 'BID':
      return { action: 'BID', value: action.value, trump: action.trump }
    case 'CHOOSE_TRUMP':
      return { action: 'CHOOSE_TRUMP', trump: action.trump }
    case 'PLAY_CARD':
      return { action: 'PLAY_CARD', card: action.card }
    default:
      return { action: action.type }
  }
}

export async function journalBeloteActionLog(
  gameId: string,
  dealLogId: string | undefined,
  entry: BeloteLastAction | undefined,
): Promise<void> {
  if (!entry || !dealLogId) return
  const prev = appendedVersionByGame.get(gameId) ?? 0
  if (entry.actionVersion <= prev) return
  appendedVersionByGame.set(gameId, entry.actionVersion)
  await appendActionLog(gameId, dealLogId, serializeBeloteActionLogLine(entry))
}

export async function clearBeloteDealActionLog(
  gameId: string,
  dealLogId: string | undefined,
): Promise<void> {
  if (!dealLogId) return
  appendedVersionByGame.delete(gameId)
  await clearActionLog(gameId, dealLogId)
}
