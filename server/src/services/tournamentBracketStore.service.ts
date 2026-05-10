import redisClient from '../config/redis.config.js'
import { metrics, rootLogger } from '../observability/index.js'

const BRACKET_SURVIVORS_KEY = (tournamentId: string) =>
  `tournament:${tournamentId}:survivors`
const BRACKET_EXPECTED_KEY = (tournamentId: string) =>
  `tournament:${tournamentId}:expectedTables`
/** Empêche deux enregistrements du même gagnant pour une même table (retry / double fin de main). */
const BRACKET_FINISHED_TABLES_SET = (tournamentId: string) =>
  `tournament:${tournamentId}:finished_tables`
const SPECTATE_SNAPSHOT_KEY = (tournamentId: string) =>
  `tournament:${tournamentId}:spectate_snapshot`
const MERGE_ROUND_MAP_KEY = (mergeGameId: string) =>
  `tournament:merge_round:${mergeGameId}`

const SPECTATE_TTL_SEC = 60 * 60 * 24 * 7
const MERGE_MAP_TTL_SEC = 60 * 60 * 48

export type BracketSurvivorRow = {
  userId: string
  username: string
  chips: number
}

/** Même forme que TournamentSpectateTableRow (évite import circulaire). */
export type SpectateSnapshotTable = {
  tableNumber: number
  roomId: string
  players: { id: string; username: string }[]
}

export type SpectateSnapshotPayload = {
  tournamentName: string
  tables: SpectateSnapshotTable[]
  updatedAt: string
}

/** Fallback process-local si Redis indisponible. */
const memorySurvivorsByTournament = new Map<string, BracketSurvivorRow[]>()
const memoryExpectedByTournament = new Map<string, number>()
const memoryFinishedTablesByTournament = new Map<string, Set<string>>()

function getMemoryFinishedSet(tournamentId: string): Set<string> {
  let s = memoryFinishedTablesByTournament.get(tournamentId)
  if (!s) {
    s = new Set()
    memoryFinishedTablesByTournament.set(tournamentId, s)
  }
  return s
}

/**
 * Enregistre un survivant de table (tour d’ouverture ou finale).
 * `sourceGameId` doit être l’identifiant unique de la partie (`game_tournoi_*`), pour idempotence multi-pods.
 */
export async function appendTournamentSurvivor(
  tournamentId: string,
  row: BracketSurvivorRow,
  sourceGameId: string,
): Promise<{ duplicate: boolean; memoryOnly: boolean }> {
  const memFinished = getMemoryFinishedSet(tournamentId)
  if (memFinished.has(sourceGameId)) {
    metrics.incTournamentBracket('survivor_duplicate_memory')
    return { duplicate: true, memoryOnly: false }
  }

  try {
    const added = await redisClient.sadd(
      BRACKET_FINISHED_TABLES_SET(tournamentId),
      sourceGameId,
    )
    if (added === 0) {
      memFinished.add(sourceGameId)
      metrics.incTournamentBracket('survivor_duplicate_redis')
      return { duplicate: true, memoryOnly: false }
    }

    await redisClient.rpush(
      BRACKET_SURVIVORS_KEY(tournamentId),
      JSON.stringify(row),
    )
    memFinished.add(sourceGameId)

    const list = memorySurvivorsByTournament.get(tournamentId) ?? []
    memorySurvivorsByTournament.set(tournamentId, [...list, row])
    metrics.setDegraded('tournament_bracket_redis', false)
    return { duplicate: false, memoryOnly: false }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    rootLogger.error({
      msg: 'tournament_bracket_survivor_append_redis_failed',
      tournamentId,
      sourceGameId,
      detail,
    })
    metrics.incTournamentBracket('survivor_append_redis_error')
    metrics.setDegraded('tournament_bracket_redis', true)

    try {
      await redisClient.srem(
        BRACKET_FINISHED_TABLES_SET(tournamentId),
        sourceGameId,
      )
    } catch {
      /* ignore rollback failure */
    }

    if (!memFinished.has(sourceGameId)) {
      memFinished.add(sourceGameId)
      const list = memorySurvivorsByTournament.get(tournamentId) ?? []
      memorySurvivorsByTournament.set(tournamentId, [...list, row])
      metrics.incTournamentBracket('survivor_append_memory_fallback')
      return { duplicate: false, memoryOnly: true }
    }
    return { duplicate: true, memoryOnly: true }
  }
}

/**
 * Liste des survivants : priorité à Redis (agrégat correct en multi-instances).
 * En échec Redis, repli mémoire locale avec log d’erreur.
 */
