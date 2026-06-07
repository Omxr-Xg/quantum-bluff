import { useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Award, Home, Loader2, Lock, Unlock } from "lucide-react";
import { useGetMyAchievementsQuery, type AchievementCategory } from "../services/api";

const profileGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const profileMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";

const CATEGORY_ORDER: AchievementCategory[] = [
  "LOGIN",
  "SOCIAL",
  "POKER",
  "BELOTE",
  "CASINO",
  "RECORDS",
];

export function Achievements() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetMyAchievementsQuery();

  const grouped = useMemo(() => {
    const map = new Map<AchievementCategory, NonNullable<typeof data>["catalog"]>();
    if (!data?.catalog) return map;
    for (const cat of CATEGORY_ORDER) {
      map.set(
        cat,
        data.catalog.filter((a) => a.category === cat),
      );
    }
    return map;
  }, [data]);

  const unlockedCount = data?.catalog.filter((a) => a.unlocked).length ?? 0;
  const totalCount = data?.catalog.length ?? 0;

  return (
    <div className="relative min-h-full w-full overflow-x-hidden bg-[#020716]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 p-3 sm:p-6">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={`flex w-fit items-center gap-2 px-3 py-2 text-sm sm:px-4 ${profileMutedButton}`}
            >
              <Home className="h-4 w-4" />
              {t("achievements.backToProfile")}
            </button>
            <h1 className="bg-gradient-to-r from-slate-100 via-amber-200 to-cyan-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
              {t("achievements.title")}
            </h1>
            <p className="text-sm text-slate-400">{t("achievements.subtitle")}</p>
          </div>
          <div className={`px-5 py-3 text-center ${profileGlassCard}`}>
            <p className="text-2xl font-bold text-amber-100">
              {unlockedCount}/{totalCount}
            </p>
            <p className="text-xs text-slate-400">{t("achievements.unlocked")}</p>
          </div>
        </header>

        {isLoading ? (
          <div className="flex justify-center py-20 text-slate-400">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
        ) : error ? (
          <p className="text-center text-rose-300">{t("achievements.error")}</p>
        ) : (
          <div className="space-y-6">
            {CATEGORY_ORDER.map((category) => {
              const items = grouped.get(category) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={category} className={`p-5 sm:p-6 ${profileGlassCard}`}>
                  <h2 className="mb-4 text-lg font-bold text-white">
                    {t(`achievements.category.${category}`)}
                  </h2>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((ach) => (
                      <div
                        key={ach.id}
                        className={`rounded-xl border p-4 transition ${
                          ach.unlocked
                            ? "border-amber-300/30 bg-amber-400/10"
                            : "border-white/10 bg-slate-950/35 opacity-80"
                        }`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="font-semibold text-white">{t(`achievements.item.${ach.id}.name`)}</p>
                          {ach.unlocked ? (
                            <Unlock className="h-4 w-4 shrink-0 text-emerald-300" />
                          ) : (
                            <Lock className="h-4 w-4 shrink-0 text-slate-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400">{t(`achievements.item.${ach.id}.desc`)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-wide">
                          {ach.rewardChips ? (
                            <span className="rounded-full border border-amber-300/25 bg-amber-950/40 px-2 py-0.5 text-amber-200">
                              +{ach.rewardChips.toLocaleString()} {t("achievements.chips")}
                            </span>
                          ) : null}
                          {ach.rewardCosmeticId ? (
                            <span className="rounded-full border border-purple-300/25 bg-purple-950/40 px-2 py-0.5 text-purple-200">
                              {t("achievements.cosmeticReward")}
                            </span>
                          ) : null}
                          {ach.unlocked && ach.unlockedAt ? (
                            <span className="text-slate-500 normal-case">
                              {new Date(ach.unlockedAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {!isLoading && !error ? (
          <div className="mt-6 flex justify-center">
            <Award className="h-6 w-6 text-amber-300/50" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
