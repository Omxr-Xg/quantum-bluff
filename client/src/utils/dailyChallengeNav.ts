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

const CODE_START_PATH: Partial<Record<string, string>> = {
  INVITE_FRIEND: "/friends",
  WEEKLY_INVITE_FRIEND: "/friends",
  SEND_3_CHAT: "/lobby?tab=poker",
  COMPLETE_ALL_DAILY: "/lobby",
  ONLINE_15_MIN: "/lobby",
  WEEKLY_BONUS: "/lobby",
};

const CATEGORY_START_PATH: Record<string, string> = {
  POKER: "/lobby?tab=poker",
  ROULETTE: "/minigames?game=roulette",
  MULTIPLAYER: "/lobby?tab=poker",
  SLOT: "/minigames?game=slots",
  BLACKJACK: "/blackjack",
  CRASH: "/minigames/crash",
  BELOTE: "/lobby?tab=belote",
  WHEEL: "/minigames/wheel",
  LUCKY_NUMBER: "/minigames/lucky-number",
  SOCIAL: "/friends",
  DAILY_ACTIVITY: "/lobby",
  GLOBAL: "/lobby?tab=poker",
};

export function getDailyChallengeStartPath(challenge: DailyChallengeDto): string {
  return (
    CODE_START_PATH[challenge.code] ??
    CATEGORY_START_PATH[challenge.category] ??
    "/lobby"
  );
}
