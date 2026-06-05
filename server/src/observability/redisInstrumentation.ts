import { AsyncLocalStorage } from 'node:async_hooks'
import type { Redis } from 'ioredis'
import { metrics } from './metrics.js'
import { rootLogger } from './logger.js'

const redisFeatureContext = new AsyncLocalStorage<string>()

/** Exécute des commandes Redis comptées sous `feature` (prioritaire sur le feature par défaut du client). */
export function withRedisFeature<T>(feature: string, fn: () => Promise<T>): Promise<T> {
  return redisFeatureContext.run(feature, fn)
}

const MINUTES_PER_MONTH = 60 * 24 * 30

type WindowBucket = {
  total: number
  byFeature: Map<string, number>
}

let currentWindow: WindowBucket = {
  total: 0,
  byFeature: new Map(),
}

let projectionTimer: ReturnType<typeof setInterval> | null = null

function normalizeCommandName(cmd: unknown): string {
  if (typeof cmd === 'string') return cmd.toLowerCase()
  if (cmd && typeof cmd === 'object' && 'name' in cmd) {
    const name = (cmd as { name?: string }).name
    if (typeof name === 'string') return name.toLowerCase()
  }
  return 'unknown'
}

export function recordRedisCommand(feature: string, command: string): void {
  const safeFeature = feature.trim() || 'unknown'
  const safeCommand = command.trim() || 'unknown'
  metrics.incRedisCommand(safeFeature, safeCommand)
  currentWindow.total += 1
  currentWindow.byFeature.set(
    safeFeature,
    (currentWindow.byFeature.get(safeFeature) ?? 0) + 1,
  )
}

function flushProjectionWindow(): void {
  const snapshot = currentWindow
  currentWindow = { total: 0, byFeature: new Map() }

  const perMinute = snapshot.total
  metrics.setRedisCommandsPerMinute(perMinute)
  metrics.setRedisMonthlyProjection(perMinute * MINUTES_PER_MONTH)

  const top = [...snapshot.byFeature.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([feature, count]) => ({ feature, count }))

  if (top.length > 0) {
    rootLogger.info({
      msg: 'redis_usage_window',
      commandsLastMinute: perMinute,
      monthlyProjection: perMinute * MINUTES_PER_MONTH,
      topFeatures: top,
    })
  }
}

export function startRedisUsageProjectionTicker(): void {
  if (projectionTimer) return
  projectionTimer = setInterval(flushProjectionWindow, 60_000)
  projectionTimer.unref?.()
}

export function stopRedisUsageProjectionTickerForTests(): void {
  if (projectionTimer) {
    clearInterval(projectionTimer)
    projectionTimer = null
  }
}

/** Attache le comptage `redis_commands_total{feature,command}` à un client ioredis. */
export function attachRedisInstrumentation(client: Redis, defaultFeature: string): void {
  const resolveFeature = () => redisFeatureContext.getStore() ?? defaultFeature

  const origSend = client.sendCommand.bind(client) as (...args: unknown[]) => Promise<unknown>
  client.sendCommand = function sendCommandInstrumented(...args: unknown[]) {
    const cmd = normalizeCommandName(args[0])
    const t0 = Date.now()
    recordRedisCommand(resolveFeature(), cmd)
    return origSend(...args).finally(() => {
      metrics.observeRedisCommandDurationMs(cmd, Date.now() - t0)
    })
  }

  const origCall = client.call.bind(client) as (
    command: string,
    ...rest: unknown[]
  ) => Promise<unknown>
  client.call = function callInstrumented(command: string, ...rest: unknown[]) {
    const cmd = normalizeCommandName(command)
    const t0 = Date.now()
    recordRedisCommand(resolveFeature(), cmd)
    return origCall(command, ...rest).finally(() => {
      metrics.observeRedisCommandDurationMs(cmd, Date.now() - t0)
    })
  }
}
