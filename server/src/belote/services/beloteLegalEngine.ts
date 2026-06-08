import { teamForPosition } from '../../logic/belote/bidding.js'
import { legalBidOptions } from '../../logic/belote/conteeLegalBids.js'
import { usesAuctionBidding } from '../../logic/belote/beloteVariants.js'
import { playableCards } from '../../logic/belote/trickPlay.js'
import { resolveTrumpContext } from '../../logic/belote/trumpContext.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type {
  BeloteAction,
  BeloteCard,
  BeloteGameState,
  BeloteSuit,
  BeloteTrumpChoice,
} from '../../logic/belote/types.js'

const SUITS: BeloteSuit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']

export type BeloteLegalAction =
  | { type: 'PASS' }
  | { type: 'TAKE' }
  | { type: 'CHOOSE_TRUMP'; trump: BeloteSuit }
  | { type: 'BID'; value: number; trump: BeloteTrumpChoice }
  | { type: 'CONTREE' }
  | { type: 'SURCONTREE' }
  | { type: 'PLAY_CARD'; card: BeloteCard }

function playerAtTurn(state: BeloteGameState, playerId: string) {
  const player = state.players.find((p) => p.userId === playerId)
  if (!player || player.forfeited) return null
  return player
}

function classiqueLegalActions(state: BeloteGameState, position: number): BeloteLegalAction[] {
  if (position !== state.biddingTurnPosition) return []
  const out: BeloteLegalAction[] = [{ type: 'PASS' }]

  if (state.phase === 'CLASSIQUE_TAKE' && state.deal.turnedCard) {
    out.push({ type: 'TAKE' })
  }

  if (state.phase === 'CLASSIQUE_CHOOSE') {
    const turnedSuit = state.deal.turnedCard?.suit
    for (const trump of SUITS) {
      if (turnedSuit && trump === turnedSuit) continue
      out.push({ type: 'CHOOSE_TRUMP', trump })
    }
  }

  return out
}

function auctionLegalActions(state: BeloteGameState, position: number): BeloteLegalAction[] {
  if (state.phase === 'BIDDING') {
    if (position !== state.biddingTurnPosition) return []
    const out: BeloteLegalAction[] = [{ type: 'PASS' }]
    if (usesAuctionBidding(state.variant)) {
      for (const opt of legalBidOptions(state.bids, state.variant)) {
        out.push({ type: 'BID', value: opt.value, trump: opt.trump })
      }
    }
    return out
  }

  if (state.phase === 'CONTREE_ROUND') {
    if (position !== state.biddingTurnPosition) return []
    const out: BeloteLegalAction[] = [{ type: 'PASS' }]
    const contractTeam = state.deal.contractTeam
    if (!contractTeam) return out

    const defenseTeam = contractTeam === 'A' ? 'B' : 'A'
    const myTeam = teamForPosition(position)

    if (state.contreePhase === 'DEFENSE' && myTeam === defenseTeam && state.contreeLevel === 0) {
      out.push({ type: 'CONTREE' })
    }
    if (state.contreePhase === 'ATTACK' && myTeam === contractTeam && state.contreeLevel === 1) {
      out.push({ type: 'SURCONTREE' })
    }
    return out
  }

  return []
}

function playingLegalActions(state: BeloteGameState, playerId: string): BeloteLegalAction[] {
  const player = playerAtTurn(state, playerId)
  if (!player || state.phase !== 'PLAYING') return []
  if (state.deal.currentPlayerPosition !== player.position) return []

  const ctx = resolveTrumpContext(state)
  if (!ctx) return []

  return playableCards(player.hand, ctx, state.deal.currentTrick, player.position).map(
    (card) => ({ type: 'PLAY_CARD', card }),
  )
}

/** Actions légales pour un joueur — garde-fou symbolique permanent. */
export function getLegalActions(
  table: BeloteTableController,
  playerId: string,
): BeloteLegalAction[] {
  const state = table.getState()
  const player = playerAtTurn(state, playerId)
  if (!player) return []

  if (state.phase === 'CLASSIQUE_TAKE' || state.phase === 'CLASSIQUE_CHOOSE') {
    return classiqueLegalActions(state, player.position)
  }

  if (state.phase === 'BIDDING' || state.phase === 'CONTREE_ROUND') {
    return auctionLegalActions(state, player.position)
  }

  if (state.phase === 'PLAYING') {
    return playingLegalActions(state, playerId)
  }

  return []
}

export function legalActionToBeloteAction(action: BeloteLegalAction): BeloteAction {
  switch (action.type) {
    case 'PASS':
      return { type: 'PASS' }
    case 'TAKE':
      return { type: 'TAKE' }
    case 'CHOOSE_TRUMP':
      return { type: 'CHOOSE_TRUMP', trump: action.trump }
    case 'BID':
      return { type: 'BID', value: action.value, trump: action.trump }
    case 'CONTREE':
      return { type: 'CONTREE' }
    case 'SURCONTREE':
      return { type: 'SURCONTREE' }
    case 'PLAY_CARD':
      return { type: 'PLAY_CARD', card: action.card }
    default:
      return { type: 'PASS' }
  }
}

export function legalActionKey(action: BeloteLegalAction): string {
  switch (action.type) {
    case 'PASS':
      return 'PASS'
    case 'TAKE':
      return 'TAKE'
    case 'CHOOSE_TRUMP':
      return `CHOOSE_TRUMP:${action.trump}`
    case 'BID':
      return `BID:${action.value}:${action.trump}`
    case 'CONTREE':
      return 'CONTREE'
    case 'SURCONTREE':
      return 'SURCONTREE'
    case 'PLAY_CARD':
      return `PLAY_CARD:${action.card.rank}:${action.card.suit}`
    default:
      return 'UNKNOWN'
  }
}

export function legalActionsIncludes(
  legalActions: BeloteLegalAction[],
  predicted: BeloteLegalAction,
): boolean {
  const key = legalActionKey(predicted)
  return legalActions.some((a) => legalActionKey(a) === key)
}
