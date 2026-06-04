import { getHighestBid } from './conteeBidding.js'
import type { ContreeBidEntry, BeloteSuit } from './types.js'
import {
  CONTEE_BID_STEP,
  CONTEE_CAPOT_BID,
  CONTEE_MAX_BID,
  CONTEE_MIN_BID,
} from './conteeConstants.js'

const SUITS: BeloteSuit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']

/** Enchères possibles pour le joueur (valeur + couleur d’atout). */
export function legalBidOptions(bids: ContreeBidEntry[]): Array<{ value: number; trump: BeloteSuit }> {
  const highest = getHighestBid(bids)
  const min = highest ? highest.value + CONTEE_BID_STEP : CONTEE_MIN_BID
  const out: Array<{ value: number; trump: BeloteSuit }> = []

  for (let v = min; v <= CONTEE_MAX_BID; v += CONTEE_BID_STEP) {
    for (const trump of SUITS) {
      out.push({ value: v, trump })
    }
  }
  for (const trump of SUITS) {
    out.push({ value: CONTEE_CAPOT_BID, trump })
  }
  return out
}
