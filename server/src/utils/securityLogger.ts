import fs from 'fs'
import path from 'path'
import { rootLogger } from '../observability/logger.js'

type SuspiciousActionType =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'PLAYER_ID_MISMATCH'
  | 'UNAUTHORIZED_JOIN'
  | 'UNAUTHORIZED_ROOM_SUBSCRIBE'
  | 'GAME_NOT_FOUND'
  | 'NOT_YOUR_TURN'
  | 'INVALID_RAISE'
  | 'ACTION_ERROR'
  | 'TOO_MANY_ACTIONS'
  | 'RECONNECT_ERROR'
  | 'BRUTE_FORCE_LOGIN'
  | 'BRUTE_FORCE_REGISTER'

type SecuritySeverity = 'warning' | 'critical'

interface SuspiciousLogPayload {
  userId?: string
  socketId?: string
  gameId?: string
  action?: string
  details?: unknown
}

const logsDir = path.resolve(process.cwd(), 'logs')
const securityLogFilePath = path.join(logsDir, 'security.log')
const alertsLogFilePath = path.join(logsDir, 'alerts.log')

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
}

function getSeverity(type: SuspiciousActionType): SecuritySeverity {
  switch (type) {
    case 'BRUTE_FORCE_LOGIN':
    case 'BRUTE_FORCE_REGISTER':
    case 'PLAYER_ID_MISMATCH':
    case 'INVALID_TOKEN':
    case 'TOO_MANY_ACTIONS':
      return 'critical'
    default:
      return 'warning'
  }
}

export function logSuspiciousAction(
  type: SuspiciousActionType,
  payload: SuspiciousLogPayload
) {
  const severity = getSeverity(type)

  const entry = {
    timestamp: new Date().toISOString(),
    severity,
    type,
    ...payload,
  }

  ensureLogsDir()

  fs.appendFileSync(
    securityLogFilePath,
    JSON.stringify(entry) + '\n',
    'utf8'
  )

  if (severity === 'critical') {
    fs.appendFileSync(
      alertsLogFilePath,
      JSON.stringify(entry) + '\n',
      'utf8'
    )
  }

  const logFn = severity === 'critical' ? rootLogger.error.bind(rootLogger) : rootLogger.warn.bind(rootLogger)
  logFn({
    msg: 'security_suspicious_action',
    event: type,
    severity,
    userId: payload.userId,
    socketId: payload.socketId,
    gameId: payload.gameId,
    action: payload.action,
    detail: payload.details,
  })
}
