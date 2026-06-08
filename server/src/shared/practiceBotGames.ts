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

/** Oracle statistique expert (équité / trous connus) — ancien niveau « expert ». */
export function usesStatisticalExpertOracle(difficulty: BotDifficulty): boolean {
  return difficulty === 'hard'
}

/** IA adaptative (profil tendances + ajustements) — niveau « expert » actuel. */
export function usesAdaptiveExpertAi(difficulty: BotDifficulty): boolean {
  return difficulty === 'expert'
}

export function usesExpertOraclePath(difficulty: BotDifficulty): boolean {
  return usesStatisticalExpertOracle(difficulty) || usesAdaptiveExpertAi(difficulty)
}
