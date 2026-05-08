import redisClient from '../config/redis.config.js'
import { rootLogger } from '../observability/logger.js'

const BRACKET_SURVIVORS_KEY = (tournamentId: string) =>
  `tournament:${tournamentId}:survivors`
const BRACKET_EXPECTED_KEY = (tournamentId: string) =>
  `tournament:${tournamentId}:expectedTables`

type SurvivorRow = {
  userId: string
  username: string
  chips: number
}

export async function appendTournamentSurvivor(
  tournamentId: string,
  row: SurvivorRow,
): Promise<void> {
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
): Promise<SurvivorRow[]> {
  try {
    const raw = await redisClient.lrange(BRACKET_SURVIVORS_KEY(tournamentId), 0, -1)
    return raw
      .map((s) => {
        try {
          return JSON.parse(s) as SurvivorRow
        } catch {
          return null
        }
      })
      .filter((x): x is SurvivorRow => x != null)
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_bracket_survivor_list_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

export async function clearTournamentSurvivors(
  tournamentId: string,
): Promise<void> {
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
    if (!raw) return null
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_bracket_expected_get_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function clearTournamentBracketState(
  tournamentId: string,
): Promise<void> {
  await Promise.allSettled([
    redisClient.del(BRACKET_SURVIVORS_KEY(tournamentId)),
    redisClient.del(BRACKET_EXPECTED_KEY(tournamentId)),
  ])
}

