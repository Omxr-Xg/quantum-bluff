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
} from "../components/ui/chart";

const historyCard =
  "rounded-2xl border border-slate-700/70 bg-slate-900/95 shadow-md";
const tabActive =
  "border border-sky-400/50 bg-sky-950/80 text-sky-50 shadow-sm";
const tabInactive =
  "border border-slate-600/60 bg-slate-800/80 text-slate-300 hover:border-slate-500 hover:text-slate-100";
const filterActive = "bg-sky-600 text-white shadow-sm";
const filterInactive =
  "border border-slate-600/70 bg-slate-800 text-slate-200 hover:border-slate-500";

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

const GAME_COLORS: Record<string, string> = {
  poker: "#34d399",
  belote: "#a78bfa",
  casino: "#fbbf24",
  tournament: "#f472b6",
  other: "#94a3b8",
};

const chartTooltip = (
  <ChartTooltipContent className="border-slate-600 bg-slate-800 text-slate-100 shadow-xl [&_.text-foreground]:text-white [&_.text-muted-foreground]:text-slate-400" />
);

const chartShell =
  "text-slate-300 [&_.recharts-cartesian-axis-tick_text]:!fill-slate-400 [&_.recharts-cartesian-grid_line]:stroke-slate-700/80";

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
        fill: GAME_COLORS[key] ?? GAME_COLORS.other,
      }));
  }, [analytics, t]);

  const gainsBarData = useMemo(() => {
    if (!analytics?.gainsByGamePct) return [];
    return Object.entries(analytics.gainsByGamePct).map(([key, pct]) => ({
      key,
      label: t(`history.gameType.${key}`),
      pct,
      fill: GAME_COLORS[key] ?? GAME_COLORS.other,
    }));
  }, [analytics, t]);

  const pieTotal = useMemo(
    () => gainsPieData.reduce((sum, item) => sum + item.value, 0),
    [gainsPieData],
  );

  return (
    <div className="min-h-full w-full overflow-x-hidden bg-slate-950 text-slate-100">
      <div className="mx-auto w-full max-w-6xl min-w-0 p-3 sm:p-6">
        <header className="mb-6 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex w-fit items-center gap-2 rounded-full border border-slate-600/70 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-700 sm:px-4"
          >
            <Home className="h-4 w-4" />
            {t("history.backToProfile")}
          </button>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("history.title")}</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            {mainTab === "history" ? t("history.tabHistory") : t("history.tabAnalytics")}
          </p>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMainTab("history")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              mainTab === "history" ? tabActive : tabInactive
            }`}
          >
            <History className="h-4 w-4" />
            {t("history.tabHistory")}
          </button>
          <button
            type="button"
            onClick={() => setMainTab("analytics")}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              mainTab === "analytics" ? tabActive : tabInactive
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
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    historyMode === mode ? filterActive : filterInactive
                  }`}
                >
                  {t(`history.mode.${mode}`)}
                </button>
              ))}
            </div>

            <section className={`p-4 sm:p-5 ${historyCard}`}>
              {historyLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : (historyData?.items.length ?? 0) === 0 ? (
                <p className="py-10 text-center text-slate-400">{t("history.empty")}</p>
              ) : (
                <ul className="divide-y divide-slate-700/80">
                  {historyData?.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 py-3.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">{item.summary}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {t(`history.mode.${item.gameType as PlayerHistoryMode}`, {
                            defaultValue: item.gameType,
                          })}{" "}
                          · {new Date(item.endedAt).toLocaleString()}
                        </p>
                      </div>
                      {item.amount != null ? (
                        <span
                          className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums ${
                            item.amount >= 0
                              ? "bg-emerald-950/80 text-emerald-300"
                              : "bg-rose-950/80 text-rose-300"
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

              <div className="mt-5 flex items-center justify-between border-t border-slate-700/80 pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("history.prevPage")}
                </button>
                <span className="text-sm text-slate-400">{t("history.page", { page })}</span>
                <button
                  type="button"
                  disabled={(historyData?.items.length ?? 0) < 20}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {t("history.nextPage")}
                </button>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    period === p ? filterActive : filterInactive
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
              <div className="space-y-5">
                <section className={`p-4 sm:p-5 ${historyCard}`}>
                  <h2 className="mb-4 text-base font-semibold text-white">{t("history.records")}</h2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(analytics.records).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-slate-700/80 bg-slate-800/90 p-3 text-center"
                      >
                        <p className="text-lg font-bold tabular-nums text-white">
                          {value.toLocaleString()}
                        </p>
                        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                          {t(`history.record.${key}`, { defaultValue: key })}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <section className={`p-4 sm:p-5 ${historyCard}`}>
                    <h2 className="mb-1 text-base font-semibold text-white">
                      {t("history.chipsTimeline")}
                    </h2>
                    <p className="mb-4 text-xs text-slate-400">{t(`history.period.${period}`)}</p>
                    <ChartContainer
                      config={chipsChartConfig}
                      className={`aspect-[5/3] w-full min-h-[220px] ${chartShell}`}
                    >
                      <LineChart data={analytics.chipsTimeline} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: "#475569" }}
                        />
                        <YAxis
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={48}
                        />
                        <ChartTooltip content={chartTooltip} />
                        <Line
                          type="monotone"
                          dataKey="balance"
                          stroke="var(--color-balance)"
                          strokeWidth={2.5}
                          dot={false}
                          activeDot={{ r: 4, fill: "#38bdf8", stroke: "#0f172a", strokeWidth: 2 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </section>

                  <section className={`p-4 sm:p-5 ${historyCard}`}>
                    <h2 className="mb-1 text-base font-semibold text-white">{t("history.gainsByGame")}</h2>
                    <p className="mb-4 text-xs text-slate-400">{t(`history.period.${period}`)}</p>
                    {gainsPieData.length === 0 ? (
                      <p className="py-16 text-center text-sm text-slate-400">{t("history.empty")}</p>
                    ) : (
                      <>
                        <ChartContainer
                          config={gainsChartConfig}
                          className={`mx-auto aspect-square w-full max-w-[240px] ${chartShell}`}
                        >
                          <PieChart>
                            <ChartTooltip content={chartTooltip} />
                            <Pie
                              data={gainsPieData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={52}
                              outerRadius={88}
                              paddingAngle={2}
                              stroke="#0f172a"
                              strokeWidth={2}
                            />
                          </PieChart>
                        </ChartContainer>
                        <ul className="mt-4 space-y-2 border-t border-slate-700/80 pt-4">
                          {gainsPieData.map((item) => {
                            const pct = pieTotal > 0 ? Math.round((item.value / pieTotal) * 100) : 0;
                            return (
                              <li
                                key={item.key}
                                className="flex items-center gap-3 text-sm text-slate-200"
                              >
                                <span
                                  className="h-3 w-3 shrink-0 rounded-sm"
                                  style={{ backgroundColor: item.fill }}
                                  aria-hidden
                                />
                                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                                <span className="shrink-0 tabular-nums text-slate-400">{pct}%</span>
                                <span className="shrink-0 font-medium tabular-nums text-white">
                                  {item.value.toLocaleString()}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </section>
                </div>

                <section className={`p-4 sm:p-5 ${historyCard}`}>
                  <h2 className="mb-1 text-base font-semibold text-white">{t("history.gainsPercent")}</h2>
                  <p className="mb-4 text-xs text-slate-400">{t(`history.period.${period}`)}</p>
                  {gainsBarData.length === 0 ? (
                    <p className="py-10 text-center text-sm text-slate-400">{t("history.empty")}</p>
                  ) : (
                    <ChartContainer
                      config={gainsChartConfig}
                      className={`aspect-[5/2] w-full min-h-[200px] max-h-80 ${chartShell}`}
                    >
                      <BarChart data={gainsBarData} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#cbd5e1", fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: "#475569" }}
                          interval={0}
                        />
                        <YAxis
                          tick={{ fill: "#94a3b8", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={40}
                          unit="%"
                        />
                        <ChartTooltip content={chartTooltip} />
                        <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={56} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </section>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
