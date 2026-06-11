import type { DailyChallengeDto } from "../services/api";

/** Plus proche de la complétion en premier ; récupérés en dernier. */
export function sortChallengesByCompletionProximity(
  challenges: DailyChallengeDto[],
): DailyChallengeDto[] {
  return [...challenges].sort((a, b) => {
    if (a.claimed !== b.claimed) return a.claimed ? 1 : -1;
    if (a.completed !== b.completed) {
      if (a.completed && !a.claimed) return -1;
      if (b.completed && !b.claimed) return 1;
      return a.completed ? 1 : -1;
    }
    const ratioA = a.goal > 0 ? a.progress / a.goal : 0;
    const ratioB = b.goal > 0 ? b.progress / b.goal : 0;
    if (ratioB !== ratioA) return ratioB - ratioA;
    return a.goal - a.progress - (b.goal - b.progress);
  });
}

import { getChallengeStartNavigation } from "./challengeHighlight";

export function getDailyChallengeStartPath(challenge: DailyChallengeDto): string {
  return getChallengeStartNavigation(challenge).path;
}

export { getChallengeStartNavigation, storeChallengeNextHighlight } from "./challengeHighlight";
