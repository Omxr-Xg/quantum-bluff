import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronLeft, ChevronRight, Home, Loader2, Trophy } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || "";
const PAGE_SIZE = 25;

type MainTab = "general" | "poker" | "casino";

type LeaderboardCategory =
  | "xp"
  | "chips"
  | "poker_wins"
  | "slot_biggest"
  | "roulette_biggest";

type Row = { username: string; rank: number; value: number; level?: number };

export function Leaderboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState<MainTab>("general");
  const [pokerMetric, setPokerMetric] = useState<"poker_wins" | "chips">("poker_wins");
  const [casinoMetric, setCasinoMetric] = useState<"chips" | "slot_biggest" | "roulette_biggest">("chips");
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
    const url = API_BASE
      ? `${API_BASE}/api/leaderboard?${params}`
      : `/api/leaderboard?${params}`;
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
      default:
        return "";
    }
  })();

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-sm font-semibold transition"
            >
              <Home className="w-4 h-4" />
              {t("profile.home")}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <QuantumBluffLogo className="w-10 h-10" />
            <Trophy className="w-7 h-7 text-amber-400" />
            <span className="text-xl font-bold text-white">{t("leaderboard.title")}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              ["general", t("leaderboard.tabGeneral")] as const,
              ["poker", t("leaderboard.tabPoker")] as const,
              ["casino", t("leaderboard.tabCasino")] as const,
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setMainTab(id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                mainTab === id
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-700 text-slate-200 hover:bg-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mainTab === "poker" && (
          <div className="flex flex-wrap gap-2 mb-4">
            <button
              type="button"
              onClick={() => setPokerMetric("poker_wins")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                pokerMetric === "poker_wins" ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              {t("leaderboard.metricPokerWins")}
            </button>
            <button
              type="button"
              onClick={() => setPokerMetric("chips")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                pokerMetric === "chips" ? "bg-purple-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              {t("leaderboard.metricChips")}
            </button>
          </div>
        )}

        {mainTab === "casino" && (
          <div className="flex flex-wrap gap-2 mb-4">
            {(
              [
                ["chips", t("leaderboard.metricChips")] as const,
                ["slot_biggest", t("leaderboard.metricSlotBiggest")] as const,
                ["roulette_biggest", t("leaderboard.metricRouletteBiggest")] as const,
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setCasinoMetric(id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  casinoMetric === id ? "bg-emerald-600 text-white" : "bg-slate-700 text-slate-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {myRank != null && (
          <p className="text-amber-200/90 text-sm font-medium mb-3">
            {t("leaderboard.yourRank", { rank: myRank })}
          </p>
        )}

        <div className="bg-slate-800/90 border border-slate-600 rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_5rem_4rem] sm:grid-cols-[3rem_1fr_6rem_4rem] gap-2 px-3 py-2 bg-slate-900/80 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            <span>#</span>
            <span>{t("leaderboard.colPlayer")}</span>
            <span className="text-right">{valueLabel}</span>
            <span className="text-right hidden sm:block">{t("leaderboard.colLevel")}</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-16 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : error ? (
            <p className="text-center text-red-400 py-12 px-4">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-center text-slate-500 py-12">{t("leaderboard.empty")}</p>
          ) : (
            <ul className="divide-y divide-slate-700/80">
              {items.map((row) => (
                <li
                  key={`${row.rank}-${row.username}`}
                  className="grid grid-cols-[3rem_1fr_5rem_4rem] sm:grid-cols-[3rem_1fr_6rem_4rem] gap-2 px-3 py-2.5 items-center text-sm"
                >
                  <span className="text-amber-400 font-bold">{row.rank}</span>
                  <span className="text-white font-medium truncate">{row.username}</span>
                  <span className="text-right text-emerald-300 tabular-nums">
                    {row.value.toLocaleString()}
                  </span>
                  <span className="text-right text-slate-400 tabular-nums hidden sm:block">
                    {row.level ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between mt-4 gap-3">
          <button
            type="button"
            disabled={offset <= 0 || loading}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("leaderboard.prev")}
          </button>
          <span className="text-slate-400 text-sm">
            {t("leaderboard.pageOf", { current: currentPage, total: totalPages, players: totalPlayers })}
          </span>
          <button
            type="button"
            disabled={offset + PAGE_SIZE >= totalPlayers || loading}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold disabled:opacity-40"
          >
            {t("leaderboard.next")}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("leaderboard.back")}
        </button>
      </div>
    </div>
  );
}
