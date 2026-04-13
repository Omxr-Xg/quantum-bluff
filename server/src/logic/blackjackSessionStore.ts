/**
 * Sessions blackjack en mémoire (un process). TTL : abandon = jetons déjà débités au deal.
 * Perdu au redémarrage serveur — acceptable MVP (voir REPORT).
 */
import type { Card } from './blackjack.js'

export type BlackjackSession = {
  shoe: Card[]
  player: Card[]
  dealer: Card[]
  /** Mise initiale (une unité). */
  initialBet: number
  /** Mise totale engagée (initial ou 2× si double). */
  totalBet: number
  updatedAt: number
  /** Reprise du tour pour le wallet / prêts (POST /start). */
  roundId: string
  actionId: string
}

const TTL_MS = 30 * 60 * 1000
const sessions = new Map<string, BlackjackSession>()

export function getSession(userId: string): BlackjackSession | undefined {
  const s = sessions.get(userId)
  if (!s) return undefined
  if (Date.now() - s.updatedAt > TTL_MS) {
    sessions.delete(userId)
    return undefined
  }
  return s
}

export function setSession(userId: string, session: BlackjackSession): void {
  session.updatedAt = Date.now()
  sessions.set(userId, session)
}

export function touchSession(userId: string): void {
  const s = sessions.get(userId)
  if (s) {
    s.updatedAt = Date.now()
  }
}

export function clearSession(userId: string): void {
  sessions.delete(userId)
}
