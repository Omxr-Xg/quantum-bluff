import { randomUUID } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import { rootLogger } from './logger.js'
import { getRouteGroup } from './routeGroup.js'
import { metrics } from './metrics.js'

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const id =
    (typeof req.headers['x-request-id'] === 'string' &&
      req.headers['x-request-id'].trim()) ||
    randomUUID()
  req.requestId = id
  res.setHeader('x-request-id', id)
  next()
}

export function httpAccessLogMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now()
  res.on('finish', () => {
    const durationMs = Date.now() - start
    const routeGroup = getRouteGroup(req)
    const status = res.statusCode
    metrics.observeHttp({
      method: req.method,
      routeGroup,
      status,
      durationMs,
    })
    rootLogger.info({
      msg: 'http_request_complete',
      requestId: req.requestId,
      method: req.method,
      status,
      durationMs,
      routeGroup,
    })
  })
  next()
}
