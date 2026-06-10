import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { Clover, Minus, Plus, Sparkles } from "lucide-react";
import { ChipIcon } from "../components/ChipIcon";
import { SoloGameBackButton } from "../components/minigames/SoloGameBackButton";
import { SOLO_GAMES_BACK_PATH } from "../utils/soloGameNav";
import { useToast } from "../contexts/ToastContext";
import { getAuthItem } from "../utils/authStorage";
import { apiUrl } from "../utils/apiBase";
import {
  updateUserBalance,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
  fetchBalanceFromServer,
} from "../utils/userProfile";
import {
  LUCKY_NUMBER_BET_PRESETS,
  LUCKY_NUMBER_BET_STEP,
  LUCKY_NUMBER_CHOICES,
  LUCKY_NUMBER_MAX_BET,
  LUCKY_NUMBER_MIN_BET,
  LUCKY_NUMBER_WIN_MULTIPLIER,
  clampBet,
  historyBadgeClass,
  runLuckyNumberDrawAnimation,
} from "../features/luckyNumber/luckyNumberMath";
import { isSoloActiveConflict } from "../features/soloGames/recoverActiveRound";

type Phase = "ready" | "drawing" | "result";

const HISTORY_KEY = "qb-lucky-number-history";

type HistoryEntry = { drawnNumber: number; win: boolean };

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (e): e is HistoryEntry =>
              typeof e === "object" &&
              e != null &&
              "drawnNumber" in e &&
              typeof (e as HistoryEntry).drawnNumber === "number",
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

