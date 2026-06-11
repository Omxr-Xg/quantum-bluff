/** Cible visuelle sur le lobby ou une page liée. */
export type ChallengeHighlightId =
  | "poker-waiting"
  | "poker-create"
  | "poker-bot"
  | "belote-waiting"
  | "belote-create"
  | "minigames-quick"
  | "minigames-retro"
  | "blackjack-play"
  | "blackjack-multi"
  | "friends-add"
  | "crash"
  | "wheel"
  | "mines"
  | "roulette"
  | "slots"
  | "lucky-number";

export const CHALLENGE_HIGHLIGHT_NEXT_KEY = "qb-challenge-highlight-next";

export const CHALLENGE_HIGHLIGHT_RING_CLASS =
  "relative z-20 !ring-2 !ring-amber-400 !ring-offset-2 !ring-offset-slate-950 shadow-[0_0_28px_rgba(251,191,36,0.55)] animate-pulse";

export function challengeHighlightClass(active: boolean, base = ""): string {
  return active ? `${base} ${CHALLENGE_HIGHLIGHT_RING_CLASS}`.trim() : base;
}

export type ChallengeStartNav = {
  path: string;
  highlight: ChallengeHighlightId;
  /** Surlignage sur la page suivante après l’action lobby (ex. crash sur quick-solo). */
  nextHighlight?: ChallengeHighlightId;
};

function lobbyPath(tab: "poker" | "minigames" | "blackjack" | "belote", highlight: ChallengeHighlightId): string {
  const params = new URLSearchParams();
  if (tab !== "poker") params.set("tab", tab);
  params.set("highlight", highlight);
  const q = params.toString();
  return q ? `/lobby?${q}` : "/lobby";
}

const CODE_NAV: Partial<Record<string, ChallengeStartNav>> = {
  INVITE_FRIEND: { path: "/friends?highlight=friends-add", highlight: "friends-add" },
  WEEKLY_INVITE_FRIEND: { path: "/friends?highlight=friends-add", highlight: "friends-add" },
  SEND_3_CHAT: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
  COMPLETE_ALL_DAILY: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
  ONLINE_15_MIN: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
  WEEKLY_BONUS: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
};

const CATEGORY_NAV: Record<string, ChallengeStartNav> = {
  POKER: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
  MULTIPLAYER: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
  ROULETTE: {
    path: lobbyPath("minigames", "minigames-retro"),
    highlight: "minigames-retro",
    nextHighlight: "roulette",
  },
  SLOT: {
    path: lobbyPath("minigames", "minigames-retro"),
    highlight: "minigames-retro",
    nextHighlight: "slots",
  },
  LUCKY_NUMBER: {
    path: lobbyPath("minigames", "minigames-retro"),
    highlight: "minigames-retro",
    nextHighlight: "lucky-number",
  },
  BLACKJACK: { path: lobbyPath("blackjack", "blackjack-play"), highlight: "blackjack-play" },
  CRASH: {
    path: lobbyPath("minigames", "minigames-quick"),
    highlight: "minigames-quick",
    nextHighlight: "crash",
  },
  WHEEL: {
    path: lobbyPath("minigames", "minigames-quick"),
    highlight: "minigames-quick",
    nextHighlight: "wheel",
  },
  BELOTE: { path: lobbyPath("belote", "belote-waiting"), highlight: "belote-waiting" },
  SOCIAL: { path: "/friends?highlight=friends-add", highlight: "friends-add" },
  DAILY_ACTIVITY: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
  GLOBAL: { path: lobbyPath("poker", "poker-waiting"), highlight: "poker-waiting" },
};

export function getChallengeStartNavigation(challenge: {
  code: string;
  category: string;
}): ChallengeStartNav {
  return (
    CODE_NAV[challenge.code] ??
    CATEGORY_NAV[challenge.category] ?? {
      path: lobbyPath("poker", "poker-waiting"),
      highlight: "poker-waiting",
    }
  );
}

export function storeChallengeNextHighlight(next?: ChallengeHighlightId): void {
  if (!next) {
    sessionStorage.removeItem(CHALLENGE_HIGHLIGHT_NEXT_KEY);
    return;
  }
  sessionStorage.setItem(CHALLENGE_HIGHLIGHT_NEXT_KEY, next);
}

export function consumeChallengeNextHighlight(): ChallengeHighlightId | null {
  const raw = sessionStorage.getItem(CHALLENGE_HIGHLIGHT_NEXT_KEY);
  sessionStorage.removeItem(CHALLENGE_HIGHLIGHT_NEXT_KEY);
  if (!raw) return null;
  return raw as ChallengeHighlightId;
}
