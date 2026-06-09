import * as Sentry from '@sentry/react'

let enabled = false

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn?.trim()) return

  const environment =
    (import.meta.env.VITE_SENTRY_ENVIRONMENT as string | undefined)?.trim() ||
    import.meta.env.MODE ||
    'development'

  const release = (import.meta.env.VITE_SENTRY_RELEASE as string | undefined)?.trim()

  Sentry.init({
    dsn: dsn.trim(),
    environment,
    release: release || undefined,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    enabled: import.meta.env.PROD,
  })
  enabled = true
}

export function isSentryEnabled(): boolean {
  return enabled
}

export function captureClientException(
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

export { Sentry }
