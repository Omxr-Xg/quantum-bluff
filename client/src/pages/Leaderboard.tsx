import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Gamepad2,
  Home,
  Loader2,
  Spade,
  Trophy,
} from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { useUser } from "../hooks/useUser";
import { apiUrl } from "../utils/apiBase";
const PAGE_SIZE = 25;

type MainTab = "general" | "poker" | "casino";

type LeaderboardCategory =
  | "xp"
  | "chips"
  | "poker_wins"
  | "slot_biggest"
  | "roulette_biggest"
  | "blackjack_biggest";

type Row = { username: string; rank: number; value: number; level?: number };

function rankDisplayClass(rank: number) {
  if (rank === 1) return "text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.35)]";
  if (rank === 2) return "text-slate-200";
  if (rank === 3) return "text-amber-600/95";
  return "text-slate-400";
}

/** Onglet actif type Poker (lobby) */
const TAB_ACTIVE_POKER =
  "bg-gradient-to-br from-green-500/40 via-emerald-600/25 to-slate-900/60 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(34,197,94,0.15)] ring-1 ring-green-400/45";

/** Onglet actif type Roulette / Casino (lobby) */
const TAB_ACTIVE_ROULETTE =
  "bg-gradient-to-br from-amber-500/35 via-amber-900/30 to-emerald-950/70 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_0_28px_rgba(245,158,11,0.18)] ring-1 ring-amber-400/50";

/** Général — 3ᵉ palette (indigo / ciel), distincte poker & casino */
const TAB_ACTIVE_GENERAL =
  "bg-gradient-to-br from-sky-500/35 via-indigo-900/45 to-slate-950/85 text-sky-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_26px_rgba(56,189,248,0.18)] ring-1 ring-sky-400/45";

const TAB_IDLE = "text-slate-500 hover:bg-white/[0.06] hover:text-slate-300";

const TAB_BASE =
  "relative flex min-h-[3rem] flex-1 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2.5 text-center transition-all duration-500 md:min-h-0 md:flex-row md:gap-2 md:py-3";

