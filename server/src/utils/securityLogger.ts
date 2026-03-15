import fs from 'fs'
import path from 'path'

type SuspiciousActionType =
  | 'MISSING_TOKEN'
  | 'INVALID_TOKEN'
  | 'PLAYER_ID_MISMATCH'
  | 'UNAUTHORIZED_JOIN'
  | 'GAME_NOT_FOUND'
  | 'NOT_YOUR_TURN'
  | 'INVALID_RAISE'
  | 'ACTION_ERROR'
  | 'TOO_MANY_ACTIONS'
  | 'RECONNECT_ERROR'
  | 'BRUTE_FORCE_LOGIN'
  | 'BRUTE_FORCE_REGISTER'

interface SuspiciousLogPayload {
  userId?: string
  socketId?: string
  gameId?: string
  action?: string
  details?: unknown
}

const logsDir = path.resolve(process.cwd(), 'logs')
const logFilePath = path.join(logsDir, 'security.log')

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
}

export function logSuspiciousAction(
  type: SuspiciousActionType,
  payload: SuspiciousLogPayload
) {
  const entry = {
    timestamp: new Date().toISOString(),
    type,
    ...payload
  }

  ensureLogsDir()
  fs.appendFileSync(logFilePath, JSON.stringify(entry) + '\n', 'utf8')

  console.warn('[ANTI-CHEAT]', entry)
}