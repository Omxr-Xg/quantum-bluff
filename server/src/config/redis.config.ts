import { Redis } from 'ioredis'
import { GameTable } from '../logic/GameTable.js'
import { rootLogger } from '../observability/logger.js'
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
  const key = `${GAME_PREFIX}${gameId}`
  const serialized = serializeGame(gameId, game)
  await redisClient.setex(key, ttl, serialized)
}

export const getGame = async (gameId: string): Promise<GameTable | null> => {
  const key = `${GAME_PREFIX}${gameId}`
  const data = await redisClient.get(key)

  if (!data) {
    return null
  }

  return deserializeGame(gameId, data)
}

export const deleteGame = async (gameId: string): Promise<void> => {
  const key = `${GAME_PREFIX}${gameId}`
  await redisClient.del(key)
}

export const getAllGames = async (): Promise<Map<string, GameTable>> => {
  const keys = await redisClient.keys(`${GAME_PREFIX}*`)
  const games = new Map<string, GameTable>()

  for (const key of keys) {
    const gameId = key.replace(GAME_PREFIX, '')
    const data = await redisClient.get(key)

    if (!data) {
      continue
    }

    const game = deserializeGame(gameId, data)
    if (game) {
      games.set(gameId, game)
    }
  }

  return games
}

export const restoreAllGames = async (): Promise<Map<string, GameTable>> => {
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