export function Leaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username: meName } = useUser();
  const isInGame = sessionStorage.getItem("currentGame");

  const [mainTab, setMainTab] = useState<MainTab>("general");
  const [pokerMetric, setPokerMetric] = useState<"poker_wins" | "chips">("poker_wins");
  const [casinoMetric, setCasinoMetric] = useState<
    "chips" | "slot_biggest" | "roulette_biggest" | "blackjack_biggest"
  >("chips");
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Row[]>([]);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [myRank, setMyRank] = useState<number | undefined>(undefined);

  const category: LeaderboardCategory =
    mainTab === "general"
      ? "xp"
      : mainTab === "poker"
        ? pokerMetric
        : casinoMetric;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const token = localStorage.getItem("token");
    const params = new URLSearchParams({
      category,
      limit: String(PAGE_SIZE),
      offset: String(offset),
    });
    const url = `${apiUrl("/api/leaderboard")}?${params}`;
    try {
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data?.error === "string" ? data.error : t("leaderboard.error"));
        setItems([]);
        return;
      }
      setItems(Array.isArray(data?.items) ? data.items : []);
      setTotalPlayers(typeof data?.totalPlayers === "number" ? data.totalPlayers : 0);
      setMyRank(typeof data?.myRank === "number" ? data.myRank : undefined);
    } catch {
      setError(t("leaderboard.error"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [category, offset, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setOffset(0);
  }, [mainTab, pokerMetric, casinoMetric]);

  const totalPages = Math.max(1, Math.ceil(totalPlayers / PAGE_SIZE));
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const valueLabel = (() => {
    switch (category) {
      case "xp":
        return t("leaderboard.colXp");
      case "chips":
        return t("leaderboard.colChips");
      case "poker_wins":
        return t("leaderboard.colPokerWins");
      case "slot_biggest":
        return t("leaderboard.colSlotBiggest");
      case "roulette_biggest":
        return t("leaderboard.colRouletteBiggest");
      case "blackjack_biggest":
        return t("leaderboard.colBlackjackBiggest");
      default:
        return "";
    }
  })();

  const metricActiveClass = useMemo(() => {
    if (mainTab === "poker") {
      return "bg-purple-600/90 text-white ring-1 ring-purple-400/40 shadow-lg";
    }
    if (mainTab === "general") {
      return "bg-sky-600/90 text-white ring-1 ring-sky-400/40 shadow-lg";
    }
    return "bg-emerald-600/90 text-white ring-1 ring-emerald-400/40 shadow-lg";
  }, [mainTab]);
  const metricIdleClass = "bg-slate-800/90 text-slate-300 ring-1 ring-slate-600/60 hover:bg-slate-700/90";

  const pageBaseBg =
    mainTab === "poker" ? "bg-[#070912]" : mainTab === "casino" ? "bg-[#03150f]" : "bg-[#0a1528]";

  return (
    <div
      className={`relative w-full min-h-screen overflow-x-hidden overflow-y-auto p-6 transition-[background-color] duration-700 ease-in-out ${pageBaseBg}`}
    >
      {/* Fond Général — indigo / ciel (3ᵉ thème) */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: mainTab === "general" ? 1 : 0 }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,rgba(59,130,246,0.22),transparent_55%),radial-gradient(ellipse_80%_50%_at_100%_30%,rgba(99,102,241,0.14),transparent_50%),linear-gradient(180deg,#0a1528_0%,#0c1220_45%,#080d18_100%)]" />
        <div className="absolute -top-24 left-1/3 h-[28rem] w-[28rem] rounded-full bg-indigo-600/18 blur-[100px]" />
        <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-sky-500/12 blur-[90px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-blue-950/30 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(147,197,253,0.45) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      {/* Fond Texas Hold’em — identique lobby */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: mainTab === "poker" ? 1 : 0 }}
        aria-hidden
      >
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-purple-700/25 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.06),transparent_55%)]" />
      </div>

      {/* Fond Roulette / Casino — identique lobby */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: mainTab === "casino" ? 1 : 0 }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(5,80,55,0.55),transparent_50%),radial-gradient(ellipse_90%_70%_at_100%_50%,rgba(120,80,20,0.12),transparent_45%),linear-gradient(165deg,#031a14_0%,#041f18_40%,#020c09_100%)]" />
        <div className="absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-500/18 blur-[100px]" />
        <div className="absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-amber-500/12 blur-[90px]" />
        <div className="absolute -bottom-20 left-0 h-96 w-96 rounded-full bg-teal-600/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.35) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[min(140vw,52rem)] w-[min(140vw,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
          style={{
            background: "conic-gradient(from 0deg, rgba(212,175,55,0.5), transparent 8%, transparent 92%, rgba(212,175,55,0.35))",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(180,140,40,0.07),transparent_55%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        {/* En-tête — même structure que le lobby */}
        <div className="mb-10 flex w-full flex-col items-center justify-between gap-6 overflow-visible md:flex-row">
          <div className="flex w-full shrink-0 items-center gap-4 md:w-auto">
            <QuantumBluffLogo className="h-12 w-12 shrink-0 md:h-16 md:w-16" />
            <div className="min-w-0 flex-1">
              <h1
                className={`truncate text-2xl font-bold transition-colors duration-700 md:text-4xl ${
                  mainTab === "poker"
                    ? "text-purple-400"
                    : mainTab === "casino"
                      ? "bg-gradient-to-r from-amber-100 via-amber-300 to-emerald-200 bg-clip-text text-transparent"
                      : "bg-gradient-to-r from-sky-200 via-indigo-200 to-slate-200 bg-clip-text text-transparent"
                }`}
              >
                {t("leaderboard.title")}
              </h1>
              <p
                className={`truncate text-sm transition-colors duration-700 md:text-base ${
                  mainTab === "poker"
                    ? "text-gray-400"
                    : mainTab === "casino"
                      ? "text-emerald-200/65"
                      : "text-sky-200/55"
                }`}
              >
                {t("leaderboard.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto md:shrink-0">
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className="flex touch-manipulation items-center gap-2 rounded-xl bg-slate-700/90 px-3 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-500/40 transition hover:bg-slate-600 sm:px-4 sm:text-base"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t("profile.home")}</span>
            </button>
            {isInGame ? (
              <button
                type="button"
                onClick={() => {
                  const g = sessionStorage.getItem("currentGame");
                  if (g) navigate(g);
                }}
                className="flex touch-manipulation items-center gap-2 rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-green-500 sm:px-4 sm:text-base"
              >
                <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{t("profile.backToGame")}</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Onglets — copie visuelle du lobby (Poker / Roulette), centré avec mx-auto */}
        <nav
          className={`mx-auto mb-10 flex w-full max-w-2xl gap-1.5 rounded-2xl border p-1.5 shadow-2xl backdrop-blur-md transition-[border-color,background-color] duration-700 md:gap-2 md:p-2 ${
            mainTab === "poker"
              ? "border-white/10 bg-slate-950/75"
              : mainTab === "casino"
                ? "border-amber-500/25 bg-emerald-950/70"
                : "border-sky-500/30 bg-slate-950/80"
          }`}
          role="tablist"
          aria-label={t("leaderboard.title")}
        >
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "general"}
            onClick={() => setMainTab("general")}
            className={`${TAB_BASE} ${mainTab === "general" ? TAB_ACTIVE_GENERAL : TAB_IDLE}`}
          >
            <Trophy
              className={`h-5 w-5 shrink-0 md:h-6 md:w-6 ${
                mainTab === "general" ? "text-sky-200 drop-shadow-[0_0_10px_rgba(56,189,248,0.45)]" : ""
              }`}
              strokeWidth={2.2}
              aria-hidden
            />
            <span className="font-serif text-xs font-bold tracking-wide md:text-sm">{t("leaderboard.tabGeneral")}</span>
          </button>
          <div
            className={`hidden w-px self-stretch md:block ${
              mainTab === "poker" ? "bg-white/10" : mainTab === "casino" ? "bg-amber-500/20" : "bg-sky-500/30"
            }`}
            aria-hidden
          />
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "poker"}
            onClick={() => setMainTab("poker")}
            className={`${TAB_BASE} ${mainTab === "poker" ? TAB_ACTIVE_POKER : TAB_IDLE}`}
          >
            <Spade
              className={`h-5 w-5 shrink-0 md:h-6 md:w-6 ${
                mainTab === "poker" ? "text-green-200 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" : ""
              }`}
              strokeWidth={2.2}
              aria-hidden
            />
            <span className="font-serif text-xs font-bold tracking-wide md:text-sm">{t("leaderboard.tabPoker")}</span>
          </button>
          <div
            className={`hidden w-px self-stretch md:block ${
              mainTab === "poker" ? "bg-white/10" : mainTab === "casino" ? "bg-amber-500/20" : "bg-sky-500/30"
            }`}
            aria-hidden
          />
          <button
            type="button"
            role="tab"
            aria-selected={mainTab === "casino"}
            onClick={() => setMainTab("casino")}
            className={`${TAB_BASE} ${mainTab === "casino" ? TAB_ACTIVE_ROULETTE : TAB_IDLE}`}
          >
            <CircleDot
              className={`h-5 w-5 shrink-0 md:h-6 md:w-6 ${
                mainTab === "casino" ? "text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.45)]" : ""
              }`}
              strokeWidth={2.2}
              aria-hidden
            />
            <span className="font-serif text-xs font-bold tracking-wide md:text-sm">{t("leaderboard.tabCasino")}</span>
          </button>
        </nav>

        <div className="mx-auto w-full max-w-3xl">
          {myRank != null && (
            <div className="mb-6 rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-500/15 via-slate-900/40 to-emerald-900/25 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm sm:px-5 sm:py-4">
              <p className="text-center text-sm font-semibold text-amber-100/95 sm:text-base">{t("leaderboard.yourRank", { rank: myRank })}</p>
            </div>
          )}

          {mainTab === "poker" && (
            <div className="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start">
              <button
                type="button"
                onClick={() => setPokerMetric("poker_wins")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  pokerMetric === "poker_wins" ? metricActiveClass : metricIdleClass
                }`}
              >
                {t("leaderboard.metricPokerWins")}
              </button>
              <button
                type="button"
                onClick={() => setPokerMetric("chips")}
                className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  pokerMetric === "chips" ? metricActiveClass : metricIdleClass
                }`}
              >
                {t("leaderboard.metricChips")}
              </button>
            </div>
          )}

          {mainTab === "casino" && (
            <div className="mb-6 flex flex-wrap justify-center gap-2 sm:justify-start">
              {(
                [
                  ["chips", t("leaderboard.metricChips")] as const,
                  ["slot_biggest", t("leaderboard.metricSlotBiggest")] as const,
                  ["roulette_biggest", t("leaderboard.metricRouletteBiggest")] as const,
                  ["blackjack_biggest", t("leaderboard.metricBlackjackBiggest")] as const,
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCasinoMetric(id)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                    casinoMetric === id ? metricActiveClass : metricIdleClass
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-600/80 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl ring-1 ring-white/5">
            <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_4rem_2rem] gap-x-1.5 gap-y-1 border-b border-slate-600/70 bg-slate-950/80 px-2 py-3 text-[0.6rem] font-semibold uppercase tracking-wider text-slate-400 sm:grid-cols-[3rem_1fr_6rem_3.5rem] sm:gap-2 sm:px-4 sm:text-xs">
              <span className="pl-0.5">#</span>
              <span className="min-w-0">{t("leaderboard.colPlayer")}</span>
              <span className="text-right">{valueLabel}</span>
              <span className="text-right">{t("leaderboard.colLevel")}</span>
            </div>

            {loading ? (
              <div className="flex justify-center py-20 text-slate-400">
                <Loader2 className="h-9 w-9 animate-spin text-amber-400/80" />
              </div>
            ) : error ? (
              <p className="px-4 py-14 text-center text-red-400">{error}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-14 text-center text-slate-500">{t("leaderboard.empty")}</p>
            ) : (
              <ul className="divide-y divide-slate-700/50">
                {items.map((row) => {
                  const isMe = meName && row.username === meName;
                  return (
                    <li
                      key={`${row.rank}-${row.username}`}
                      className={`grid grid-cols-[2.25rem_minmax(0,1fr)_4rem_2rem] gap-x-1.5 gap-y-1 px-2 py-3 text-xs transition sm:grid-cols-[3rem_1fr_6rem_3.5rem] sm:gap-2 sm:px-4 sm:text-sm ${
                        isMe ? "bg-amber-500/10 ring-1 ring-inset ring-amber-400/25" : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className={`pl-0.5 text-base font-bold tabular-nums ${rankDisplayClass(row.rank)}`}>{row.rank}</span>
                      <span className={`truncate font-medium ${isMe ? "text-amber-100" : "text-white"}`}>
                        {row.username}
                        {isMe ? (
                          <span className="ml-2 rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-200">
                            {t("game.you")}
                          </span>
                        ) : null}
                      </span>
                      <span className="text-right font-semibold tabular-nums text-emerald-300/95">{row.value.toLocaleString()}</span>
                      <span className="text-right text-[0.7rem] tabular-nums text-slate-400 sm:text-sm">{row.level ?? "—"}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              disabled={offset <= 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-500/30 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("leaderboard.prev")}
            </button>
            <span className="text-center text-sm text-slate-400">
              {t("leaderboard.pageOf", { current: currentPage, total: totalPages, players: totalPlayers })}
            </span>
            <button
              type="button"
              disabled={offset + PAGE_SIZE >= totalPlayers || loading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-800/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg ring-1 ring-slate-500/30 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("leaderboard.next")}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-slate-600/60 transition hover:bg-slate-700 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("leaderboard.back")}
          </button>
        </div>
      </div>
    </div>
  );
}
