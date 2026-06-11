import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle, Target, Trophy, X } from "lucide-react";
import type { DailyChallengeDto } from "../services/api";
import {
  getChallengeStartNavigation,
  sortChallengesByCompletionProximity,
  storeChallengeNextHighlight,
} from "../utils/dailyChallengeNav";
import { isSocialFollowChallenge } from "../utils/socialFollowChallenge";

type WeeklyBonus = {
  code: string;
  i18nKey: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  rewardTokens: number;
  badgeId: string;
};

type DailyChallengesPanelProps = {
  open: boolean;
  onClose: () => void;
  challenges: DailyChallengeDto[];
  weeklyChallenges: DailyChallengeDto[];
  weeklyBonus: WeeklyBonus | null;
  cycleDay: number;
  claiming: boolean;
  onClaim: (code: string) => void;
  onStartSocialFollow?: (code: string) => void;
};

export function DailyChallengesPanel({
  open,
  onClose,
  challenges,
  weeklyChallenges,
  weeklyBonus,
  cycleDay,
  claiming,
  onClaim,
  onStartSocialFollow,
}: DailyChallengesPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const sortedDaily = sortChallengesByCompletionProximity(challenges);
  const sortedWeekly = sortChallengesByCompletionProximity(weeklyChallenges);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const renderRow = (c: DailyChallengeDto, variant: "daily" | "weekly") => {
    const percent = c.goal > 0 ? Math.min(100, (c.progress / c.goal) * 100) : 0;
    const isWeekly = variant === "weekly";
    const categoryKey = `dailyChallenges.categories.${c.category}`;
    const showStart = !c.completed && !c.claimed;

    return (
      <li
        key={c.code}
        className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-stretch sm:gap-3 ${
          c.completed
            ? isWeekly
              ? "border-violet-400/25 bg-violet-950/25"
              : "border-emerald-400/25 bg-emerald-950/25"
            : isWeekly
              ? "border-violet-200/12 bg-violet-950/15"
              : "border-white/10 bg-white/[0.045]"
        }`}
      >
        <div className="min-w-0 flex-1">
          <div
            className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${
              isWeekly ? "text-violet-200/70" : "text-amber-200/70"
            }`}
          >
            {t(categoryKey, c.category)}
          </div>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 text-white">
              {c.completed ? (
                <CheckCircle className="h-4 w-4 shrink-0 text-green-400" aria-hidden />
              ) : null}
              <span>{t(c.i18nKey)}</span>
            </span>
            <span className="shrink-0 text-slate-400">
              {c.progress}/{c.goal}
            </span>
          </div>
          <div className="relative h-1 overflow-hidden rounded-full border border-white/10 bg-slate-950/60">
            <div
              className={`h-full transition-all ${
                c.completed
                  ? isWeekly
                    ? "bg-gradient-to-r from-violet-600 to-violet-400"
                    : "bg-gradient-to-r from-amber-500 to-amber-300"
                  : isWeekly
                    ? "bg-gradient-to-r from-violet-700 to-violet-500"
                    : "bg-gradient-to-r from-amber-700 to-amber-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className={`mt-1.5 text-xs ${isWeekly ? "text-violet-100/85" : "text-amber-100/85"}`}>
            {t("dailyChallenges.rewardWithChips", { amount: c.rewardTokens })}
          </p>
          {c.completed && !c.claimed ? (
            <button
              type="button"
              disabled={claiming}
              className={`mt-2 w-full rounded-lg py-2 text-sm font-semibold transition disabled:opacity-50 sm:w-auto sm:px-4 ${
                isWeekly ? "bg-violet-500 hover:bg-violet-400" : "bg-green-500 hover:bg-green-600"
              }`}
              onClick={() => onClaim(c.code)}
            >
              {t("dailyChallenges.claimReward")}
            </button>
          ) : null}
          {c.claimed ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("dailyChallenges.claimed")}
            </p>
          ) : null}
        </div>
        {showStart ? (
          <button
            type="button"
            className="shrink-0 self-stretch rounded-xl border border-amber-300/25 bg-amber-800/80 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700/90 sm:self-center"
            onClick={() => {
              if (isSocialFollowChallenge(c.code)) {
                onStartSocialFollow?.(c.code);
                return;
              }
              const nav = getChallengeStartNavigation(c);
              storeChallengeNextHighlight(nav.nextHighlight);
              onClose();
              navigate(nav.path);
            }}
          >
            {isSocialFollowChallenge(c.code)
              ? t("dailyChallenges.followSocial")
              : t("dailyChallenges.start")}
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[280] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="daily-challenges-panel-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-amber-200/20 bg-slate-950/98 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
          <div>
            <h2 id="daily-challenges-panel-title" className="flex items-center gap-2 text-lg font-bold text-white">
              <Target className="h-5 w-5 text-amber-200/90" aria-hidden />
              {t("dailyChallenges.panelTitle")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {t("dailyChallenges.cycleDay", { day: cycleDay })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] text-white transition hover:bg-white/10"
            aria-label={t("common.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {sortedDaily.length === 0 ? (
            <p className="text-center text-sm text-slate-500">{t("dailyChallenges.empty")}</p>
          ) : (
            <ul className="space-y-2">{sortedDaily.map((c) => renderRow(c, "daily"))}</ul>
          )}

          {sortedWeekly.length > 0 ? (
            <div className="mt-5 rounded-xl border border-violet-300/20 bg-violet-950/20 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-violet-100">
                <Trophy className="h-4 w-4 text-violet-200" aria-hidden />
                {t("dailyChallenges.weeklyTitle")}
              </div>
              <p className="mb-3 text-xs text-violet-100/75">{t("dailyChallenges.weeklySubtitle")}</p>
              <ul className="space-y-2">{sortedWeekly.map((c) => renderRow(c, "weekly"))}</ul>

              {weeklyBonus ? (
                <div className="mt-3 rounded-lg border border-fuchsia-300/25 bg-fuchsia-950/20 p-3">
                  <p className="mb-1 text-sm font-semibold text-fuchsia-100">{t(weeklyBonus.i18nKey)}</p>
                  <div className="mb-1 flex justify-between text-xs text-fuchsia-100/70">
                    <span>{t("dailyChallenges.weeklyProgress")}</span>
                    <span>
                      {weeklyBonus.progress}/{weeklyBonus.goal}
                    </span>
                  </div>
                  <div className="mb-2 h-1 overflow-hidden rounded-full border border-fuchsia-200/20 bg-slate-950/60">
                    <div
                      className="h-full bg-gradient-to-r from-fuchsia-600 to-fuchsia-400 transition-all"
                      style={{
                        width: `${weeklyBonus.goal > 0 ? Math.min(100, (weeklyBonus.progress / weeklyBonus.goal) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-fuchsia-100/85">
                    {t("dailyChallenges.weeklyReward", {
                      chips: weeklyBonus.rewardTokens,
                      badge: t(`gamification.badge.${weeklyBonus.badgeId}.name`, weeklyBonus.badgeId),
                    })}
                  </p>
                  {weeklyBonus.completed && !weeklyBonus.claimed ? (
                    <button
                      type="button"
                      disabled={claiming}
                      className="mt-2 w-full rounded-lg bg-fuchsia-500 py-2 text-sm font-semibold transition hover:bg-fuchsia-400 disabled:opacity-50"
                      onClick={() => onClaim(weeklyBonus.code)}
                    >
                      {t("dailyChallenges.claimWeekly")}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
