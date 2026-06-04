import { useMemo } from "react";
import { BelotePlayingCard } from "./BelotePlayingCard";
import type { BeloteCard } from "../../features/belote/useBeloteSocket";
import { beloteRankStrength, cardKey } from "../../features/belote/beloteCardUtils";

const SUIT_ORDER = ["SPADES", "HEARTS", "DIAMONDS", "CLUBS"] as const;

/** Tri couleur puis force belote (faible → fort, l’As ou le Valet d’atout à droite). */
function sortHand(cards: BeloteCard[], trump?: string | null): BeloteCard[] {
  return [...cards].sort((a, b) => {
    const s =
      SUIT_ORDER.indexOf(a.suit as (typeof SUIT_ORDER)[number]) -
      SUIT_ORDER.indexOf(b.suit as (typeof SUIT_ORDER)[number]);
    if (s !== 0) return s;
    return beloteRankStrength(a.rank, a.suit, trump) - beloteRankStrength(b.rank, b.suit, trump);
  });
}

export function BelotePlayerHand({
  hand,
  legalCards,
  onCardClick,
  disabled = false,
  mode = "play",
  size = "md",
  trump = null,
}: {
  hand: BeloteCard[];
  /** Cartes autorisées par les règles — seules celles-ci sont cliquables et mises en avant. */
  legalCards?: BeloteCard[];
  onCardClick: (card: BeloteCard) => void;
  disabled?: boolean;
  mode?: "play" | "trump";
  size?: "sm" | "md" | "lg";
  trump?: string | null;
}) {
  const sorted = useMemo(() => sortHand(hand, trump), [hand, trump]);
  const legalSet = useMemo(
    () => new Set((legalCards ?? []).map((c) => cardKey(c))),
    [legalCards],
  );

  const restrictLegal = mode === "play";

  const overlap =
    size === "lg"
      ? "-ml-4 sm:-ml-5"
      : size === "sm"
        ? "-ml-2 sm:-ml-2.5"
        : "-ml-3 sm:-ml-3.5";

  return (
    <div className="w-full max-w-[min(100vw-0.5rem,920px)]">
      <div
        className="flex flex-nowrap items-end justify-center gap-0 overflow-x-auto px-1 pb-0.5 pt-0.5 scroll-smooth scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {sorted.map((card, i) => {
          const key = cardKey(card);
          const isLegal = !restrictLegal || legalSet.has(key);
          const playable = !disabled && (mode === "trump" || isLegal);

          return (
            <button
              key={`${key}-${i}`}
              type="button"
              disabled={!playable}
              onClick={() => playable && onCardClick(card)}
              className={`group relative shrink-0 first:ml-0 ${overlap} transition-all duration-200 ${
                playable
                  ? isLegal && mode === "play"
                    ? "cursor-pointer hover:z-30 hover:-translate-y-2 hover:scale-[1.05] focus-visible:z-30 focus-visible:-translate-y-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    : "cursor-pointer hover:z-30 hover:-translate-y-1 hover:scale-[1.03]"
                  : "cursor-not-allowed opacity-25 saturate-[0.35] brightness-75"
              } ${isLegal && playable ? "z-10" : "z-0"}`}
              style={{ zIndex: isLegal && playable ? 10 + i : i }}
              aria-label={`${card.rank} ${card.suit}`}
              aria-disabled={!playable}
            >
              {isLegal && playable && mode === "play" ? (
                <>
                  <div className="pointer-events-none absolute -inset-1.5 rounded-xl border-2 border-emerald-400/70 shadow-[0_0_14px_rgba(52,211,153,0.45)]" />
                  <div className="pointer-events-none absolute -inset-1 rounded-xl bg-emerald-400/10 opacity-100" />
                </>
              ) : null}
              <BelotePlayingCard
                card={card}
                size={size}
                highlight={false}
                animated={false}
                className={
                  isLegal && playable && mode === "play"
                    ? "relative z-[1]"
                    : restrictLegal && !isLegal
                      ? "relative z-[1] opacity-90"
                      : "relative z-[1]"
                }
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
