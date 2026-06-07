import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Bomb, Gem, Minus, Plus } from "lucide-react";
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
  MINES_BET_PRESETS,
  MINES_BET_STEP,
  MINES_DEFAULT_MINE_COUNT,
  MINES_GRID_COLS,
  MINES_GRID_SIZE,
  MINES_MAX_BET,
  MINES_MIN_BET,
  MINES_MINE_OPTIONS,
  type CellState,
  clampBet,
  historyBadgeClass,
  multiplierGlowClass,
} from "../features/mines/minesMath";
import {
  fetchMinesActiveRound,
  isSoloActiveConflict,
} from "../features/soloGames/recoverActiveRound";

type Phase = "ready" | "running" | "cashed_out" | "exploded";

const HISTORY_KEY = "qb-mines-history";

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

function buildCellStates(
  phase: Phase,
  revealedCells: number[],
  minePositions: number[] | null,
): CellState[] {
  return Array.from({ length: MINES_GRID_SIZE }, (_, cell) => {
    if (phase === "exploded" && minePositions?.includes(cell)) return "mine";
    if (revealedCells.includes(cell)) return "safe";
    if (phase === "exploded" && minePositions && !minePositions.includes(cell)) return "safe";
    return "hidden";
  });
}

export function Mines() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [balance, setBalance] = useState(getUserBalance());
  const [bet, setBet] = useState(100);
  const [mineCount, setMineCount] = useState(MINES_DEFAULT_MINE_COUNT);
  const [phase, setPhase] = useState<Phase>("ready");
  const [multiplier, setMultiplier] = useState(1);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [revealedCells, setRevealedCells] = useState<number[]>([]);
  const [minePositions, setMinePositions] = useState<number[] | null>(null);
  const [lastResult, setLastResult] = useState<{ kind: "win" | "lose"; amount: number; mult: number } | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [history, setHistory] = useState<number[]>(() => loadHistory());
  const [acting, setActing] = useState(false);
  const [shake, setShake] = useState(false);

  const syncBalance = useCallback(() => {
    setBalance(getUserBalance());
  }, []);

  useEffect(() => {
    void fetchBalanceFromServer({ authoritative: true }).then(() => syncBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, [syncBalance]);

  const resumeActiveRound = useCallback(async (): Promise<boolean> => {
    const active = await fetchMinesActiveRound();
    if (!active) return false;
    setRoundId(active.roundId);
    setBet(active.bet);
    setMineCount(active.mineCount);
    setRevealedCells(active.revealedCells);
    setMultiplier(active.multiplier);
    setMinePositions(null);
    setPhase("running");
    setLastResult(null);
    return true;
  }, []);

  useEffect(() => {
    void resumeActiveRound();
  }, [resumeActiveRound]);

  const canLaunch = phase === "ready" && balance >= bet && bet >= MINES_MIN_BET && !acting;
  const canCashout = phase === "running" && revealedCells.length > 0 && !acting;
  const insufficient = balance < bet;

  const cellStates = useMemo(
    () => buildCellStates(phase, revealedCells, minePositions),
    [minePositions, phase, revealedCells],
  );

  const resetToReady = useCallback(() => {
    setPhase("ready");
    setMultiplier(1);
    setRoundId(null);
    setRevealedCells([]);
    setMinePositions(null);
    setShake(false);
  }, []);

  const showResult = useCallback((kind: "win" | "lose", amount: number, mult: number) => {
    setLastResult({ kind, amount, mult });
    setShowResultCard(true);
    window.setTimeout(() => setShowResultCard(false), 2000);
  }, []);

  const handleStart = async (allowRetry = true) => {
    if (!canLaunch) return;
    const token = getAuthItem("token");
    if (!token) {
      addToast(t("mines.mustLogin"), "error");
      return;
    }
    setActing(true);
    setLastResult(null);
    try {
      const actionId = crypto.randomUUID();
      const res = await fetch(apiUrl("/api/mines/start"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet, mineCount, actionId, roundId: actionId }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        roundId?: string;
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
      trackEvent("play_mines");
      setRoundId(data.roundId ?? actionId);
      setRevealedCells([]);
      setMinePositions(null);
      setMultiplier(1);
      setPhase("running");
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setActing(false);
    }
  };

  const finishWin = useCallback(
    (mult: number, profit: number, chips?: number) => {
      setPhase("cashed_out");
      setMultiplier(mult);
      if (typeof chips === "number") updateUserBalance(chips);
      syncBalance();
      setHistory(pushHistory(mult));
      showResult("win", profit, mult);
      window.setTimeout(resetToReady, 2200);
    },
    [resetToReady, showResult, syncBalance],
  );

  const finishExplosion = useCallback(
    (positions: number[], lost: number) => {
      setShake(true);
      setPhase("exploded");
      setMinePositions(positions);
      setMultiplier(0);
      showResult("lose", lost, 0);
      window.setTimeout(() => {
        setShake(false);
        resetToReady();
      }, 2800);
    },
    [resetToReady, showResult],
  );

  const handleReveal = async (cell: number) => {
    if (phase !== "running" || !roundId || acting || revealedCells.includes(cell)) return;
    const token = getAuthItem("token");
    if (!token) return;
    setActing(true);
    try {
      const res = await fetch(apiUrl("/api/mines/reveal"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roundId, cell }),
      });
      const data = (await res.json()) as {
        error?: string;
        safe?: boolean;
        exploded?: boolean;
        multiplier?: number;
        minePositions?: number[];
        lost?: number;
        autoCashout?: boolean;
        gain?: number;
        profit?: number;
        chips?: number;
      };
      if (!res.ok) {
        throw new Error(data.error ?? t("common.error"));
      }
      if (data.exploded && data.minePositions) {
        setRevealedCells((prev) => (prev.includes(cell) ? prev : [...prev, cell]));
        finishExplosion(data.minePositions, data.lost ?? bet);
        return;
      }
      if (data.safe && typeof data.multiplier === "number") {
        setRevealedCells((prev) => [...prev, cell]);
        setMultiplier(data.multiplier);
        if (data.autoCashout) {
          finishWin(data.multiplier, data.profit ?? (data.gain ?? 0) - bet, data.chips);
        }
      }
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setActing(false);
    }
  };

  const handleCashout = async () => {
    if (!canCashout || !roundId) return;
    const token = getAuthItem("token");
    if (!token) return;
    setActing(true);
    try {
      const res = await fetch(apiUrl("/api/mines/cashout"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roundId }),
      });
      const data = (await res.json()) as {
        error?: string;
        multiplier?: number;
        gain?: number;
        profit?: number;
        chips?: number;
      };
      if (!res.ok) {
        throw new Error(data.error ?? t("common.error"));
      }
      const mult = data.multiplier ?? multiplier;
      finishWin(mult, data.profit ?? (data.gain ?? 0) - bet, data.chips);
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setActing(false);
    }
  };

  const statusLabel = useMemo(() => {
    if (phase === "ready") return t("mines.statusReady");
    if (phase === "running") return t("mines.statusRunning");
    if (phase === "cashed_out") return t("mines.statusCashedOut", { mult: multiplier.toFixed(2) });
    return t("mines.statusExploded");
  }, [multiplier, phase, t]);

  const mainButton = () => {
    if (phase === "running") {
      return (
        <button
          type="button"
          onClick={() => void handleCashout()}
          disabled={!canCashout}
          className="min-h-16 w-full rounded-2xl border border-emerald-300/50 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4 text-lg font-black uppercase tracking-wide text-white shadow-[0_0_34px_rgba(16,185,129,0.35)] transition hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45 disabled:animate-none animate-pulse"
        >
          {t("mines.cashoutAt", { mult: multiplier.toFixed(2) })}
        </button>
      );
    }
    if (phase === "exploded" || phase === "cashed_out") {
      return (
        <button
          type="button"
          onClick={resetToReady}
          className="min-h-14 w-full rounded-2xl border border-teal-400/35 bg-slate-950/80 px-4 py-3 text-lg font-bold uppercase tracking-wide text-emerald-100 transition hover:border-teal-300/50"
        >
          {t("mines.replay")}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => void handleStart()}
        disabled={!canLaunch}
        className="min-h-14 w-full rounded-2xl border border-emerald-300/45 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 px-4 py-3 text-lg font-black uppercase tracking-wide text-white shadow-[0_0_34px_rgba(16,185,129,0.32)] transition hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {t("mines.launch")}
      </button>
    );
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#021712] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#021712] via-[#041f18] to-[#031510]" />
        <div
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(90deg,rgba(16,185,129,0.07)_1px,transparent_1px),linear-gradient(rgba(20,184,166,0.07)_1px,transparent_1px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-emerald-600/12 blur-[100px]" />
        <div className="absolute -right-16 bottom-1/4 h-80 w-80 rounded-full bg-teal-500/10 blur-[110px]" />
      </div>

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 py-3 backdrop-blur-md sm:px-5">
        <button
          type="button"
          onClick={() => navigate("/minigames/quick-solo")}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("mines.back")}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-emerald-300/20 bg-black/45 px-3 py-1.5 text-sm font-bold tabular-nums text-emerald-100">
          <span>{balance.toLocaleString()}</span>
          <ChipIcon size="sm" />
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-2 pt-3 sm:px-5 sm:pt-4">
          <div className="mb-1 shrink-0 text-center sm:mb-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-200/80">
              <Bomb className="h-4 w-4" />
              {t("mines.brand")}
            </div>
            <p className="mt-0.5 text-[11px] italic tracking-wide text-teal-200/60">{t("mines.tagline")}</p>
          </div>

          <motion.div
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.45 }}
            className="relative mx-auto flex w-full max-w-[15.5rem] shrink-0 flex-col items-center sm:max-w-xs"
          >
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("mines.multiplierLabel")}</p>
            <motion.div
              key={multiplier}
              initial={{ scale: 0.96, opacity: 0.85 }}
              animate={{
                scale: phase === "running" ? [1, 1.04, 1] : 1,
                opacity: 1,
              }}
              transition={{ duration: phase === "running" ? 1.1 : 0.25, repeat: phase === "running" ? Infinity : 0 }}
              className={`font-black tabular-nums tracking-tight drop-shadow-[0_0_28px_rgba(16,185,129,0.35)] text-4xl sm:text-5xl md:text-6xl ${
                phase === "exploded" ? "text-red-400" : multiplierGlowClass(multiplier)
              }`}
            >
              {phase === "exploded" ? "BOOM!" : `x${multiplier.toFixed(2)}`}
            </motion.div>

            <div
              className="mt-3 grid w-full gap-1.5 sm:mt-4 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${MINES_GRID_COLS}, minmax(0, 1fr))` }}
            >
              {cellStates.map((state, cell) => (
                <button
                  key={cell}
                  type="button"
                  disabled={phase !== "running" || state !== "hidden" || acting}
                  onClick={() => void handleReveal(cell)}
                  className={`relative aspect-square rounded-xl border transition ${
                    state === "hidden"
                      ? "border-teal-500/35 bg-[#031a14]/90 shadow-[inset_0_0_18px_rgba(20,184,166,0.08)] hover:border-emerald-400/55 hover:shadow-[0_0_16px_rgba(16,185,129,0.2)] disabled:cursor-default disabled:opacity-70"
                      : state === "safe"
                        ? "border-emerald-400/50 bg-gradient-to-br from-emerald-900/70 to-teal-950/80 shadow-[0_0_20px_rgba(52,211,153,0.25)]"
                        : "border-red-400/60 bg-gradient-to-br from-red-950/90 to-orange-950/80 shadow-[0_0_24px_rgba(248,113,113,0.35)]"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {state === "safe" ? (
                      <motion.span
                        key="gem"
                        initial={{ rotateY: 90, scale: 0.85 }}
                        animate={{ rotateY: 0, scale: 1.05 }}
                        className="flex h-full w-full items-center justify-center"
                      >
                        <Gem className="h-4 w-4 text-emerald-300 sm:h-5 sm:w-5" />
                      </motion.span>
                    ) : null}
                    {state === "mine" ? (
                      <motion.span
                        key="mine"
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: [1, 1.15, 1], opacity: 1 }}
                        className="flex h-full w-full items-center justify-center"
                      >
                        <Bomb className="h-4 w-4 text-red-300 sm:h-5 sm:w-5" />
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </button>
              ))}
            </div>

            <p className="mt-2 text-center text-xs font-medium text-slate-300/90 sm:mt-3 sm:text-sm">{statusLabel}</p>
          </motion.div>
        </div>

        <aside className="hidden w-44 shrink-0 border-l border-white/10 bg-black/25 p-4 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("mines.history")}</p>
          <div className="flex flex-col gap-2">
            {history.map((h, i) => (
              <span
                key={`desk-${h}-${i}`}
                className={`rounded-lg border px-2 py-1.5 text-center text-xs font-bold ${historyBadgeClass(Math.max(h, 1))}`}
              >
                {h <= 0 ? "—" : `x${h.toFixed(2)}`}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <div className="relative z-30 shrink-0 border-t border-white/10 bg-[#021712]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-5 sm:pt-3">
        <div className="mx-auto w-full max-w-lg space-y-2 sm:space-y-3">
          <div className="lg:hidden">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("mines.history")}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
              {history.length === 0 ? (
                <span className="shrink-0 text-xs text-slate-500">{t("mines.historyEmpty")}</span>
              ) : (
                history.map((h, i) => (
                  <span
                    key={`${h}-${i}`}
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${historyBadgeClass(Math.max(h, 1))}`}
                  >
                    {h <= 0 ? "—" : `x${h.toFixed(2)}`}
                  </span>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("mines.betLabel")}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={phase !== "ready"}
                onClick={() => setBet((b) => clampBet(b - MINES_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-black/45 px-3 py-2.5 font-bold tabular-nums">
                {bet.toLocaleString()}
                <ChipIcon size="sm" />
              </div>
              <button
                type="button"
                disabled={phase !== "ready"}
                onClick={() => setBet((b) => clampBet(b + MINES_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
              {MINES_BET_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={phase !== "ready" || balance < v}
                  onClick={() => setBet(clampBet(v, balance))}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    bet === v
                      ? "border border-emerald-300/50 bg-emerald-950/70 text-emerald-100"
                      : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {v === MINES_MAX_BET ? t("minigames.betPresetMax") : v}
                </button>
              ))}
            </div>
            {insufficient && phase === "ready" ? (
              <p className="mt-2 text-xs text-red-300">{t("mines.insufficientBalance")}</p>
            ) : null}
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("mines.minesLabel")}</p>
            <div className="flex flex-wrap gap-1.5">
              {MINES_MINE_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={phase !== "ready"}
                  onClick={() => setMineCount(count)}
                  className={`min-w-[2.5rem] rounded-lg px-2.5 py-1.5 text-xs font-bold transition ${
                    mineCount === count
                      ? "border border-teal-300/50 bg-teal-950/70 text-teal-100"
                      : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {mainButton()}

          {lastResult ? (
            <p className="text-center text-sm text-slate-300">
              {lastResult.kind === "win"
                ? t("mines.lastWin", { amount: lastResult.amount, mult: lastResult.mult.toFixed(2) })
                : t("mines.lastLose", { amount: lastResult.amount })}
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
            className={`pointer-events-none fixed left-1/2 top-[32%] z-40 w-[min(90vw,20rem)] -translate-x-1/2 rounded-2xl border px-4 py-4 text-center shadow-2xl backdrop-blur-md ${
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
                ? t("mines.resultCashed", { mult: lastResult.mult.toFixed(2) })
                : t("mines.resultExploded")}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
