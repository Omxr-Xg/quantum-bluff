import { pino, stdTimeFunctions } from 'pino'

const level =
  process.env.LOG_LEVEL ??
  (process.env.NODE_ENV === 'production' ? 'info' : 'debug')

const instanceId =
  process.env.INSTANCE_ID?.trim() ||
  (typeof process.env.HOSTNAME === 'string' && process.env.HOSTNAME
    ? process.env.HOSTNAME
    : undefined) ||
  'single'

export const rootLogger = pino({
  level,
  base: { instanceId },
  timestamp: stdTimeFunctions.isoTime,
})
