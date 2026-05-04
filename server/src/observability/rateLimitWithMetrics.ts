import type { Request } from 'express'
import rateLimit, {
  type Options,
  type RateLimitExceededEventHandler,
} from 'express-rate-limit'
import { RedisStore, type RedisReply } from 'rate-limit-redis'
import redisClient from '../config/redis.config.js'
import { env } from '../config/env.js'
import { rootLogger } from './logger.js'
import { pathToRouteGroup } from './routeGroup.js'
import { metrics } from './metrics.js'

const defaultExceededHandler: RateLimitExceededEventHandler = async (
  request,
  response,
  _next,
  optionsUsed
) => {
  response.status(optionsUsed.statusCode)
  const message =
    typeof optionsUsed.message === 'function'
      ? await optionsUsed.message(request, response)
      : optionsUsed.message
  if (!response.writableEnded) response.send(message)
}

/**
 * express-rate-limit avec compteur + log `rate_limit_exceeded` (route_group faible cardinalité).
 */
export function rateLimitWithMetrics(
  options: Partial<Options>
): ReturnType<typeof rateLimit> {
  const userHandler = options.handler ?? defaultExceededHandler
  const store = env.isJest
      ? undefined
      : new RedisStore({
          sendCommand: (...args: string[]) => {
            const [cmd, ...rest] = args
            return redisClient.call(cmd, ...rest) as Promise<RedisReply>
          },
          prefix: 'rl:qb:',
        })
  return rateLimit({
    ...options,
    ...(store ? { store } : {}),
    handler: async (request, response, next, optionsUsed) => {
      const routeGroup = pathToRouteGroup(request.path || '/')
      metrics.incRateLimitExceeded(routeGroup)
      rootLogger.warn({
        msg: 'rate_limit_exceeded',
        routeGroup,
        requestId: (request as Request).requestId,
      })
      await userHandler(request, response, next, optionsUsed)
    },
  })
}
