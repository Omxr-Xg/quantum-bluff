import type { NextFunction, Request, RequestHandler, Response } from 'express'
import { timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'
import { rootLogger } from '../observability/index.js'

type AdminGuardOptions = {
  routeName: string
  concealWhenDenied?: boolean
  localhostOnly?: boolean
}

function getRemoteAddress(req: Request): string {
  return req.socket.remoteAddress ?? ''
}

function isLocalRequest(req: Request): boolean {
  const ip = getRemoteAddress(req)

  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    ip === '::ffff:127.0.0.1'
  )
}

function extractAdminToken(req: Request): string | null {
  const raw = req.header('x-admin-token') ?? req.header('authorization')

  if (!raw) {
    return null
  }

  const value = raw.trim()

  if (!value) {
    return null
  }

  if (/^Bearer\s+/i.test(value)) {
    const token = value.replace(/^Bearer\s+/i, '').trim()
    return token || null
  }

  return value
}

function safeTokenEquals(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)

  if (providedBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(providedBuffer, expectedBuffer)
}

function deny(
  req: Request,
  res: Response,
  options: AdminGuardOptions,
  reason: string
) {
  rootLogger.warn({
    msg: 'admin_access_denied',
    routeName: options.routeName,
    reason,
    ip: req.ip,
    remoteAddress: req.socket.remoteAddress,
    path: req.originalUrl,
  })

  if (options.concealWhenDenied) {
    return res.status(404).json({ error: 'Not found' })
  }

  return res.status(403).json({ error: 'Accès administrateur interdit.' })
}

export function requireAdminAccess(options: AdminGuardOptions): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const configuredToken = env.adminApiToken

    console.log('ADMIN_TOKEN_LOADED_LENGTH =', configuredToken?.length ?? 0)

    if (!configuredToken) {
      rootLogger.error({
        msg: 'admin_token_not_configured',
        routeName: options.routeName,
      })

      if (options.concealWhenDenied) {
        return res.status(404).json({ error: 'Not found' })
      }

      return res.status(503).json({
        error: 'Service administrateur indisponible.',
      })
    }

    if (options.localhostOnly && !isLocalRequest(req)) {
      return deny(req, res, options, 'non_local_request')
    }

    const providedToken = extractAdminToken(req)

    console.log('ADMIN_TOKEN_PROVIDED_LENGTH =', providedToken?.length ?? 0)

    if (!providedToken) {
      return deny(req, res, options, 'missing_admin_token')
    }

    if (!safeTokenEquals(providedToken, configuredToken)) {
      return deny(req, res, options, 'invalid_admin_token')
    }

    return next()
  }
}

export function requireDevRouletteOverrideAccess(routeName: string): RequestHandler {
  const baseGuard = requireAdminAccess({
    routeName,
    localhostOnly: true,
    concealWhenDenied: true,
  })

  return (req: Request, res: Response, next: NextFunction) => {
    if (env.isProduction) {
      return res.status(404).json({ error: 'Not found' })
    }

    if (!env.enableAdminRouletteOverride) {
      return res.status(404).json({ error: 'Not found' })
    }

    return baseGuard(req, res, next)
  }
}