import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle, Target, Trophy } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { apiFetch, apiUrl } from "../utils/apiBase";
import { useTranslation } from "react-i18next";
import { getAuthItem, setAuthItem } from "../utils/authStorage";
import { mergeGamificationFromServerResponse } from "../utils/gamificationStorage";

interface Challenge {
  code: string;
  i18nKey: string;
  category: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  rewardTokens: number;
}

interface WeeklyChallenge {
  weekKey: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  rewardTokens: number;
  badgeId: string;
}

export function DailyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [weekly, setWeekly] = useState<WeeklyChallenge | null>(null);
  const [cycleDay, setCycleDay] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { t } = useTranslation();
  const { userId } = useUser();

  const fetchChallenges = useCallback(async () => {
    if (!userId) {
      setChallenges([]);
      setWeekly(null);
      setErrorKey(null);
      setLoading(false);
      return;
    }

    try {
      const token = getAuthItem("token");
      if (!token) {
        setChallenges([]);
        setErrorKey("dailyChallenges.errors.auth");
        setLoading(false);
        return;
      }

      const res = await apiFetch(apiUrl("/api/daily-challenges/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        setChallenges([]);
        setErrorKey("dailyChallenges.errors.loadFailed");
        return;
      }

      setChallenges(data.challenges || []);
      setWeekly(data.weekly ?? null);
      setCycleDay(typeof data.cycleDay === "number" ? data.cycleDay : 1);
      setErrorKey(null);
    } catch (err) {
      console.error("DailyChallenges error:", err);
      setErrorKey("dailyChallenges.errors.network");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const deferMs = 300;
    const id = window.setTimeout(() => void fetchChallenges(), deferMs);
    return () => window.clearTimeout(id);
  }, [fetchChallenges]);

  useEffect(() => {
    const onRewards = () => {
      void fetchChallenges();
    };
    window.addEventListener("user-rewards-updated", onRewards);
    return () => window.removeEventListener("user-rewards-updated", onRewards);
  }, [fetchChallenges]);

  useEffect(() => {
    if (!userId) return;
    const token = getAuthItem("token");
    if (!token) return;

    const tick = () => {
      void apiFetch(apiUrl("/api/daily-challenges/presence-minute"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    };

    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [userId]);

  const handleClaim = async (challengeCode: string) => {
    try {
      const token = getAuthItem("token");
      if (!token) {
        setErrorKey("dailyChallenges.errors.auth");
        return;
      }

      const res = await fetch(apiUrl(`/api/daily-challenges/${challengeCode}/claim`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setErrorKey(null);
        if (typeof data.chips === "number") {
          setAuthItem("quantum_bluff_balance", String(data.chips));
        }
        if (Array.isArray(data.newBadges) && data.newBadges.length > 0) {
          mergeGamificationFromServerResponse({ newBadges: data.newBadges });
        }
        window.dispatchEvent(new Event("auth-changed"));
        await fetchChallenges();
      } else {
        console.error(data.error);
        setErrorKey("dailyChallenges.errors.claimFailed");
      }
    } catch (err) {
      console.error("Claim error:", err);
      setErrorKey("dailyChallenges.errors.claimNetwork");
    }
  };

  const renderChallengeCard = (c: Challenge) => {
    const percent = c.goal > 0 ? Math.min(100, (c.progress / c.goal) * 100) : 0;
    const categoryKey = `dailyChallenges.categories.${c.category}`;

    return (
      <div
        key={c.code}
        className={`rounded-lg border p-2 transition ${
          c.completed
            ? "border-emerald-400/25 bg-emerald-950/25"
            : "border-white/10 bg-white/[0.045] backdrop-blur-md"
        }`}
      >
        <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/70">
          {t(categoryKey, c.category)}
        </div>
        <div className="mb-1 flex items-center justify-between gap-2 text-xs xl:text-sm">
          <span className="flex min-w-0 items-center gap-1.5 text-white">
            {c.completed && (
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-400" aria-hidden />
            )}
            <span className="truncate">{t(c.i18nKey)}</span>
          </span>
          <span className="shrink-0 text-gray-400">
            {c.progress}/{c.goal}
          </span>
        </div>

        <div className="relative w-full py-0.5">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-amber-300/14 blur-md" />
          <div className="relative h-1 overflow-hidden rounded-full border border-amber-200/24 bg-slate-950/60 backdrop-blur-sm">
            <div
              className={`relative h-full transition-all duration-500 ease-out animate-[challenge-gradient-flow_3s_ease_infinite] ${
                c.completed
                  ? "bg-gradient-to-r from-yellow-500 via-amber-100 to-amber-400"
                  : "bg-gradient-to-r from-amber-700 via-yellow-100 to-amber-500"
              }`}
              style={{
                width: `${percent}%`,
                backgroundSize: "200% auto",
                boxShadow: c.completed
                  ? "0 0 15px 1px rgba(251, 191, 36, 0.58)"
                  : "0 0 15px 1px rgba(245, 158, 11, 0.56)",
              }}
            />
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-amber-100/85 xl:text-xs">
          {t("dailyChallenges.rewardWithChips", { amount: c.rewardTokens })}
        </div>

        {c.completed && !c.claimed && (
          <button
            type="button"
            className="mt-2 w-full rounded bg-green-500 py-1.5 text-sm transition hover:bg-green-600"
            onClick={() => void handleClaim(c.code)}
          >
            {t("dailyChallenges.claimReward")}
          </button>
        )}

        {c.claimed && (
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-green-400">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
            {t("dailyChallenges.claimed")}
          </div>
        )}
      </div>
    );
  };

  const heading = (
    <div className="mb-2">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white xl:text-xl">
        <Target className="h-5 w-5 shrink-0 text-amber-200/90 xl:h-6 xl:w-6" aria-hidden />
        {t("dailyChallenges.title")}
      </h2>
      <p className="mt-0.5 text-xs text-slate-400">
        {t("dailyChallenges.cycleDay", { day: cycleDay })}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-200/16 bg-slate-900/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl xl:p-4">
        <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-200/[0.07] via-blue-950/[0.12] to-transparent" />
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          {heading}
          <p className="text-gray-400 text-sm">{t("dailyChallenges.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-200/16 bg-slate-900/58 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl xl:p-4">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-200/[0.07] via-blue-950/[0.12] to-transparent" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {heading}

        {challenges.length === 0 && (
          <p className="text-gray-400 text-sm">{t("dailyChallenges.empty")}</p>
        )}
        {errorKey && (
          <p className="text-slate-500 text-xs mt-2">{t("dailyChallenges.retryLater")}</p>
        )}

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {challenges.map(renderChallengeCard)}

          {weekly && (
            <div className="mt-3 rounded-xl border border-violet-300/20 bg-violet-950/20 p-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-violet-100">
                <Trophy className="h-4 w-4 text-violet-200" aria-hidden />
                {t("dailyChallenges.weeklyTitle")}
              </div>
              <p className="mb-2 text-xs text-violet-100/80">{t("dailyChallenges.weeklyComplete20")}</p>
              <div className="mb-1 flex justify-between text-xs text-violet-100/70">
                <span>{t("dailyChallenges.weeklyProgress")}</span>
                <span>
                  {weekly.progress}/{weekly.goal}
                </span>
              </div>
              <div className="relative mb-2 h-1 overflow-hidden rounded-full border border-violet-200/20 bg-slate-950/60">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 via-fuchsia-200 to-violet-400 transition-all"
                  style={{
                    width: `${weekly.goal > 0 ? Math.min(100, (weekly.progress / weekly.goal) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-violet-100/85">
                {t("dailyChallenges.weeklyReward", {
                  chips: weekly.rewardTokens,
                  badge: t(`gamification.badge.${weekly.badgeId}.name`, weekly.badgeId),
                })}
              </p>
              {weekly.completed && !weekly.claimed && (
                <button
                  type="button"
                  className="mt-2 w-full rounded bg-violet-500 py-1.5 text-sm font-semibold transition hover:bg-violet-400"
                  onClick={() => void handleClaim("WEEKLY_COMPLETE_20")}
                >
                  {t("dailyChallenges.claimWeekly")}
                </button>
              )}
              {weekly.claimed && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs text-violet-200">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {t("dailyChallenges.claimed")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes challenge-gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}
