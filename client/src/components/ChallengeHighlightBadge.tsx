import { useTranslation } from "react-i18next";

export function ChallengeHighlightBadge({ show }: { show: boolean }) {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute -right-1 -top-2 z-30 animate-bounce rounded-full border border-amber-200/60 bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.6)]">
      {t("dailyChallenges.tapHere")}
    </span>
  );
}
