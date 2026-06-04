import { allowsSpecialTrumps } from './beloteVariants.js'
import { getHighestBid } from './conteeBidding.js'
import type { ContreeBidEntry, BeloteGameVariant, BeloteTrumpChoice } from './types.js'
import {
  CONTEE_BID_STEP,
  CONTEE_CAPOT_BID,
  CONTEE_MAX_BID,
  CONTEE_MIN_BID,
} from './conteeConstants.js'

const SUITS: BeloteTrumpChoice[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES']

/** Enchères possibles pour le joueur (valeur + atout). */
export function legalBidOptions(
  bids: ContreeBidEntry[],
  variant: BeloteGameVariant = 'CONTEE',
): Array<{ value: number; trump: BeloteTrumpChoice }> {
  const highest = getHighestBid(bids)
  const min = highest ? highest.value + CONTEE_BID_STEP : CONTEE_MIN_BID
  const out: Array<{ value: number; trump: BeloteTrumpChoice }> = []

  const trumpChoices: BeloteTrumpChoice[] = [...SUITS]
  if (allowsSpecialTrumps(variant)) {
    trumpChoices.push('ALL_TRUMP', 'NO_TRUMP')
  }

  for (let v = min; v <= CONTEE_MAX_BID; v += CONTEE_BID_STEP) {
    for (const trump of trumpChoices) {
      out.push({ value: v, trump })
    }
  }
  if (!highest || highest.value < CONTEE_CAPOT_BID) {
    for (const trump of trumpChoices) {
      out.push({ value: CONTEE_CAPOT_BID, trump })
    }
  }
  return out
}
