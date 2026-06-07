import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { BarChart3, Home, History, Loader2 } from "lucide-react";
import {
  useGetPlayerAnalyticsQuery,
  useGetPlayerHistoryQuery,
  type AnalyticsPeriod,
  type PlayerHistoryMode,
} from "../services/api";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "../components/ui/chart";

const profileGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const profileMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";

const HISTORY_MODES: PlayerHistoryMode[] = ["all", "poker", "belote", "casino", "tournament"];
const PERIODS: AnalyticsPeriod[] = ["7d", "30d", "90d", "all"];

const chipsChartConfig = {
  balance: { label: "Balance", color: "#38bdf8" },
};

const gainsChartConfig = {
  poker: { label: "Poker", color: "#34d399" },
  belote: { label: "Belote", color: "#a78bfa" },
  casino: { label: "Casino", color: "#fbbf24" },
  tournament: { label: "Tournament", color: "#f472b6" },
  other: { label: "Other", color: "#94a3b8" },
};

export function PlayerHistory() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<"history" | "analytics">("history");
  const [historyMode, setHistoryMode] = useState<PlayerHistoryMode>("all");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const { data: historyData, isLoading: historyLoading } = useGetPlayerHistoryQuery({
    mode: historyMode,
    page,
    limit: 20,
  });
  const { data: analytics, isLoading: analyticsLoading } = useGetPlayerAnalyticsQuery(period, {
    skip: mainTab !== "analytics",
  });

  const gainsPieData = useMemo(() => {
    if (!analytics?.gainsByGame) return [];
    return Object.entries(analytics.gainsByGame)
      .filter(([, v]) => v !== 0)
      .map(([key, value]) => ({
        name: t(`history.gameType.${key}`),
        key,
        value: Math.abs(value),
        fill: `var(--color-${key})`,
      }));
  }, [analytics, t]);

  const gainsBarData = useMemo(() => {
    if (!analytics?.gainsByGamePct) return [];
    return Object.entries(analytics.gainsByGamePct).map(([key, pct]) => ({
      key,
      label: t(`history.gameType.${key}`),
      pct,
      fill: `var(--color-${key})`,
    }));
  }, [analytics, t]);

  return (
    <div className="relative min-h-full w-full overflow-x-hidden bg-[#020716]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 p-3 sm:p-6">
        <header className="mb-6 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className={`flex w-fit items-center gap-2 px-3 py-2 text-sm sm:px-4 ${profileMutedButton}`}
          >
            <Home className="h-4 w-4" />
            {t("history.backToProfile")}
          </button>
          <h1 className="bg-gradient-to-r from-slate-100 via-blue-200 to-emerald-200 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            {t("history.title")}
          </h1>
        </header>

        <div className="mb-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMainTab("history")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
              mainTab === "history"
                ? "border border-blue-300/40 bg-blue-950/50 text-blue-100"
                : "border border-white/10 bg-white/5 text-slate-400"
            }`}
          >
            <History className="h-4 w-4" />
            {t("history.tabHistory")}
          </button>
          <button
            type="button"
            onClick={() => setMainTab("analytics")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
              mainTab === "analytics"
                ? "border border-emerald-300/40 bg-emerald-950/40 text-emerald-100"
                : "border border-white/10 bg-white/5 text-slate-400"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            {t("history.tabAnalytics")}
          </button>
        </div>

        {mainTab === "history" ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {HISTORY_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setHistoryMode(mode);
                    setPage(1);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    historyMode === mode
                      ? "bg-sky-600/90 text-white"
                      : "bg-slate-800/90 text-slate-300 ring-1 ring-slate-600/60"
                  }`}
                >
                  {t(`history.mode.${mode}`)}
                </button>
              ))}
            </div>

            <section className={`p-4 sm:p-5 ${profileGlassCard}`}>
              {historyLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (historyData?.items.length ?? 0) === 0 ? (
                <p className="py-10 text-center text-slate-500">{t("history.empty")}</p>
              ) : (
                <ul className="divide-y divide-white/10">
                  {historyData?.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{item.summary}</p>
                        <p className="text-xs text-slate-500">
                          {t(`history.mode.${item.gameType as PlayerHistoryMode}`, {
                            defaultValue: item.gameType,
                          })}{" "}
                          · {new Date(item.endedAt).toLocaleString()}
                        </p>
                      </div>
                      {item.amount != null ? (
                        <span
                          className={`shrink-0 font-bold tabular-nums ${
                            item.amount >= 0 ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {item.amount >= 0 ? "+" : ""}
                          {item.amount.toLocaleString()}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex justify-between">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-40"
                >
                  {t("history.prevPage")}
                </button>
                <span className="text-sm text-slate-500">{t("history.page", { page })}</span>
                <button
                  type="button"
                  disabled={(historyData?.items.length ?? 0) < 20}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-sm text-slate-300 disabled:opacity-40"
                >
                  {t("history.nextPage")}
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                    period === p
                      ? "bg-emerald-600/90 text-white"
                      : "bg-slate-800/90 text-slate-300 ring-1 ring-slate-600/60"
                  }`}
                >
                  {t(`history.period.${p}`)}
                </button>
              ))}
            </div>

            {analyticsLoading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className={`p-4 ${profileGlassCard}`}>
                  <h2 className="mb-3 text-sm font-bold text-white">{t("history.chipsTimeline")}</h2>
                  <ChartContainer config={chipsChartConfig} className="aspect-[4/3] w-full">
                    <LineChart data={analytics.chipsTimeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="balance" stroke="var(--color-balance)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ChartContainer>
                </section>

                <section className={`p-4 ${profileGlassCard}`}>
                  <h2 className="mb-3 text-sm font-bold text-white">{t("history.gainsByGame")}</h2>
                  <ChartContainer config={gainsChartConfig} className="aspect-[4/3] w-full">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={gainsPieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ChartContainer>
                </section>

                <section className={`p-4 lg:col-span-2 ${profileGlassCard}`}>
                  <h2 className="mb-3 text-sm font-bold text-white">{t("history.gainsPercent")}</h2>
                  <ChartContainer config={gainsChartConfig} className="aspect-[3/2] w-full max-h-72">
                    <BarChart data={gainsBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="pct" radius={4} />
                    </BarChart>
                  </ChartContainer>
                </section>

                <section className={`p-4 lg:col-span-2 ${profileGlassCard}`}>
                  <h2 className="mb-3 text-sm font-bold text-white">{t("history.records")}</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(analytics.records).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-white/10 bg-slate-950/40 p-3 text-center">
                        <p className="text-lg font-bold tabular-nums text-white">{value.toLocaleString()}</p>
                        <p className="text-[10px] uppercase tracking-wide text-slate-500">
                          {t(`history.record.${key}`, { defaultValue: key })}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
