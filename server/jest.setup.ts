/**
 * Par worker Jest : arrête le timer activeGames et coupe le socket Redis sans
 * `quit()` (qui peut bloquer >5s si aucun serveur Redis — cas GitLab CI).
 */
import { afterAll } from '@jest/globals'
import { disposeActiveGamesForTests } from './src/shared/activeGames.js'
import redisClient from './src/config/redis.config.js'

afterAll(() => {
  disposeActiveGamesForTests()
  try {
    redisClient.disconnect()
  } catch {
    /* noop */
  }
})
