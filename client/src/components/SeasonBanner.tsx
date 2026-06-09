import { Calendar, Trophy } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { useGetActiveSeasonQuery } from "../services/api";

export function SeasonBanner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useGetActiveSeasonQuery();

  const season = data?.season;
  if (isLoading || !season || season.status !== "ACTIVE") {
    return null;
  }

  const days = season.daysRemaining ?? 0;

  return (
    <button
      type="button"
      onClick={() => navigate("/leaderboard?scope=season")}
      className="mb-4 flex w-full items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-gradient-to-r from-amber-950/50 via-slate-900/70 to-violet-950/40 px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-amber-200/35 hover:bg-amber-950/55 sm:px-4"
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-200/25 bg-amber-900/40">
          <Trophy className="h-4 w-4 text-amber-200" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-amber-50">
            {t("lobby.seasonBannerTitle", { name: season.name })}
          </p>
          <p className="truncate text-xs text-amber-100/70">
            {t("lobby.seasonBannerSubtitle")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-200/20 bg-slate-950/50 px-2.5 py-1 text-xs font-medium text-amber-100">
        <Calendar className="h-3.5 w-3.5 text-amber-200/80" aria-hidden />
        {t("lobby.seasonBannerDaysLeft", { count: days })}
      </div>
    </button>
  );
}
