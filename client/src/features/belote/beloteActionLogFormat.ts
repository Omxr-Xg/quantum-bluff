import type { TFunction } from "i18next";
import { BELOTE_SUIT_LABEL } from "./beloteCardUtils";

export type BeloteLastAction = {
  actionVersion: number;
  phase: string;
  playerId: string;
  playerName: string;
  action: string;
  value?: number;
  trump?: string;
  card?: { suit: string; rank: string };
};

function trumpLabel(trump: string | undefined, t: TFunction): string {
  if (!trump) return "";
  if (trump === "ALL_TRUMP") return t("belote.allTrump");
  if (trump === "NO_TRUMP") return t("belote.noTrump");
  return BELOTE_SUIT_LABEL[trump] ?? trump;
}

function cardLabel(suit?: string, rank?: string): string {
  if (!suit || !rank) return "";
  const sym = BELOTE_SUIT_LABEL[suit] ?? suit;
  return `${rank}${sym}`;
}

function phaseLabel(phase: string, t: TFunction): string {
  const key = `belote.actionLogPhase.${phase}`;
  const translated = t(key);
  return translated === key ? phase : translated;
}

export function formatBeloteActionLogLine(
  entry: {
    phase: string;
    playerName: string;
    action: string;
    value?: number;
    trump?: string;
    cardSuit?: string;
    cardRank?: string;
    card?: { suit: string; rank: string };
    playerId?: string;
  },
  t: TFunction,
  myUserId?: string,
): string {
  const phase = phaseLabel(entry.phase, t);
  const name =
    entry.playerId && myUserId && entry.playerId === myUserId
      ? t("game.you")
      : entry.playerName;
  const trump = trumpLabel(entry.trump, t);
  const card =
    entry.card != null
      ? cardLabel(entry.card.suit, entry.card.rank)
      : cardLabel(entry.cardSuit, entry.cardRank);

  let detail = "";
  switch (entry.action) {
    case "PASS":
      detail = t("belote.actionLogPass", { name });
      break;
    case "BID":
      detail = t("belote.actionLogBid", { name, value: entry.value ?? 0, trump });
      break;
    case "CONTREE":
      detail = t("belote.actionLogContree", { name });
      break;
    case "SURCONTREE":
      detail = t("belote.actionLogSurcontree", { name });
      break;
    case "TAKE":
      detail = t("belote.actionLogTake", { name });
      break;
    case "CHOOSE_TRUMP":
      detail = t("belote.actionLogChooseTrump", { name, trump });
      break;
    case "PLAY_CARD":
      detail = t("belote.actionLogPlay", { name, card });
      break;
    default:
      detail = `${name} — ${entry.action}`;
  }

  return t("belote.actionLogLine", { phase, detail });
}
