import { Redis } from 'ioredis'
import { GameTable } from '../logic/GameTable.js'
import { rootLogger } from '../observability/logger.js'
import {
  attachRedisInstrumentation,
  startRedisUsageProjectionTicker,
  withRedisFeature,
} from '../observability/redisInstrumentation.js'
import type { Card, GamePhase, Player } from '../types/poker.js'
import { env } from './env.js'

interface SerializedGameState {
  pot: number
  communityCards: unknown[]
  players: Omit<Player, 'cards'>[]
  currentTurn: string
  phase: string
}

const redisLiteClient = env.isJest || env.isCi

const sharedRedisOptions = {
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: redisLiteClient ? 1 : 20,
  connectTimeout: redisLiteClient ? 1000 : 5000,
  username: env.redisUsername,
  password: env.redisPassword,
}

const redisClient = env.redisUrl
  ? new Redis(env.redisUrl, sharedRedisOptions)
  : new Redis({
      host: env.redisHost,
      port: env.redisPort,
      ...sharedRedisOptions,
    })

if (!redisLiteClient) {
  attachRedisInstrumentation(redisClient, 'core')
  startRedisUsageProjectionTicker()
}

redisClient.on('connect', () => {
  if (!env.isJest) {
    rootLogger.info({ msg: 'redis_connected' })
  }
})

redisClient.on('error', (err: Error) => {
  if (redisLiteClient) {
    if (err instanceof AggregateError) {
      return
    }

    const message = err?.message ?? String(err)

    if (/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(message)) {
      return
    }
  }

  rootLogger.error({
    msg: 'redis_client_error',
    detail: err instanceof Error ? err.message : String(err),
  })
})

export const isRedisHealthy = async (): Promise<boolean> => {
  try {
    const pong = await redisClient.ping()
    return pong === 'PONG'
  } catch {
    return false
  }
}

const GAME_PREFIX = 'game:'
const GAME_INDEX_KEY = 'game:index'

const actionLogMemory = new Map<string, string[]>()

function actionLogKey(gameId: string, handId: string): string {
  return `${gameId}:${handId}`
}

export const serializeGame = (_gameId: string, game: GameTable): string => {
  const state = game.getState()

  return JSON.stringify({
    id: game.id,
    state: {
      pot: state.pot,
      communityCards: state.communityCards,
      players: state.players.map((player) => ({
        id: player.id,
        name: player.name,
        chips: player.chips,
        currentBet: player.currentBet || 0,
        position: player.position || 0,
        role: player.role,
        isActive: player.isActive,
        isDealer: player.isDealer || false,
        isConnected: player.isConnected !== false,
      })),
      currentTurn: state.currentTurn,
      phase: state.phase,
    },
  })
}

export const deserializeGame = (gameId: string, data: string): GameTable | null => {
  try {
    const parsed = JSON.parse(data) as { state: SerializedGameState }
    const parsedState = parsed.state

    const players: Player[] = parsedState.players.map((player) => ({
      ...player,
      cards: [],
    }))

    const game = new GameTable(gameId, players)

    game.state = {
      ...game.state,
      pot: parsedState.pot,
      communityCards: parsedState.communityCards as Card[],
      currentTurn: parsedState.currentTurn,
      phase: parsedState.phase as GamePhase,
    }

    return game
  } catch (err) {
    rootLogger.error({
      msg: 'redis_deserialize_game_failed',
      detail: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}

export const saveGame = async (gameId: string, game: GameTable, ttl = 3600): Promise<void> => {
  await withRedisFeature('core', async () => {
    const key = `${GAME_PREFIX}${gameId}`
    const serialized = serializeGame(gameId, game)
    await redisClient.setex(key, ttl, serialized)
    await redisClient.sadd(GAME_INDEX_KEY, gameId)
  })
}

export const getGame = async (gameId: string): Promise<GameTable | null> => {
  return withRedisFeature('core', async () => {
    const key = `${GAME_PREFIX}${gameId}`
    const data = await redisClient.get(key)
    if (!data) return null
    return deserializeGame(gameId, data)
  })
}

export const deleteGame = async (gameId: string): Promise<void> => {
  await withRedisFeature('core', async () => {
    const key = `${GAME_PREFIX}${gameId}`
    await redisClient.del(key)
    await redisClient.srem(GAME_INDEX_KEY, gameId)
  })
}

const ACTION_LOG_TTL = 60 * 60 * 2
const ACTION_LOG_MAX = 100

export async function appendActionLog(gameId: string, handId: string, line: string): Promise<void> {
  const memKey = actionLogKey(gameId, handId)
  const prev = actionLogMemory.get(memKey) ?? []
  const next = [...prev, line].slice(-ACTION_LOG_MAX)
  actionLogMemory.set(memKey, next)

  if (!env.distributedRedis) return

  try {
    await withRedisFeature('core', async () => {
      const key = `action_log:${gameId}:${handId}`
      await redisClient.rpush(key, line)
      await redisClient.expire(key, ACTION_LOG_TTL)
      await redisClient.ltrim(key, -99, -1)
    })
  } catch {
    /* ignore */
  }
}

export async function getActionLog(gameId: string, handId: string): Promise<string[]> {
  const memKey = actionLogKey(gameId, handId)
  const local = actionLogMemory.get(memKey)
  if (local && local.length > 0) return local

  try {
    return await withRedisFeature('core', async () => {
      const key = `action_log:${gameId}:${handId}`
      return await redisClient.lrange(key, 0, -1)
    })
  } catch {
    return local ?? []
  }
}

export async function clearActionLog(gameId: string, handId: string): Promise<void> {
  actionLogMemory.delete(actionLogKey(gameId, handId))
  try {
    await withRedisFeature('core', () => redisClient.del(`action_log:${gameId}:${handId}`))
  } catch {
    /* ignore */
  }
}

export const getAllGames = async (): Promise<Map<string, GameTable>> => {
  return withRedisFeature('core', async () => {
    const gameIds = await redisClient.smembers(GAME_INDEX_KEY)
    if (gameIds.length === 0) return new Map()

    const pipeline = redisClient.pipeline()
    for (const gameId of gameIds) {
      pipeline.get(`${GAME_PREFIX}${gameId}`)
    }
    const results = await pipeline.exec()
    const games = new Map<string, GameTable>()

    gameIds.forEach((gameId, i) => {
      const row = results?.[i]
      if (!row || row[0]) return
      const data = row[1] as string | null
      if (!data) return
      const game = deserializeGame(gameId, data)
      if (game) games.set(gameId, game)
    })

    return games
  })
}

export const restoreAllGames = async (): Promise<Map<string, GameTable>> => {
  if (!env.persistLegacyGameKeys) {
    return new Map()
  }
  if (!env.isJest) {
    rootLogger.info({ msg: 'redis_restore_games_start' })
  }

  const games = await getAllGames()

  if (!env.isJest) {
    rootLogger.info({ msg: 'redis_restore_games_complete', count: games.size })
  }

  return games
}

export default redisClient
