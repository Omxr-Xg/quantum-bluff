import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Minus, Plus, TrendingUp } from "lucide-react";
import { ChipIcon } from "../components/ChipIcon";
import { useToast } from "../contexts/ToastContext";
import { getAuthItem } from "../utils/authStorage";
import { trackEvent } from "../utils/analytics";
import { apiUrl } from "../utils/apiBase";
import {
  updateUserBalance,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
  fetchBalanceFromServer,
} from "../utils/userProfile";
import {
  CRASH_BET_PRESETS,
  CRASH_BET_STEP,
  CRASH_MAX_BET,
  CRASH_MIN_BET,
  buildCurvePoints,
  clampBet,
  historyBadgeClass,
  multiplierAtElapsedMs,
  multiplierColorClass,
} from "../features/crash/crashMath";
import {
  fetchCrashActiveRound,
  isSoloActiveConflict,
} from "../features/soloGames/recoverActiveRound";

type Phase = "ready" | "running" | "cashed_out" | "crashed";

const HISTORY_KEY = "qb-crash-history";

function loadHistory(): number[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n)).slice(0, 20)
      : [];
  } catch {
    return [];
  }
}

function pushHistory(mult: number) {
  const next = [mult, ...loadHistory()].slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  return next;
}

export function Crash() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [balance, setBalance] = useState(getUserBalance());
  const [bet, setBet] = useState(100);
  const [phase, setPhase] = useState<Phase>("ready");
  const [multiplier, setMultiplier] = useState(1);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ kind: "win" | "lose"; amount: number; mult: number } | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [history, setHistory] = useState<number[]>(() => loadHistory());
  const [acting, setActing] = useState(false);

  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const syncBalance = useCallback(() => {
    setBalance(getUserBalance());
  }, []);

  useEffect(() => {
    void fetchBalanceFromServer({ authoritative: true }).then(() => syncBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, [syncBalance]);

  const resumeActiveRound = useCallback(async (): Promise<boolean> => {
    const active = await fetchCrashActiveRound();
    if (!active) return false;
    setRoundId(active.roundId);
    setStartedAtMs(active.startedAt);
    setBet(active.bet);
    setMultiplier(active.multiplier);
    setPhase("running");
    setLastResult(null);
    return true;
  }, []);

  useEffect(() => {
    void resumeActiveRound();
  }, [resumeActiveRound]);

  const canLaunch = phase === "ready" && balance >= bet && bet >= CRASH_MIN_BET && !acting;
  const insufficient = balance < bet;

  const stopTimers = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (settleTimerRef.current) clearInterval(settleTimerRef.current);
    settleTimerRef.current = null;
  }, []);

  const resetToReady = useCallback(() => {
    stopTimers();
    setPhase("ready");
    setMultiplier(1);
    setRoundId(null);
    setStartedAtMs(null);
    setCrashPoint(null);
  }, [stopTimers]);

  const showResult = useCallback((kind: "win" | "lose", amount: number, mult: number) => {
    setLastResult({ kind, amount, mult });
    setShowResultCard(true);
    window.setTimeout(() => setShowResultCard(false), 2000);
  }, []);

  const pollSettle = useCallback(
    async (id: string) => {
      const token = getAuthItem("token");
      if (!token) return;
      try {
        const res = await fetch(apiUrl("/api/crash/settle"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ roundId: id }),
        });
        const data = (await res.json()) as {
          status?: string;
          crashPoint?: number;
          chips?: number;
          lost?: number;
        };
        if (data.status === "crashed" && typeof data.crashPoint === "number") {
          stopTimers();
          setPhase("crashed");
          setCrashPoint(data.crashPoint);
          setMultiplier(data.crashPoint);
          setHistory(pushHistory(data.crashPoint));
          showResult("lose", data.lost ?? bet, data.crashPoint);
          if (typeof data.chips === "number") updateUserBalance(data.chips);
          syncBalance();
          window.setTimeout(resetToReady, 2200);
        }
      } catch {
        /* ignore poll errors */
      }
    },
    [bet, resetToReady, showResult, stopTimers, syncBalance],
  );

  useEffect(() => {
    if (phase !== "running" || startedAtMs == null) return;

    const tick = () => {
      const m = multiplierAtElapsedMs(Date.now() - startedAtMs);
      setMultiplier(m);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, startedAtMs]);

  useEffect(() => {
    if (phase !== "running" || !roundId) return;
    settleTimerRef.current = setInterval(() => void pollSettle(roundId), 280);
    return () => {
      if (settleTimerRef.current) clearInterval(settleTimerRef.current);
    };
  }, [phase, pollSettle, roundId]);

  const handleStart = async (allowRetry = true) => {
    if (!canLaunch) return;
    const token = getAuthItem("token");
    if (!token) {
      addToast(t("crash.mustLogin"), "error");
      return;
    }
    setActing(true);
    setLastResult(null);
    try {
      const actionId = crypto.randomUUID();
      const res = await fetch(apiUrl("/api/crash/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet, actionId, roundId: actionId }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        roundId?: string;
        startedAt?: number;
        chips?: number;
      };
      if (!res.ok) {
        if (isSoloActiveConflict(data.code)) {
          if (await resumeActiveRound()) {
            addToast(t("minigames.sessionResumed"), "info");
            return;
          }
          if (allowRetry) {
            return handleStart(false);
          }
        }
        throw new Error(data.error ?? data.code ?? t("common.error"));
      }
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      syncBalance();
      trackEvent("play_crash");
      setRoundId(data.roundId ?? actionId);
      setStartedAtMs(data.startedAt ?? Date.now());
      setMultiplier(1);
      setPhase("running");
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setActing(false);
    }
  };

  const handleCashout = async () => {
    if (phase !== "running" || !roundId || acting) return;
    const token = getAuthItem("token");
    if (!token) return;
    setActing(true);
    stopTimers();
    try {
      const res = await fetch(apiUrl("/api/crash/cashout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roundId, multiplier }),
      });
      const data = (await res.json()) as {
        error?: string;
        multiplier?: number;
        payout?: number;
        profit?: number;
        crashPoint?: number;
        chips?: number;
      };
      if (!res.ok) {
        if (data.error === "ALREADY_CRASHED") {
          void pollSettle(roundId);
          return;
        }
        throw new Error(data.error ?? t("common.error"));
      }
      const mult = data.multiplier ?? multiplier;
      const profit = data.profit ?? (data.payout ?? 0) - bet;
      setPhase("cashed_out");
      setMultiplier(mult);
      if (typeof data.crashPoint === "number") setCrashPoint(data.crashPoint);
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      syncBalance();
      setHistory(pushHistory(mult));
      showResult("win", profit, mult);
      window.setTimeout(() => {
        if (data.crashPoint) setPhase("crashed");
        window.setTimeout(resetToReady, 1200);
      }, 1800);
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
      setPhase("running");
    } finally {
      setActing(false);
    }
  };

  const curvePath = useMemo(() => {
    const elapsed = phase === "ready" ? 0 : startedAtMs ? Date.now() - startedAtMs : 0;
    return buildCurvePoints(Math.max(elapsed, 400), 320, 120);
  }, [multiplier, phase, startedAtMs]);

  const statusLabel = useMemo(() => {
    if (phase === "ready") return t("crash.statusReady");
    if (phase === "running") return t("crash.statusRunning");
    if (phase === "cashed_out") return t("crash.statusCashedOut", { mult: multiplier.toFixed(2) });
    return t("crash.statusCrashed", { mult: (crashPoint ?? multiplier).toFixed(2) });
  }, [crashPoint, multiplier, phase, t]);

  const mainButton = () => {
    if (phase === "running") {
      return (
        <button
          type="button"
          onClick={() => void handleCashout()}
          disabled={acting}
          className="min-h-16 w-full rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-lg font-black uppercase tracking-wide text-white shadow-[0_0_34px_rgba(34,197,94,0.35)] transition hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 animate-pulse"
        >
          {t("crash.cashoutAt", { mult: multiplier.toFixed(2) })}
        </button>
      );
    }
    if (phase === "crashed" || phase === "cashed_out") {
      return (
        <button
          type="button"
          onClick={resetToReady}
          className="min-h-14 w-full rounded-2xl border border-orange-400/35 bg-slate-950/80 px-4 py-3 text-lg font-bold uppercase tracking-wide text-orange-100 transition hover:border-orange-300/50"
        >
          {t("crash.relaunch")}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => void handleStart()}
        disabled={!canLaunch}
        className="min-h-14 w-full rounded-2xl border border-orange-300/45 bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 px-4 py-3 text-lg font-black uppercase tracking-wide text-white shadow-[0_0_34px_rgba(251,146,60,0.32)] transition hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {t("crash.launch")}
      </button>
    );
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[#12040a] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#12040a] via-[#1a0b16] to-[#2a0f08]" />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(90deg,rgba(251,113,133,0.07)_1px,transparent_1px),linear-gradient(rgba(251,146,60,0.07)_1px,transparent_1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-rose-600/15 blur-[100px]" />
        <div className="absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-orange-500/12 blur-[110px]" />
      </div>

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 py-3 backdrop-blur-md sm:px-5">
        <button
          type="button"
          onClick={() => navigate("/minigames/quick-solo")}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("crash.back")}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-orange-300/20 bg-black/45 px-3 py-1.5 text-sm font-bold tabular-nums text-amber-100">
          <span>{balance.toLocaleString()}</span>
          <ChipIcon size="sm" />
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-4 sm:px-5">
          <div className="mb-2 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-orange-200/80">
              <TrendingUp className="h-4 w-4" />
              {t("crash.brand")}
            </div>
            <p className="mt-1 text-[11px] italic tracking-wide text-rose-200/60">{t("crash.tagline")}</p>
          </div>

          <div className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center">
            <motion.div
              animate={
                phase === "crashed"
                  ? { x: [0, -6, 6, -4, 4, 0], scale: [1, 1.02, 1] }
                  : phase === "running"
                    ? { scale: [1, 1.02, 1] }
                    : {}
              }
              transition={{ duration: phase === "crashed" ? 0.45 : 1.2, repeat: phase === "running" ? Infinity : 0 }}
              className={`font-black tabular-nums tracking-tight drop-shadow-[0_0_28px_rgba(251,146,60,0.35)] text-6xl sm:text-7xl md:text-8xl lg:text-9xl ${multiplierColorClass(multiplier, phase)} ${
                phase === "crashed" ? "text-red-400" : ""
              }`}
            >
              {phase === "crashed" ? (
                <span>
                  CRASH <span className="text-4xl sm:text-5xl md:text-6xl">x{(crashPoint ?? multiplier).toFixed(2)}</span>
                </span>
              ) : (
                `x${multiplier.toFixed(2)}`
              )}
            </motion.div>

            <div className="relative mt-4 h-28 w-full max-w-md sm:h-32">
              <svg viewBox="0 0 320 120" className="h-full w-full overflow-visible" aria-hidden>
                <defs>
                  <linearGradient id="crashCurveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={phase === "crashed" ? "#ef4444" : "#fb923c"} />
                    <stop offset="100%" stopColor={phase === "crashed" ? "#b91c1c" : "#ec4899"} />
                  </linearGradient>
                </defs>
                <path
                  d={curvePath}
                  fill="none"
                  stroke="url(#crashCurveGrad)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="drop-shadow-[0_0_10px_rgba(251,146,60,0.55)]"
                />
                {phase !== "ready" ? (
                  <circle
                    cx={Math.min(300, Math.max(8, (multiplier - 1) * 40))}
                    cy={60}
                    r="5"
                    className={phase === "crashed" ? "fill-red-400" : "fill-orange-300"}
                  />
                ) : null}
              </svg>
            </div>

            <p className="mt-3 text-sm font-medium text-slate-300/90">{statusLabel}</p>
          </div>

          <aside className="mt-4 lg:hidden">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("crash.history")}</p>
            <div className="flex flex-wrap gap-2">
              {history.length === 0 ? (
                <span className="text-xs text-slate-500">{t("crash.historyEmpty")}</span>
              ) : (
                history.map((h, i) => (
                  <span key={`${h}-${i}`} className={`rounded-full border px-2.5 py-1 text-xs font-bold ${historyBadgeClass(h)}`}>
                    x{h.toFixed(2)}
                  </span>
                ))
              )}
            </div>
          </aside>
        </div>

        <aside className="hidden w-44 shrink-0 border-l border-white/10 bg-black/25 p-4 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("crash.history")}</p>
          <div className="flex flex-col gap-2">
            {history.map((h, i) => (
              <span key={`desk-${h}-${i}`} className={`rounded-lg border px-2 py-1.5 text-center text-xs font-bold ${historyBadgeClass(h)}`}>
                x{h.toFixed(2)}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <div className="relative z-20 shrink-0 border-t border-white/10 bg-gradient-to-t from-black/80 via-black/55 to-transparent px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="mx-auto w-full max-w-lg space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("crash.betLabel")}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={phase !== "ready"}
                onClick={() => setBet((b) => clampBet(b - CRASH_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-300/25 bg-black/45 px-3 py-2.5 font-bold tabular-nums">
                {bet.toLocaleString()}
                <ChipIcon size="sm" />
              </div>
              <button
                type="button"
                disabled={phase !== "ready"}
                onClick={() => setBet((b) => clampBet(b + CRASH_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CRASH_BET_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={phase !== "ready" || balance < v}
                  onClick={() => setBet(clampBet(v, balance))}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    bet === v
                      ? "border border-orange-300/50 bg-orange-950/70 text-orange-100"
                      : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {v === CRASH_MAX_BET ? t("minigames.betPresetMax") : v}
                </button>
              ))}
              <button
                type="button"
                disabled={phase !== "ready"}
                onClick={() => setBet(clampBet(balance, balance))}
                className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-slate-300"
              >
                {t("minigames.betPresetMax")}
              </button>
            </div>
            {insufficient && phase === "ready" ? (
              <p className="mt-2 text-xs text-red-300">{t("crash.insufficientBalance")}</p>
            ) : null}
          </div>

          {mainButton()}

          {lastResult ? (
            <p className="text-center text-sm text-slate-300">
              {lastResult.kind === "win"
                ? t("crash.lastWin", { amount: lastResult.amount, mult: lastResult.mult.toFixed(2) })
                : t("crash.lastLose", { amount: lastResult.amount, mult: lastResult.mult.toFixed(2) })}
            </p>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {showResultCard && lastResult ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-none fixed left-1/2 top-[38%] z-40 w-[min(90vw,20rem)] -translate-x-1/2 rounded-2xl border px-4 py-4 text-center shadow-2xl backdrop-blur-md ${
              lastResult.kind === "win"
                ? "border-emerald-400/40 bg-emerald-950/85 text-emerald-100"
                : "border-red-400/40 bg-red-950/85 text-red-100"
            }`}
          >
            <p className="text-2xl font-black">
              {lastResult.kind === "win" ? `+${lastResult.amount}` : `-${lastResult.amount}`}
            </p>
            <p className="mt-1 text-sm opacity-90">
              {lastResult.kind === "win"
                ? t("crash.resultCashed", { mult: lastResult.mult.toFixed(2) })
                : t("crash.resultCrashed", { mult: lastResult.mult.toFixed(2) })}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
