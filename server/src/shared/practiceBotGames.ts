import type { BotDifficulty } from '../logic/botAI.js'

export const PRACTICE_BOT_GAME_PREFIX = 'practice-bot-'

const difficultyByGameId = new Map<string, BotDifficulty>()

export function isPracticeBotGameId(gameId: string): boolean {
  return gameId.startsWith(PRACTICE_BOT_GAME_PREFIX)
}

export function registerPracticeBotGame(
  gameId: string,
  difficulty: BotDifficulty,
): void {
  difficultyByGameId.set(gameId, difficulty)
}

export function getPracticeBotDifficulty(gameId: string): BotDifficulty {
  return difficultyByGameId.get(gameId) ?? 'medium'
}
