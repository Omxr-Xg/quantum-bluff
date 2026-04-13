import { intChips } from '../../utils/chips.js'
import type { PokerActionPayload } from './pokerAction.types.js'

export function normalizePokerActionPayload(
  input: Partial<PokerActionPayload>
): PokerActionPayload {
  return {
    gameId: String(input.gameId ?? '').trim(),
    handId:
      typeof input.handId === 'string' && input.handId.trim() !== ''
        ? input.handId.trim()
        : undefined,
    playerId: String(input.playerId ?? '').trim(),
    actionType: String(input.actionType ?? '').toUpperCase() as PokerActionPayload['actionType'],
    amount:
      typeof input.amount === 'number' && Number.isFinite(input.amount)
        ? intChips(input.amount)
        : undefined,
    actionId:
      typeof input.actionId === 'string' && input.actionId.trim() !== ''
        ? input.actionId.trim()
        : undefined,
    expectedStreet:
      typeof input.expectedStreet === 'string' && input.expectedStreet.trim() !== ''
        ? input.expectedStreet.trim().toUpperCase()
        : undefined,
  }
}

export function validatePokerActionPayload(
  payload: PokerActionPayload
): { ok: true } | { ok: false; message: string } {
  if (!payload.gameId) return { ok: false, message: 'gameId requis' }
  if (!payload.playerId) return { ok: false, message: 'playerId requis' }
  if (
    payload.actionType !== 'FOLD' &&
    payload.actionType !== 'CALL' &&
    payload.actionType !== 'CHECK' &&
    payload.actionType !== 'RAISE'
  ) {
    return { ok: false, message: 'actionType invalide' }
  }
  if (payload.actionType === 'RAISE') {
    if (typeof payload.amount !== 'number' || payload.amount <= 0) {
      return { ok: false, message: 'Montant de relance invalide' }
    }
  }
  return { ok: true }
}