function pushHistory(entry: HistoryEntry) {
  const next = [entry, ...loadHistory()].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function LuckyNumber() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [balance, setBalance] = useState(getUserBalance());
  const [bet, setBet] = useState(100);
  const [selectedNumber, setSelectedNumber] = useState(7);
  const [drawnDisplay, setDrawnDisplay] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [lastResult, setLastResult] = useState<{
    drawnNumber: number;
    win: boolean;
    gain: number;
    profit: number;
  } | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [acting, setActing] = useState(false);
  const [shake, setShake] = useState(false);
  const [winFlash, setWinFlash] = useState(false);

  const syncBalance = useCallback(() => {
    setBalance(getUserBalance());
  }, []);

  useEffect(() => {
    void fetchBalanceFromServer({ authoritative: true }).then(() => syncBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, [syncBalance]);

  const canPlay =
    phase === "ready" && balance >= bet && bet >= LUCKY_NUMBER_MIN_BET && !acting;
  const insufficient = balance < bet;
  const controlsLocked = phase !== "ready" || acting;

  const resetToReady = () => {
    setPhase("ready");
    setDrawnDisplay(null);
    setLastResult(null);
    setShake(false);
    setWinFlash(false);
  };

  const showResultOverlay = useCallback((win: boolean) => {
    setShowResultCard(true);
    if (win) setWinFlash(true);
    else setShake(true);
    window.setTimeout(() => {
      setShowResultCard(false);
      setWinFlash(false);
      setShake(false);
    }, 2200);
  }, []);

  const handlePlay = async (allowRetry = true) => {
    if (!canPlay) return;
    const token = getAuthItem("token");
    if (!token) {
      addToast(t("luckyNumber.mustLogin"), "error");
      return;
    }

    setActing(true);
    setLastResult(null);
    setDrawnDisplay(null);
    setPhase("drawing");

    try {
      const actionId = crypto.randomUUID();
      const res = await fetch(apiUrl("/api/lucky-number/play"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet, selectedNumber, actionId, roundId: actionId }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        drawnNumber?: number;
        win?: boolean;
        gain?: number;
        profit?: number;
        chips?: number;
      };

      if (!res.ok) {
        if (allowRetry && isSoloActiveConflict(data.code)) {
          setPhase("ready");
          await new Promise((r) => window.setTimeout(r, 400));
          return handlePlay(false);
        }
        setPhase("ready");
        throw new Error(data.error ?? data.code ?? t("common.error"));
      }

      const drawnNumber = data.drawnNumber ?? 1;
      const win = Boolean(data.win);
      const gain = data.gain ?? 0;
      const profit = data.profit ?? gain - bet;

      await runLuckyNumberDrawAnimation(drawnNumber, setDrawnDisplay);

      if (typeof data.chips === "number") updateUserBalance(data.chips);
      syncBalance();

      setLastResult({ drawnNumber, win, gain, profit });
      setHistory(pushHistory({ drawnNumber, win }));
      setPhase("result");
      showResultOverlay(win);
    } catch (e) {
      setPhase("ready");
      setDrawnDisplay(null);
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setActing(false);
    }
  };

  const mainButton = () => {
    if (phase === "drawing") {
      return (
        <button
          type="button"
          disabled
          className="min-h-16 w-full cursor-not-allowed rounded-sm border-2 border-amber-600/40 bg-gradient-to-r from-red-900/80 via-orange-900/75 to-amber-900/80 px-4 py-4 text-lg font-black uppercase tracking-[0.12em] text-white/75 opacity-70"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {t("luckyNumber.drawing")}
        </button>
      );
    }
    if (phase === "result") {
      return (
        <button
          type="button"
          onClick={resetToReady}
          className="min-h-16 w-full rounded-sm border-2 border-amber-400/55 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 px-4 py-4 text-lg font-black uppercase tracking-[0.12em] text-white shadow-[0_0_34px_rgba(220,38,38,0.35)] transition hover:scale-[1.02] active:scale-[0.98]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          {t("luckyNumber.replay")}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => void handlePlay()}
        disabled={!canPlay}
        className="min-h-16 w-full rounded-sm border-2 border-amber-400/55 bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 px-4 py-4 text-lg font-black uppercase tracking-[0.12em] text-white shadow-[0_0_34px_rgba(220,38,38,0.38)] transition hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
        style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
      >
        {t("luckyNumber.launch")}
      </button>
    );
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#08030a] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#08030a] via-[#12040c] to-[#050208]" />
        <div className="absolute left-1/2 top-[22%] h-72 w-72 -translate-x-1/2 rounded-full bg-red-600/12 blur-[120px]" />
        <div className="absolute -right-10 top-1/3 h-56 w-56 rounded-full bg-amber-500/8 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(220,38,38,0.35) 0px, rgba(220,38,38,0.35) 1px, transparent 1px, transparent 14px)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(250,204,21,0.15) 0 2px, transparent 3px), radial-gradient(circle at 70% 60%, rgba(250,204,21,0.1) 0 1px, transparent 2px)",
            backgroundSize: "48px 48px, 32px 32px",
          }}
        />
      </div>

      {winFlash ? (
        <div className="pointer-events-none absolute inset-0 z-40 animate-pulse bg-amber-400/10" aria-hidden />
      ) : null}

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-amber-800/30 bg-black/45 px-3 py-3 backdrop-blur-md sm:px-5">
        <SoloGameBackButton onClick={() => navigate(SOLO_GAMES_BACK_PATH)} />
        <div className="flex items-center gap-2 rounded-sm border border-amber-500/30 bg-black/50 px-3 py-1.5 text-sm font-bold tabular-nums text-amber-100">
          <span>{balance.toLocaleString()}</span>
          <ChipIcon size="sm" />
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className={`relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-2 pt-4 sm:px-5 ${shake ? "animate-[shake_0.4s_ease-in-out]" : ""}`}
      >
        <div className="mb-4 shrink-0 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.32em] text-amber-300/90">
            <Clover className="h-4 w-4 text-red-400" />
            {t("luckyNumber.brand")}
          </div>
          <p
            className="mt-1 text-xs italic tracking-wide text-amber-100/65"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {t("luckyNumber.tagline")}
          </p>
        </div>

        <div className="mx-auto w-full max-w-md shrink-0 space-y-5">
          <div className="rounded-sm border-2 border-amber-700/35 bg-[#12060c]/80 p-4 text-center shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-amber-500/80">
              {t("luckyNumber.selectedLabel")}
            </p>
            <motion.p
              key={selectedNumber}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              className="mt-2 font-serif text-6xl font-black tabular-nums text-amber-300 drop-shadow-[0_0_22px_rgba(250,204,21,0.45)] sm:text-7xl"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {selectedNumber}
            </motion.p>
          </div>

          <div className="rounded-sm border-2 border-red-800/30 bg-[#0d0509]/85 p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-red-300/70">
              {t("luckyNumber.drawnLabel")}
            </p>
            <motion.p
              animate={phase === "drawing" ? { filter: ["blur(0px)", "blur(2px)", "blur(0px)"] } : {}}
              transition={{ duration: 0.3, repeat: phase === "drawing" ? Infinity : 0 }}
              className={`mt-2 font-serif text-6xl font-black tabular-nums sm:text-7xl ${
                phase === "result" && lastResult?.win
                  ? "text-emerald-300 drop-shadow-[0_0_20px_rgba(34,197,94,0.45)]"
                  : phase === "result" && lastResult && !lastResult.win
                    ? "text-red-300"
                    : "text-white/90"
              }`}
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              {drawnDisplay ?? "?"}
            </motion.p>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {LUCKY_NUMBER_CHOICES.map((n) => {
              const picked = selectedNumber === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={controlsLocked}
                  onClick={() => setSelectedNumber(n)}
                  className={`flex h-12 min-h-12 w-full items-center justify-center rounded-sm border-2 text-lg font-black tabular-nums transition sm:h-14 sm:text-xl ${
                    picked
                      ? "border-amber-400/70 bg-gradient-to-b from-amber-500/35 to-red-900/50 text-amber-100 shadow-[0_0_24px_rgba(250,204,21,0.35)] scale-[1.04]"
                      : "border-red-900/40 bg-black/40 text-amber-50/85 hover:border-amber-600/45 hover:bg-red-950/35"
                  } disabled:cursor-not-allowed disabled:opacity-45`}
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <p className="text-center text-[11px] text-amber-200/55">
            {t("luckyNumber.multiplierHint", { mult: LUCKY_NUMBER_WIN_MULTIPLIER })}
          </p>

          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {history.length === 0 ? (
              <span className="shrink-0 text-xs text-slate-500">{t("luckyNumber.historyEmpty")}</span>
            ) : (
              history.map((h, i) => (
                <span
                  key={`hist-${h.drawnNumber}-${i}`}
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${historyBadgeClass(h.win)}`}
                >
                  {h.drawnNumber}
                </span>
              ))
            )}
          </div>
        </div>

        {lastResult && phase === "result" ? (
          <div className="mx-auto mt-4 max-w-md text-center">
            <p
              className={`text-lg font-black uppercase tracking-wider ${
                lastResult.win ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {lastResult.win ? t("luckyNumber.won") : t("luckyNumber.lost")}
            </p>
            <p className="mt-1 text-sm text-amber-100/75">
              {t("luckyNumber.drawnResult", { number: lastResult.drawnNumber })}
            </p>
            <p
              className={`mt-1 text-base font-bold tabular-nums ${
                lastResult.profit > 0 ? "text-emerald-300" : "text-red-300"
              }`}
            >
              {lastResult.profit > 0
                ? t("luckyNumber.gainPositive", { amount: lastResult.profit })
                : t("luckyNumber.gainNegative", { amount: bet })}
            </p>
          </div>
        ) : null}
      </motion.div>

      <div className="relative z-30 shrink-0 border-t border-amber-900/35 bg-[#08030a]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl sm:px-5 sm:pt-3">
        <div className="mx-auto w-full max-w-lg space-y-2 sm:space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-500/75">
              {t("luckyNumber.betLabel")}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={controlsLocked}
                onClick={() => setBet((b) => clampBet(b - LUCKY_NUMBER_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-sm border border-amber-800/35 bg-black/40 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-sm border border-amber-600/30 bg-black/50 px-3 py-2.5 font-bold tabular-nums text-amber-100">
                {bet.toLocaleString()}
                <ChipIcon size="sm" />
              </div>
              <button
                type="button"
                disabled={controlsLocked}
                onClick={() => setBet((b) => clampBet(b + LUCKY_NUMBER_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-sm border border-amber-800/35 bg-black/40 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
              {LUCKY_NUMBER_BET_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={controlsLocked || balance < v}
                  onClick={() => setBet(clampBet(v, balance))}
                  className={`rounded-sm px-2.5 py-1 text-xs font-bold transition ${
                    bet === v
                      ? "border border-amber-500/50 bg-amber-950/70 text-amber-100"
                      : "border border-red-900/30 bg-black/35 text-amber-100/75"
                  }`}
                >
                  {v === LUCKY_NUMBER_MAX_BET ? t("minigames.betPresetMax") : v}
                </button>
              ))}
              <button
                type="button"
                disabled={controlsLocked}
                onClick={() => setBet(clampBet(balance, balance))}
                className="rounded-sm border border-red-900/30 bg-black/35 px-2.5 py-1 text-xs font-bold text-amber-100/75"
              >
                {t("minigames.betPresetMax")}
              </button>
            </div>
            {insufficient && phase === "ready" ? (
              <p className="mt-2 text-xs text-red-300">{t("luckyNumber.insufficientBalance")}</p>
            ) : null}
          </div>

          {mainButton()}
        </div>
      </div>

      <AnimatePresence>
        {showResultCard && lastResult ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-none fixed left-1/2 top-[28%] z-40 w-[min(90vw,20rem)] -translate-x-1/2 rounded-sm border-2 px-4 py-4 text-center shadow-2xl backdrop-blur-md ${
              lastResult.win
                ? "border-amber-300/55 bg-emerald-950/90 text-amber-50"
                : "border-red-500/45 bg-red-950/90 text-red-100"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {lastResult.win ? <Sparkles className="h-5 w-5 text-amber-300" /> : null}
              <p className="text-2xl font-black uppercase" style={{ fontFamily: "Georgia, serif" }}>
                {lastResult.win ? t("luckyNumber.won") : t("luckyNumber.lost")}
              </p>
            </div>
            <p className="mt-1 text-sm opacity-90">
              {lastResult.profit > 0
                ? `+${lastResult.profit}`
                : `-${bet}`}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}
