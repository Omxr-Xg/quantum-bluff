import { PokerCard } from "../PokerCard";
import {
  BELOTE_SUIT_LABEL,
  BELOTE_SUITS,
  mapBeloteSuit,
} from "../../features/belote/beloteCardUtils";

const SUIT_ACCENT: Record<(typeof BELOTE_SUITS)[number], string> = {
  HEARTS: "border-red-400/60 bg-red-950/40 hover:bg-red-900/50 focus-visible:ring-red-400/80",
  DIAMONDS: "border-orange-400/55 bg-orange-950/35 hover:bg-orange-900/45 focus-visible:ring-orange-400/80",
  CLUBS: "border-emerald-400/55 bg-emerald-950/40 hover:bg-emerald-900/50 focus-visible:ring-emerald-400/80",
  SPADES: "border-slate-300/50 bg-slate-900/55 hover:bg-slate-800/60 focus-visible:ring-slate-300/80",
};

export function BeloteSuitPicker({
  onSelect,
  disabled = false,
  size = "sm",
}: {
  onSelect: (suit: (typeof BELOTE_SUITS)[number]) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      {BELOTE_SUITS.map((suit) => (
        <button
          key={suit}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(suit)}
          className={`flex flex-col items-center gap-1 rounded-xl border-2 px-2.5 py-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-40 ${SUIT_ACCENT[suit]}`}
          aria-label={suit}
        >
          <span className="text-2xl font-bold leading-none sm:text-3xl">
            {BELOTE_SUIT_LABEL[suit]}
          </span>
          <PokerCard
            suit={mapBeloteSuit(suit)}
            value="A"
            size={size}
            animated={false}
            className="pointer-events-none shadow-md"
          />
        </button>
      ))}
    </div>
  );
}
