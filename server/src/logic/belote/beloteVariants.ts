import type { BeloteGameVariant, BeloteTrumpChoice } from './types.js'

export const BELOTE_VARIANTS: BeloteGameVariant[] = [
  'CLASSIQUE',
  'COINCHE',
  'CONTEE',
  'MODERNE',
]

export function normalizeBeloteVariant(raw: unknown): BeloteGameVariant {
  const v = typeof raw === 'string' ? raw.toUpperCase() : ''
  if (BELOTE_VARIANTS.includes(v as BeloteGameVariant)) {
    return v as BeloteGameVariant
  }
  return 'CONTEE'
}

/** Enchères numériques (80, capot, contrée) — pas la belote classique. */
export function usesAuctionBidding(variant: BeloteGameVariant): boolean {
  return variant === 'COINCHE' || variant === 'CONTEE' || variant === 'MODERNE'
}

/** Phase contrée / surcontrée après les enchères. */
export function usesContreeRound(variant: BeloteGameVariant): boolean {
  return variant === 'COINCHE' || variant === 'CONTEE' || variant === 'MODERNE'
}

/** Tout atout et sans atout autorisés aux enchères. */
export function allowsSpecialTrumps(variant: BeloteGameVariant): boolean {
  return variant === 'COINCHE' || variant === 'MODERNE'
}

export function isValidTrumpChoice(
  trump: BeloteTrumpChoice,
  variant: BeloteGameVariant,
): boolean {
  if (trump === 'ALL_TRUMP' || trump === 'NO_TRUMP') {
    return allowsSpecialTrumps(variant)
  }
  return ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'].includes(trump)
}