export async function getTournamentSurvivors(
  tournamentId: string,
): Promise<BracketSurvivorRow[]> {
  try {
    const raw = await redisClient.lrange(
      BRACKET_SURVIVORS_KEY(tournamentId),
      0,
      -1,
    )
    const redisList = raw
      .map((s) => {
        try {
          return JSON.parse(s) as BracketSurvivorRow
        } catch {
          return null
        }
      })
      .filter((x): x is BracketSurvivorRow => x != null)

    memorySurvivorsByTournament.set(tournamentId, redisList)
    metrics.setDegraded('tournament_bracket_redis', false)
    return redisList
  } catch (err) {
    rootLogger.error({
      msg: 'tournament_bracket_survivor_list_redis_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
    metrics.incTournamentBracket('survivors_read_redis_error')
    metrics.setDegraded('tournament_bracket_redis', true)
    const memList = memorySurvivorsByTournament.get(tournamentId) ?? []
    return memList
  }
}

export async function clearTournamentSurvivors(
  tournamentId: string,
): Promise<void> {
  memorySurvivorsByTournament.delete(tournamentId)
  memoryFinishedTablesByTournament.delete(tournamentId)
  try {
    await redisClient.del(
      BRACKET_SURVIVORS_KEY(tournamentId),
      BRACKET_FINISHED_TABLES_SET(tournamentId),
    )
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
    await redisClient.set(
      BRACKET_EXPECTED_KEY(tournamentId),
      String(expected),
    )
    metrics.setDegraded('tournament_bracket_redis', false)
  } catch (err) {
    rootLogger.error({
      msg: 'tournament_bracket_expected_set_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
    metrics.incTournamentBracket('expected_set_redis_error')
    metrics.setDegraded('tournament_bracket_redis', true)
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
    metrics.incTournamentBracket('expected_get_redis_error')
  }
  const mem = memoryExpectedByTournament.get(tournamentId)
  return mem != null && mem > 0 ? mem : null
}

export async function clearTournamentBracketState(
  tournamentId: string,
): Promise<void> {
  memorySurvivorsByTournament.delete(tournamentId)
  memoryExpectedByTournament.delete(tournamentId)
  memoryFinishedTablesByTournament.delete(tournamentId)
  await Promise.allSettled([
    redisClient.del(
      BRACKET_SURVIVORS_KEY(tournamentId),
      BRACKET_EXPECTED_KEY(tournamentId),
      BRACKET_FINISHED_TABLES_SET(tournamentId),
      SPECTATE_SNAPSHOT_KEY(tournamentId),
    ),
  ])
}

/** Snapshot partagé entre pods pour l’API spectate (roomId + joueurs affichés). */
export async function setTournamentSpectateSnapshot(
  tournamentId: string,
  tournamentName: string,
  tables: SpectateSnapshotTable[],
): Promise<void> {
  const payload: SpectateSnapshotPayload = {
    tournamentName,
    tables,
    updatedAt: new Date().toISOString(),
  }
  try {
    await redisClient.set(
      SPECTATE_SNAPSHOT_KEY(tournamentId),
      JSON.stringify(payload),
      'EX',
      SPECTATE_TTL_SEC,
    )
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_spectate_snapshot_set_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
    metrics.incTournamentBracket('spectate_snapshot_set_error')
  }
}

export async function getTournamentSpectateSnapshot(
  tournamentId: string,
): Promise<SpectateSnapshotPayload | null> {
  try {
    const raw = await redisClient.get(SPECTATE_SNAPSHOT_KEY(tournamentId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as SpectateSnapshotPayload
    if (!parsed?.tables || !Array.isArray(parsed.tables)) return null
    return parsed
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_spectate_snapshot_get_failed',
      tournamentId,
      detail: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export async function clearTournamentSpectateSnapshot(
  tournamentId: string,
): Promise<void> {
  try {
    await redisClient.del(SPECTATE_SNAPSHOT_KEY(tournamentId))
  } catch {
    /* ignore */
  }
}

/** Après redémarrage : retrouver le tournoi lié à une table de fusion. */
export async function setMergeRoundMapping(
  mergeGameId: string,
  tournamentId: string,
): Promise<void> {
  try {
    await redisClient.set(
      MERGE_ROUND_MAP_KEY(mergeGameId),
      tournamentId,
      'EX',
      MERGE_MAP_TTL_SEC,
    )
  } catch (err) {
    rootLogger.warn({
      msg: 'tournament_merge_map_set_failed',
      mergeGameId,
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function getMergeRoundMapping(
  mergeGameId: string,
): Promise<string | null> {
  try {
    const v = await redisClient.get(MERGE_ROUND_MAP_KEY(mergeGameId))
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export async function deleteMergeRoundMapping(
  mergeGameId: string,
): Promise<void> {
  try {
    await redisClient.del(MERGE_ROUND_MAP_KEY(mergeGameId))
  } catch {
    /* ignore */
  }
}
