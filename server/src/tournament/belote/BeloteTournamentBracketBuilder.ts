import { mulberry32, shuffleWithRng } from '../bracket/TournamentBracketBuilder.js'

export type BeloteBracketTable = {
  tableIndex: number
  playerIds: string[]
}

export type BeloteBracketRound = {
  tables: BeloteBracketTable[]
}

export function buildBeloteOpeningRound(
  playerIds: string[],
  seed: number,
): BeloteBracketRound {
  if (playerIds.length % 4 !== 0) {
    throw new Error('Bracket Belote : effectif multiple de 4 requis')
  }
  const shuffled = shuffleWithRng([...playerIds], mulberry32(seed))
  const tables: BeloteBracketTable[] = []
  for (let i = 0; i < shuffled.length; i += 4) {
    tables.push({
      tableIndex: tables.length,
      playerIds: shuffled.slice(i, i + 4),
    })
  }
  return { tables }
}

export function buildBeloteRoundFromSurvivors(
  survivorIds: string[],
  seed: number,
): BeloteBracketRound {
  if (survivorIds.length % 4 !== 0) {
    throw new Error('Bracket Belote : survivants multiple de 4 requis')
  }
  return buildBeloteOpeningRound(survivorIds, seed)
}
