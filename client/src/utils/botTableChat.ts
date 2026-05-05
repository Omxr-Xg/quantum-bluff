/**
 * Répliques table (emoji + texte) pour les bots — difficulté + contexte d’action.
 * L’expert Python peut envoyer `style` (value / bluff / …) pour affiner le ton.
 */

export type BotTableDifficulty = "easy" | "medium" | "hard" | "expert";

export type BotTableActionKind = "fold" | "check" | "call" | "raise";

function roll(p: number): boolean {
  return Math.random() < p;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function normStyle(s: string | undefined): string {
  return (s ?? "").toLowerCase();
}

/** Probabilité qu’un bot réponde après un message du joueur. */
export function shouldBotReplyToHuman(difficulty: BotTableDifficulty): boolean {
  const p = { easy: 0.42, medium: 0.55, hard: 0.64, expert: 0.74 }[difficulty];
  return roll(p);
}

/** Probabilité d’une petite phrase après une action bot. */
export function shouldBotTauntAfterAction(difficulty: BotTableDifficulty): boolean {
  const p = { easy: 0.2, medium: 0.3, hard: 0.4, expert: 0.5 }[difficulty];
  return roll(p);
}

const EMOJI_REACT = ["🔥", "😎", "💰", "🎯", "👑", "💪", "🎲", "🃏", "✨", "🧠", "😏", "🤝", "⚡"];
const EMOJI_TAUNT_FOLD = ["🙈", "😌", "🤷", "💨", "✋"];
const EMOJI_TAUNT_CALL = ["👀", "🙂", "🧊", "💧"];
const EMOJI_TAUNT_CHECK = ["🫡", "😶", "⏸️"];
const EMOJI_TAUNT_RAISE = ["🔥", "📈", "💣", "🦁", "⚔️"];

const REPLY_TO_EMOJI: Record<BotTableDifficulty, { emoji: string[]; text: string[] }> = {
  easy: {
    emoji: ["🔥", "😄", "🎲", "👍"],
    text: ["Sympa 😄", "J’aime bien", "On verra au showdown", "Cool"],
  },
  medium: {
    emoji: ["🎯", "🧠", "😏", "🤝"],
    text: ["Noté.", "Ça parle.", "Intéressant.", "Je garde ça en tête."],
  },
  hard: {
    emoji: ["🧠", "😏", "⚡", "🃏"],
    text: ["Ok.", "Message reçu.", "Tu marques des points au chat.", "Hm."],
  },
  expert: {
    emoji: ["🧠", "🎯", "♟️", "📊", "😈", "🤐"],
    text: [
      "Le meta-table, j’aime bien.",
      "Tu parles beaucoup pour quelqu’un qui doit encore défendre ses blinds.",
      "Cute. Maintenant les jetons.",
      "Psychologie live — noté.",
    ],
  },
};

const REPLY_TO_TEXT: Record<BotTableDifficulty, { emoji: string[]; text: string[] }> = {
  easy: {
    emoji: ["👍", "😅", "🎉"],
    text: ["Gg spirit !", "Bien vu", "Haha ok", "On joue"],
  },
  medium: {
    emoji: ["🤔", "👀", "📝"],
    text: ["D’accord.", "On verra sur le board.", "Conversation +EV ?", "Tu testes le tilt ?"],
  },
  hard: {
    emoji: ["😐", "📉", "🎭"],
    text: ["Paroles, paroles…", "Focus tapis.", "Less talk, more fold equity."],
  },
  expert: {
    emoji: ["🧠", "🎙️", "📡", "🗿"],
    text: [
      "Tu cadres mal ton range quand tu parles trop.",
      "Nice story. Les maths restent les maths.",
      "Table talk niveau rec — mignon.",
      "Garde ça pour le podcast.",
    ],
  },
};

export function pickBotReplyToHuman(
  difficulty: BotTableDifficulty,
  humanType: "emoji" | "text",
  _humanContent: string,
): { content: string; type: "emoji" | "text" } {
  const pool = humanType === "emoji" ? REPLY_TO_EMOJI[difficulty] : REPLY_TO_TEXT[difficulty];
  const wantEmoji = humanType === "emoji" ? roll(0.72) : roll(0.38);
  if (wantEmoji) {
    return { content: pick([...pool.emoji, ...EMOJI_REACT]), type: "emoji" };
  }
  return { content: pick(pool.text), type: "text" };
}

function potTier(pot: number): "micro" | "small" | "medium" | "big" {
  if (pot < 120) return "micro";
  if (pot < 320) return "small";
  if (pot < 900) return "medium";
  return "big";
}

const TAUNT_FOLD: Record<BotTableDifficulty, string[]> = {
  easy: ["Trop cher pour moi là 😅", "Je laisse, next", "Pas envie de flip"],
  medium: ["Fold. Spot pas terrible.", "Je passe, range trop étroit.", "Pas la peine de torcher."],
  hard: ["Bon fold.", "Tu m’as sorti du pot, bravo.", "Discipline > ego."],
  expert: [
    "Fold EV+. Parfois la meilleure play est la plus fade.",
    "Je ne paye pas ce prix avec ce sous-ensemble.",
    "Nice pressure — je me range.",
  ],
};

const TAUNT_CALL: Record<BotTableDifficulty, string[]> = {
  easy: ["Je paie, on voit", "Call, curieux 👀", "Ok je viens"],
  medium: ["Call. Pot odds ok.", "Je défends.", "Payé — montre-moi le bluff."],
  hard: ["Call discipliné.", "Tu veux me barber ? J’ai le bon prix.", "Je capte ta line."],
  expert: [
    "Prix correct — j’appelle avec le bon bout de range.",
    "Tu sous-bluff trop souvent ici ? On verra.",
    "Call structuré. River décidera.",
  ],
};

const TAUNT_CHECK: Record<BotTableDifficulty, string[]> = {
  easy: ["Check", "Je laisse passer", "Tranquille 🫡"],
  medium: ["Check back possible plus tard…", "Pas de value thin ici.", "Je contrôle le pot."],
  hard: ["Check. Equity réalisation.", "Je ne sur-joue pas ce spot.", "Pot maîtrisé."],
  expert: [
    "Check — range advantage fragile.",
    "Pas de merge idiot sur cette texture.",
    "Je préfère SDV / realise equity.",
  ],
};

const TAUNT_RAISE: Record<BotTableDifficulty, string[]> = {
  easy: ["Je monte ! 🔥", "Raise, j’ai un feeling", "Let’s go"],
  medium: ["Raise — pression.", "J’agis ici.", "Je prends l’initiative."],
  hard: ["Raise pour deny equity.", "Tu vas devoir prendre une décision.", "Polarisé ? Peut-être."],
  expert: [
    "Raise optimal sizing — adapte-toi.",
    "J’attaque ton continue range.",
    "Bluff fréquent ici ? Monte la preuve.",
  ],
};

const TAUNT_BIG_POT: string[] = [
  "Gros pot — ça va piquer 💰",
  "Le pot grossit…",
  "Tapis mental activé 🧠",
];

const TAUNT_BLUFF_EXTRA: string[] = [
  "Tu aimes la ligne thin ? Moi aussi.",
  "Bluff ou value — devine 😈",
  "Storytelling > cartes, parfois.",
];

export function pickBotTauntAfterAction(input: {
  difficulty: BotTableDifficulty;
  action: BotTableActionKind;
  style?: string;
  pot: number;
}): { content: string; type: "emoji" | "text" } {
  const st = normStyle(input.style);
  const isBluffish = st.includes("bluff") || st.includes("semi");
  const tier = potTier(input.pot);

  let lines: string[];
  switch (input.action) {
    case "fold":
      lines = [...TAUNT_FOLD[input.difficulty]];
      break;
    case "call":
      lines = [...TAUNT_CALL[input.difficulty]];
      break;
    case "check":
      lines = [...TAUNT_CHECK[input.difficulty]];
      break;
    default:
      lines = [...TAUNT_RAISE[input.difficulty]];
  }

  if (isBluffish) lines = [...lines, ...TAUNT_BLUFF_EXTRA];
  if (tier === "big" && roll(0.35)) {
    lines = [...lines, ...TAUNT_BIG_POT];
  }

  const useEmoji =
    input.difficulty === "easy"
      ? roll(0.45)
      : input.difficulty === "medium"
        ? roll(0.35)
        : input.difficulty === "hard"
          ? roll(0.28)
          : roll(0.22);

  if (useEmoji) {
    const emojiPool =
      input.action === "fold"
        ? EMOJI_TAUNT_FOLD
        : input.action === "call"
          ? EMOJI_TAUNT_CALL
          : input.action === "check"
            ? EMOJI_TAUNT_CHECK
            : EMOJI_TAUNT_RAISE;
    return { content: pick([...emojiPool, ...EMOJI_REACT]), type: "emoji" };
  }

  return { content: pick(lines), type: "text" };
}
