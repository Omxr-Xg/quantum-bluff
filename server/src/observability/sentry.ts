import * as Sentry from '@sentry/node'
import type { Express } from 'express'
import { env } from '../config/env.js'

let enabled = false

export function initSentry(): void {
  const dsn = env.sentryDsn
  if (!dsn) return

  Sentry.init({
    dsn,
    environment: env.sentryEnvironment,
    release: env.sentryRelease,
    tracesSampleRate: env.sentryTracesSampleRate,
    enabled: !env.isTest,
  })
  enabled = true
}

export function isSentryEnabled(): boolean {
  return enabled
}

export function captureServerException(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (!enabled) return
  Sentry.withScope((scope) => {
    if (context) {
      for (const [key, value] of Object.entries(context)) {
        scope.setExtra(key, value)
      }
    }
    Sentry.captureException(error)
  })
}

export function setupSentryExpressErrorHandler(app: Express): void {
  if (!enabled) return
  Sentry.setupExpressErrorHandler(app)
}

export { Sentry }
