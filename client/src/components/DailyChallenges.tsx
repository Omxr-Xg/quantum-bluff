import { useEffect, useMemo, useState } from "react";
import { CheckCircle, ChevronRight, Target } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { apiUrl } from "../utils/apiBase";
import { useTranslation } from "react-i18next";
import { getAuthItem, setAuthItem } from "../utils/authStorage";
import { mergeGamificationFromServerResponse } from "../utils/gamificationStorage";
import {
  useClaimDailyChallengeMutation,
  useGetDailyChallengesQuery,
  useStartSocialFollowVisitMutation,
  type DailyChallengeDto,
} from "../services/api";
import {
  getSocialFollowUrl,
  isSocialFollowChallenge,
  setPendingSocialFollow,
  type WeeklySocialFollowCode,
} from "../utils/socialFollowChallenge";
import {
  readDailyChallengesCache,
  writeDailyChallengesCache,
} from "../utils/dailyChallengesCache";
import { sortChallengesByCompletionProximity } from "../utils/dailyChallengeNav";
import { DailyChallengesSkeleton } from "./LobbyPanelSkeleton";
import { DailyChallengesPanel } from "./DailyChallengesPanel";
import dailyChallengesBg from "../assets/backg/dailychallenges.webp";

const LOBBY_PREVIEW_COUNT = 3;

export function DailyChallenges() {
  const { t } = useTranslation();
  const { userId } = useUser();
  const [panelOpen, setPanelOpen] = useState(false);

  const cached = useMemo(
    () => (userId ? readDailyChallengesCache(userId) : null),
    [userId],
  );

  const {
    data: live,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useGetDailyChallengesQuery(undefined, {
    skip: !userId,
    refetchOnMountOrArgChange: 30,
  });

  const [claimChallenge, { isLoading: claiming }] = useClaimDailyChallengeMutation();
  const [startSocialVisit] = useStartSocialFollowVisitMutation();

  const data = live ?? cached;
  const challenges = data?.challenges ?? [];
  const weeklyChallenges = data?.weeklyChallenges ?? [];
  const weeklyBonus = data?.weeklyBonus ?? null;
  const cycleDay = data?.cycleDay ?? 1;

  const sortedDaily = useMemo(
    () => sortChallengesByCompletionProximity(challenges),
    [challenges],
  );
  const previewChallenges = sortedDaily.slice(0, LOBBY_PREVIEW_COUNT);
  const hasMore =
    challenges.length > LOBBY_PREVIEW_COUNT ||
    weeklyChallenges.length > 0 ||
    Boolean(weeklyBonus);

  const showSkeleton = isLoading && !data;
  const errorKey =
    isError && !data ? "dailyChallenges.errors.loadFailed" : null;

  useEffect(() => {
    if (live && userId) writeDailyChallengesCache(userId, live);
  }, [live, userId]);

  useEffect(() => {
    const onRewards = () => {
      void refetch();
    };
    window.addEventListener("user-rewards-updated", onRewards);
    return () => window.removeEventListener("user-rewards-updated", onRewards);
  }, [refetch]);

  useEffect(() => {
    if (!userId) return;
    const token = getAuthItem("token");
    if (!token) return;

    const tick = () => {
      void fetch(apiUrl("/api/daily-challenges/presence-minute"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    };

    const startId = window.setTimeout(tick, 2500);
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearTimeout(startId);
      window.clearInterval(id);
    };
  }, [userId]);

  const handleStartSocialFollow = async (code: string) => {
    if (!isSocialFollowChallenge(code)) return;
    try {
      await startSocialVisit(code).unwrap();
      setPendingSocialFollow(code as WeeklySocialFollowCode);
      window.open(getSocialFollowUrl(code as WeeklySocialFollowCode), "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Social follow start error:", err);
    }
  };

  const handleClaim = async (challengeCode: string) => {
    try {
      const result = await claimChallenge(challengeCode).unwrap();
      if (typeof result.chips === "number") {
        setAuthItem("quantum_bluff_balance", String(result.chips));
      }
      if (Array.isArray(result.newBadges) && result.newBadges.length > 0) {
        mergeGamificationFromServerResponse({ newBadges: result.newBadges });
      }
      window.dispatchEvent(new Event("auth-changed"));
    } catch (err) {
      console.error("Claim error:", err);
    }
  };

  const openPanel = () => setPanelOpen(true);

  const renderPreviewCard = (c: DailyChallengeDto) => {
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
            {c.completed ? (
              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-400" aria-hidden />
            ) : null}
            <span className="truncate">{t(c.i18nKey)}</span>
          </span>
          <span className="shrink-0 text-gray-400">
            {c.progress}/{c.goal}
          </span>
        </div>
        <div className="relative h-1 overflow-hidden rounded-full border border-amber-200/24 bg-slate-950/60">
          <div
            className="h-full bg-gradient-to-r from-amber-700 via-yellow-100 to-amber-500 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        {c.completed && !c.claimed ? (
          <button
            type="button"
            disabled={claiming}
            className="mt-2 w-full rounded bg-green-500 py-1.5 text-sm transition hover:bg-green-600 disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              void handleClaim(c.code);
            }}
          >
            {t("dailyChallenges.claimReward")}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={openPanel}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPanel();
          }
        }}
        className="relative flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-2xl border border-amber-200/16 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl transition hover:border-amber-200/28 xl:p-4"
        aria-label={t("dailyChallenges.openPanel")}
      >
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat brightness-[0.42]"
          style={{ backgroundImage: `url(${dailyChallengesBg})` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-950/95 via-slate-950/92 to-slate-950/96"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-6 top-0 z-[1] h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
        <div className="relative z-10 flex flex-col">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold text-white xl:text-xl">
                <Target className="h-5 w-5 shrink-0 text-amber-200/90 xl:h-6 xl:w-6" aria-hidden />
                {t("dailyChallenges.title")}
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {t("dailyChallenges.cycleDay", { day: cycleDay })}
              </p>
            </div>
            {(isFetching || showSkeleton) && (
              <span className="mt-1 text-[10px] text-slate-500" aria-live="polite">
                …
              </span>
            )}
          </div>

          {showSkeleton ? <DailyChallengesSkeleton /> : null}

          {!showSkeleton && challenges.length === 0 && (
            <p className="text-sm text-gray-400">{t("dailyChallenges.empty")}</p>
          )}
          {!showSkeleton && errorKey && (
            <p className="mt-2 text-xs text-slate-500">{t("dailyChallenges.retryLater")}</p>
          )}

          {!showSkeleton && previewChallenges.length > 0 ? (
            <div className="space-y-2">{previewChallenges.map(renderPreviewCard)}</div>
          ) : null}

          {!showSkeleton && hasMore ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openPanel();
              }}
              className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg border border-amber-400/55 bg-gradient-to-r from-amber-500/90 via-yellow-500/85 to-amber-400/90 py-2 text-xs font-bold text-amber-950 shadow-[0_0_16px_rgba(251,191,36,0.25)] transition hover:from-amber-400 hover:via-yellow-400 hover:to-amber-300"
            >
              {t("dailyChallenges.seeMore")}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </div>

      <DailyChallengesPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        challenges={challenges}
        weeklyChallenges={weeklyChallenges}
        weeklyBonus={weeklyBonus}
        cycleDay={cycleDay}
        claiming={claiming}
        onClaim={(code) => void handleClaim(code)}
        onStartSocialFollow={(code) => void handleStartSocialFollow(code)}
      />
    </>
  );
}
