import { useMemo } from "react";
import { BelotePlayingCard } from "./BelotePlayingCard";
import type { BeloteCard } from "../../features/belote/useBeloteSocket";
import { beloteRankStrength, cardKey } from "../../features/belote/beloteCardUtils";

const SUIT_ORDER = ["SPADES", "HEARTS", "DIAMONDS", "CLUBS"] as const;

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
  legalCards?: BeloteCard[];
  onCardClick?: (card: BeloteCard) => void;
  disabled?: boolean;
  mode?: "play" | "trump" | "view";
  size?: "xs" | "sm" | "md" | "lg";
  trump?: string | null;
}) {
  const sorted = useMemo(() => sortHand(hand, trump), [hand, trump]);
  const legalSet = useMemo(
    () => (legalCards != null ? new Set(legalCards.map((c) => cardKey(c))) : null),
    [legalCards],
  );

  const restrictLegal = mode === "play";
  const viewOnly = mode === "view";

  const overlap =
    size === "lg"
      ? "-ml-5 sm:-ml-6"
      : size === "xs"
        ? "-ml-1.5 max-[380px]:-ml-1 sm:-ml-2"
        : size === "sm"
          ? "-ml-2.5 max-md:-ml-2 sm:-ml-3"
          : "-ml-4 max-md:-ml-3 sm:-ml-5";

  if (hand.length === 0) return null;

  return (
    <div className="w-full min-w-0">
      <div
        className="flex flex-nowrap items-end justify-center gap-0 overflow-x-auto overflow-y-visible px-1 py-1 scroll-smooth scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {sorted.map((card, i) => {
          const key = cardKey(card);
          const isLegal = !restrictLegal || legalSet == null || legalSet.has(key);
          const playable =
            !viewOnly && !disabled && (mode === "trump" || (mode === "play" && isLegal));

          const cardEl = (
            <BelotePlayingCard
              card={card}
              size={size}
              highlight={false}
              animated={false}
              className={
                restrictLegal && !isLegal && !viewOnly
                  ? "relative z-[1] opacity-90"
                  : "relative z-[1]"
              }
            />
          );

          if (viewOnly) {
            return (
              <div
                key={`${key}-${i}`}
                className={`relative shrink-0 first:ml-0 ${overlap}`}
                style={{ zIndex: i }}
                aria-hidden
              >
                {cardEl}
              </div>
            );
          }

          return (
            <button
              key={`${key}-${i}`}
              type="button"
              disabled={!playable}
              onClick={() => playable && onCardClick?.(card)}
              className={`group relative shrink-0 first:ml-0 ${overlap} transition-all duration-200 ${
                playable
                  ? isLegal && mode === "play"
                    ? "cursor-pointer hover:z-30 hover:-translate-y-2 hover:scale-[1.05]"
                    : "cursor-pointer hover:z-30 hover:-translate-y-1 hover:scale-[1.03]"
                  : "cursor-default opacity-25 saturate-[0.35] brightness-75"
              } ${isLegal && playable ? "z-10" : "z-0"}`}
              style={{ zIndex: isLegal && playable ? 10 + i : i }}
              aria-label={`${card.rank} ${card.suit}`}
            >
              {isLegal && playable && mode === "play" ? (
                <div className="pointer-events-none absolute -inset-1.5 rounded-xl border-2 border-emerald-400/70 shadow-[0_0_14px_rgba(52,211,153,0.45)]" />
              ) : null}
              {cardEl}
            </button>
          );
        })}
      </div>
    </div>
  );
}
