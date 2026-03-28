/**
 * Par worker Jest : coupe le timer activeGames et ferme ioredis pour éviter
 * « A worker process has failed to exit gracefully ».
 */
import { afterAll } from '@jest/globals'
import { disposeActiveGamesForTests } from './src/shared/activeGames.js'
import redisClient from './src/config/redis.config.js'

afterAll(async () => {
  disposeActiveGamesForTests()
  try {
    if (redisClient.status !== 'end' && redisClient.status !== 'close') {
      await redisClient.quit()
    }
  } catch {
    try {
      redisClient.disconnect()
    } catch {
      /* noop */
    }
  }
  try {
    const { disconnectDB } = await import('./src/config/database.js')
    await disconnectDB()
  } catch {
    /* pas de DB en env minimal */
  }
})
