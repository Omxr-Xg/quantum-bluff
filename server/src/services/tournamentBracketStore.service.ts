import redisClient from '../config/redis.config.js'
import { rootLogger } from '../observability/logger.js'

const BRACKET_SURVIVORS_KEY = (tournamentId: string) =>
  `tournament:${tournamentId}:survivors`
const BRACKET_EXPECTED_KEY = (tournamentId: string) =>
  `tournament:${tournamentId}:expectedTables`

export type BracketSurvivorRow = {
  userId: string
  username: string
  chips: number
}

/** Fallback process-local si Redis indisponible (évite de bloquer la finale). */
const memorySurvivorsByTournament = new Map<string, BracketSurvivorRow[]>()
const memoryExpectedByTournament = new Map<string, number>()

export async function appendTournamentSurvivor(
  tournamentId: string,
  row: BracketSurvivorRow,
): Promise<void> {
  const list = memorySurvivorsByTournament.get(tournamentId) ?? []
  list.push(row)
  memorySurvivorsByTournament.set(tournamentId, [...list])
  try {
    await redisClient.rpush(
      BRACKET_SURVIVORS_KEY(tournamentId),
      JSON.stringify(row),
    )
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_bracket_survivor_append_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function getTournamentSurvivors(
  tournamentId: string,
): Promise<BracketSurvivorRow[]> {
  let redisList: BracketSurvivorRow[] = []
  try {
    const raw = await redisClient.lrange(BRACKET_SURVIVORS_KEY(tournamentId), 0, -1)
    redisList = raw
      .map((s) => {
        try {
          return JSON.parse(s) as BracketSurvivorRow
        } catch {
          return null
        }
      })
      .filter((x): x is BracketSurvivorRow => x != null)
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_bracket_survivor_list_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
  const memList = memorySurvivorsByTournament.get(tournamentId) ?? []
  if (redisList.length >= memList.length) {
    if (redisList.length > 0) {
      memorySurvivorsByTournament.set(tournamentId, redisList)
    }
    return redisList
  }
  return memList
}

export async function clearTournamentSurvivors(
  tournamentId: string,
): Promise<void> {
  memorySurvivorsByTournament.delete(tournamentId)
  try {
    await redisClient.del(BRACKET_SURVIVORS_KEY(tournamentId))
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_bracket_survivor_clear_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function setTournamentExpectedTables(
  tournamentId: string,
  expected: number,
): Promise<void> {
  memoryExpectedByTournament.set(tournamentId, expected)
  try {
    await redisClient.set(BRACKET_EXPECTED_KEY(tournamentId), String(expected))
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_bracket_expected_set_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function getTournamentExpectedTables(
  tournamentId: string,
): Promise<number | null> {
  try {
    const raw = await redisClient.get(BRACKET_EXPECTED_KEY(tournamentId))
    if (raw) {
      const n = Number.parseInt(raw, 10)
      if (Number.isFinite(n) && n > 0) {
        memoryExpectedByTournament.set(tournamentId, n)
        return n
      }
    }
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_bracket_expected_get_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
  const mem = memoryExpectedByTournament.get(tournamentId)
  return mem != null && mem > 0 ? mem : null
}

export async function clearTournamentBracketState(
  tournamentId: string,
): Promise<void> {
  memorySurvivorsByTournament.delete(tournamentId)
  memoryExpectedByTournament.delete(tournamentId)
  await Promise.allSettled([
    redisClient.del(BRACKET_SURVIVORS_KEY(tournamentId)),
    redisClient.del(BRACKET_EXPECTED_KEY(tournamentId)),
  ])
}
