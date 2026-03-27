import { activeGames } from '../../shared/activeGames.js'
import { normalizePokerActionPayload, validatePokerActionPayload } from '../domain/pokerAction.validation.js'
import type { PokerActionError, PokerActionPayload } from '../domain/pokerAction.types.js'
import { makePokerActionDedupKey, registerPokerActionDedup } from './pokerActionDedup.service.js'
import { withPokerTableLock } from './pokerTableLock.service.js'

type ActionTarget = {
  getStateContext: () => { handId?: string; phase?: string; currentTurn?: string }
  apply: (playerId: string, action: 'FOLD' | 'CALL' | 'RAISE' | 'CHECK', amount?: number) => void
  getMinRaise: () => number
}

function makeError(code: PokerActionError['code'], message: string, httpStatus = 400): PokerActionError {
  return { code, message, httpStatus }
}

export async function applyPokerAction(payloadLike: Partial<PokerActionPayload>): Promise<{
  ok: true
}> {
  const payload = normalizePokerActionPayload(payloadLike)
  const validation = validatePokerActionPayload(payload)
  if (!validation.ok) throw makeError('INVALID_ACTION', validation.message, 400)

  const game = await activeGames.get(payload.gameId)
  if (!game) throw makeError('GAME_NOT_FOUND', 'Partie introuvable', 404)

  const target: ActionTarget = {
    getStateContext: () => ({
      handId: game.state.handId,
      phase: game.state.phase,
      currentTurn: game.state.currentTurn,
    }),
    apply: (playerId, action, amount) => game.handlePlayerAction(playerId, action, amount),
    getMinRaise: () =>
      'getMinRaise' in game && typeof game.getMinRaise === 'function'
        ? game.getMinRaise()
        : 0,
  }

  const ctx = target.getStateContext()
  if (ctx.currentTurn !== payload.playerId) {
    throw makeError('NOT_YOUR_TURN', 'Ce n\'est pas votre tour', 409)
  }
  if (payload.handId && ctx.handId && payload.handId !== ctx.handId) {
    throw makeError('STALE_ACTION', 'Action obsolète (main différente)', 409)
  }
  if (payload.expectedStreet && ctx.phase && payload.expectedStreet !== ctx.phase) {
    throw makeError('STALE_ACTION', 'Action obsolète (street différente)', 409)
  }
  if (payload.actionType === 'RAISE') {
    const minRaise = target.getMinRaise()
    if (typeof payload.amount !== 'number' || payload.amount < minRaise) {
      throw makeError('INVALID_RAISE', `La relance minimum est de ${minRaise}`, 400)
    }
  }

  const contextKey = `${ctx.handId ?? 'no-hand'}:${ctx.phase ?? 'unknown'}:${ctx.currentTurn ?? ''}`
  const dedupKey = makePokerActionDedupKey(payload)
  const dedup = registerPokerActionDedup({ dedupKey, contextKey })
  if (!dedup.accepted) {
    if (dedup.reason === 'DUPLICATE_ACTION') {
      throw makeError('DUPLICATE_ACTION', 'Action déjà traitée', 409)
    }
    throw makeError('STALE_ACTION', 'Action obsolète', 409)
  }

  const lockOwner = `${payload.playerId}:${payload.actionId ?? Date.now().toString()}`
  await withPokerTableLock(payload.gameId, lockOwner, async () => {
    target.apply(payload.playerId, payload.actionType, payload.amount)
  })

  return { ok: true }
}

