import { getHandInfo } from '../../logic/Evaluator.js'
import type { CashGameController } from '../../logic/CashGameController.js'
import type { HiddenBetResolutionPayload } from './types.js'

/**
 * À appeler **avant** `onHandComplete()` tant que `GameTable` est encore montée.
 */
export function buildHiddenBetResolutionPayload(
  gameId: string,
  cashGame: CashGameController
): HiddenBetResolutionPayload | null {
  const gt = cashGame.getGameTable()
  if (!gt) return null
  const st = gt.state
  const winnerIds = st.showdownWinnerIds?.length
    ? [...st.showdownWinnerIds]
    : st.showdownWinnerId
      ? [st.showdownWinnerId]
      : []
  const board = [...st.communityCards]
  const first = winnerIds[0]
  let winningCategory = 0
  if (first) {
    const p = st.players.find((x) => x.id === first)
    if (p) winningCategory = getHandInfo([...p.cards, ...board]).category
  }
  const playerCards: Record<string, import('../../types/poker.js').Card[]> = {}
  for (const p of st.players) {
    playerCards[p.id] = [...p.cards]
  }
  return {
    gameId,
    handId: st.handId ?? '',
    winnerIds,
    handEndReason: st.handEndReason,
    winningCategory,
    board,
    playerCards,
  }
}
