import type { LucideIcon, RefObject } from "react";
import { ChallengeHighlightBadge } from "./ChallengeHighlightBadge";
import { challengeHighlightClass } from "../utils/challengeHighlight";

export const lobbySoloPlayBlockClass =
  "shrink-0 rounded-2xl border border-white/10 bg-white/[0.055] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-3.5";

export type LobbySoloPlayAccent = {
  icon: string;
  primaryBtn: string;
};

export const lobbySoloPlayAccents = {
  poker: {
    icon: "text-blue-200",
    primaryBtn:
      "border-blue-300/15 bg-blue-950/75 hover:border-blue-200/25 hover:bg-blue-900/80",
  },
  blackjack: {
    icon: "text-rose-200",
    primaryBtn:
      "border-rose-300/15 bg-rose-950/75 hover:border-rose-200/25 hover:bg-rose-900/80",
  },
  belote: {
    icon: "text-emerald-200",
    primaryBtn:
      "border-emerald-300/15 bg-emerald-950/75 hover:border-emerald-200/25 hover:bg-emerald-900/80",
  },
} satisfies Record<string, LobbySoloPlayAccent>;

type LobbySoloPlayBlockProps = {
  tourRef?: RefObject<HTMLDivElement | null>;
  icon: LucideIcon;
  title: string;
  description: string;
  buttonLabel: string;
  onClick: () => void;
  disabled?: boolean;
  accent: LobbySoloPlayAccent;
  challengeHighlightId?: string;
  challengeHighlightActive?: boolean;
  className?: string;
};

export function LobbySoloPlayBlock({
  tourRef,
  icon: Icon,
  title,
  description,
  buttonLabel,
  onClick,
  disabled = false,
  accent,
  challengeHighlightId,
  challengeHighlightActive = false,
  className = "",
}: LobbySoloPlayBlockProps) {
  const highlighted = Boolean(challengeHighlightId && challengeHighlightActive);

  return (
    <div
      ref={tourRef}
      data-challenge-highlight={challengeHighlightId}
      className={`${lobbySoloPlayBlockClass} ${className}`.trim()}
    >
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold text-white sm:text-lg">
        <Icon className={`h-5 w-5 shrink-0 sm:h-6 sm:w-6 ${accent.icon}`} aria-hidden />
        {title}
      </h2>
      <p className="mb-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-400 sm:min-h-[2.75rem]">
        {description}
      </p>
      <button
        type="button"
        data-challenge-highlight={challengeHighlightId}
        disabled={disabled}
        onClick={onClick}
        className={challengeHighlightClass(
          highlighted,
          `relative w-full rounded-xl border py-2 text-sm font-bold text-white shadow-lg shadow-black/20 transition disabled:cursor-not-allowed disabled:opacity-60 sm:py-2.5 sm:text-base md:py-3 ${accent.primaryBtn}`,
        )}
        aria-label={buttonLabel}
      >
        <ChallengeHighlightBadge show={highlighted} />
        {buttonLabel}
      </button>
    </div>
  );
}
