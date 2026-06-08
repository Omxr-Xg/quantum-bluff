import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CircleDot, Minus, Plus } from "lucide-react";
import { ChipIcon } from "../components/ChipIcon";
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
  WHEEL_BET_PRESETS,
  WHEEL_BET_STEP,
  WHEEL_MAX_BET,
  WHEEL_MIN_BET,
  WHEEL_SEGMENTS,
  buildWheelConicGradient,
  clampBet,
  computeWheelSpinDeltaFromFinalAngle,
  historyBadgeClass,
  wheelSegmentIndexAtPointer,
  wheelSegmentLabelPosition,
} from "../features/wheel/wheelMath";
import { isSoloActiveConflict } from "../features/soloGames/recoverActiveRound";

type Phase = "ready" | "spinning" | "result";

const HISTORY_KEY = "qb-wheel-history";
const SPIN_MS = 4200;

type HistoryEntry = { label: string; multiplier: number };

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed
          .filter((e): e is HistoryEntry => typeof e === "object" && e != null && "multiplier" in e)
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

export function Wheel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [balance, setBalance] = useState(getUserBalance());
  const [bet, setBet] = useState(100);
  const [phase, setPhase] = useState<Phase>("ready");
  const [rotation, setRotation] = useState(0);
  const [lastSpin, setLastSpin] = useState<{
    label: string;
    multiplier: number;
    gain: number;
    profit: number;
  } | null>(null);
  const [showResultCard, setShowResultCard] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [acting, setActing] = useState(false);
  const [jackpotShake, setJackpotShake] = useState(false);

  const rotationRef = useRef(0);
  const spinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const syncBalance = useCallback(() => {
    setBalance(getUserBalance());
  }, []);

  useEffect(() => {
    void fetchBalanceFromServer({ authoritative: true }).then(() => syncBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, [syncBalance]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
    };
  }, []);

  const canSpin = phase === "ready" && balance >= bet && bet >= WHEEL_MIN_BET && !acting;
  const insufficient = balance < bet;

  const showResult = useCallback((label: string, multiplier: number) => {
    setShowResultCard(true);
    if (label === "JACKPOT" || multiplier >= 20) setJackpotShake(true);
    window.setTimeout(() => {
      setShowResultCard(false);
      setJackpotShake(false);
    }, 2000);
  }, []);

  const handleSpin = async (allowRetry = true) => {
    if (!canSpin) return;
    const token = getAuthItem("token");
    if (!token) {
      addToast(t("wheel.mustLogin"), "error");
      return;
    }

    setActing(true);
    setLastSpin(null);
    setPhase("spinning");

    try {
      const actionId = crypto.randomUUID();
      const res = await fetch(apiUrl("/api/wheel/spin"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet, actionId, roundId: actionId }),
      });
      const data = (await res.json()) as {
        error?: string;
        code?: string;
        result?: string;
        multiplier?: number;
        gain?: number;
        profit?: number;
        finalAngle?: number;
        segmentIndex?: number;
        chips?: number;
      };

      if (!res.ok) {
        if (allowRetry && isSoloActiveConflict(data.code)) {
          setPhase("ready");
          await new Promise((r) => window.setTimeout(r, 400));
          return handleSpin(false);
        }
        setPhase("ready");
        throw new Error(data.error ?? data.code ?? t("common.error"));
      }

      const label = data.result ?? "x1";
      const multiplier = data.multiplier ?? 1;
      const gain = data.gain ?? 0;
      const profit = data.profit ?? gain - bet;
      const finalAngle = data.finalAngle ?? 2160;
      const spinDelta = computeWheelSpinDeltaFromFinalAngle(rotationRef.current, finalAngle);
      const nextRotation = rotationRef.current + spinDelta;
      rotationRef.current = nextRotation;
      setRotation(nextRotation);

      if (
        typeof data.segmentIndex === "number" &&
        wheelSegmentIndexAtPointer(nextRotation) !== data.segmentIndex
      ) {
        console.warn("[wheel] segment mismatch after spin", {
          expected: data.segmentIndex,
          actual: wheelSegmentIndexAtPointer(nextRotation),
        });
      }

      if (typeof data.chips === "number") updateUserBalance(data.chips);

      if (spinTimerRef.current) clearTimeout(spinTimerRef.current);
      spinTimerRef.current = setTimeout(() => {
        syncBalance();
        setLastSpin({ label, multiplier, gain, profit });
        setHistory(pushHistory({ label, multiplier }));
        setPhase("result");
        showResult(label, multiplier);
        spinTimerRef.current = null;
      }, SPIN_MS);
    } catch (e) {
      setPhase("ready");
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setActing(false);
    }
  };

  const resetToReady = () => {
    setPhase("ready");
    setLastSpin(null);
  };

  const mainButton = () => {
    if (phase === "spinning") {
      return (
        <button
          type="button"
          disabled
          className="min-h-16 w-full cursor-not-allowed rounded-2xl border border-violet-300/30 bg-gradient-to-r from-violet-900/70 to-fuchsia-900/70 px-4 py-4 text-lg font-black uppercase tracking-wide text-white/80 opacity-60"
        >
          {t("wheel.spinning")}
        </button>
      );
    }
    if (phase === "result") {
      return (
        <button
          type="button"
          onClick={resetToReady}
          className="min-h-14 w-full rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-500 via-violet-500 to-fuchsia-600 px-4 py-3 text-lg font-black uppercase tracking-wide text-white shadow-[0_0_34px_rgba(139,92,246,0.32)] transition hover:scale-[1.03] active:scale-[0.97]"
        >
          {t("wheel.relaunch")}
        </button>
      );
    }
    return (
      <button
        type="button"
        onClick={() => void handleSpin()}
        disabled={!canSpin}
        className="min-h-16 w-full rounded-2xl border border-amber-300/45 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-400 px-4 py-4 text-lg font-black uppercase tracking-wide text-white shadow-[0_0_34px_rgba(139,92,246,0.35)] transition hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
      >
        {t("wheel.launch")}
      </button>
    );
  };

  return (
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#12051f] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[#12051f] via-[#1f0b2e] to-[#0b0614]" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "conic-gradient(from 0deg at 50% 50%, rgba(139,92,246,0.08) 0deg, transparent 40deg, transparent 80deg, rgba(250,204,21,0.06) 120deg, transparent 160deg, transparent 220deg, rgba(236,72,153,0.07) 280deg, transparent 320deg)",
          }}
        />
        <div className="absolute left-1/2 top-[28%] h-64 w-64 -translate-x-1/2 rounded-full bg-amber-400/10 blur-[100px]" />
        <div className="absolute -right-16 bottom-1/4 h-72 w-72 rounded-full bg-violet-600/12 blur-[110px]" />
      </div>

      <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 py-3 backdrop-blur-md sm:px-5">
        <button
          type="button"
          onClick={() => navigate("/minigames/quick-solo")}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("wheel.back")}
        </button>
        <div className="flex items-center gap-2 rounded-full border border-amber-300/25 bg-black/45 px-3 py-1.5 text-sm font-bold tabular-nums text-amber-100">
          <span>{balance.toLocaleString()}</span>
          <ChipIcon size="sm" />
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-2 pt-3 sm:px-5 sm:pt-4">
          <div className="mb-2 shrink-0 text-center">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.28em] text-violet-200/90">
              <CircleDot className="h-4 w-4" />
              {t("wheel.brand")}
            </div>
            <p className="mt-0.5 text-[11px] italic tracking-wide text-amber-200/70">{t("wheel.tagline")}</p>
          </div>

          <motion.div
            animate={jackpotShake ? { x: [0, -5, 5, -3, 3, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="relative mx-auto w-[min(80vw,22rem)] shrink-0 sm:w-[min(80vw,28rem)]"
          >
            <div className="relative aspect-square w-full">
              <div
                className="pointer-events-none absolute -top-1 left-1/2 z-30 -translate-x-1/2 animate-pulse"
                aria-hidden
              >
                <div className="h-0 w-0 border-x-[12px] border-b-[20px] border-x-transparent border-b-amber-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.65)] sm:border-x-[14px] sm:border-b-[24px]" />
              </div>

              <div
                className="absolute inset-[5%] rounded-full border-4 border-amber-400/45 shadow-[0_0_48px_rgba(250,204,21,0.22),inset_0_0_24px_rgba(0,0,0,0.35)] transition-transform duration-[4200ms] ease-[cubic-bezier(0.12,0,0.18,1)]"
                style={{
                  transform: `rotate(${rotation}deg)`,
                  background: buildWheelConicGradient(),
                }}
              >
                {WHEEL_SEGMENTS.map((seg, i) => {
                  const pos = wheelSegmentLabelPosition(i)
                  return (
                    <span
                      key={`${seg.kind}-${i}`}
                      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[9px] font-black uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:text-[11px]"
                      style={{ left: pos.left, top: pos.top, color: seg.textColor }}
                    >
                      {seg.label}
                    </span>
                  )
                })}
                <div className="absolute inset-[26%] flex items-center justify-center rounded-full border-2 border-amber-500/35 bg-[#1a0a2e]/95 shadow-inner">
                  <CircleDot className="h-8 w-8 text-amber-300/80 sm:h-10 sm:w-10" />
                </div>
              </div>
            </div>

            {lastSpin ? (
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-300">
                  {t("wheel.resultLabel", { result: lastSpin.label })}
                </p>
                <p
                  className={`mt-1 text-lg font-bold tabular-nums ${
                    lastSpin.profit > 0 ? "text-emerald-300" : lastSpin.profit < 0 ? "text-red-300" : "text-slate-200"
                  }`}
                >
                  {lastSpin.profit > 0
                    ? t("wheel.gainPositive", { amount: lastSpin.profit })
                    : lastSpin.profit < 0
                      ? t("wheel.gainNegative", { amount: Math.abs(lastSpin.profit) })
                      : t("wheel.gainBreakEven")}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-center text-sm text-slate-400">
                {phase === "spinning" ? t("wheel.statusSpinning") : t("wheel.statusReady")}
              </p>
            )}

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3">
              <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                {t("wheel.payoutLegend")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {WHEEL_SEGMENTS.map((seg, i) => (
                  <div
                    key={`legend-${seg.kind}-${i}`}
                    className="flex min-w-[2.6rem] shrink-0 flex-col items-center gap-1 rounded-lg border border-white/8 bg-black/25 px-1 py-1.5"
                  >
                    <span
                      className="h-4 w-full rounded-md border border-white/15 shadow-inner sm:h-5"
                      style={{ backgroundColor: seg.color }}
                      aria-hidden
                    />
                    <span
                      className="text-[10px] font-black tabular-nums sm:text-xs"
                      style={{ color: seg.textColor }}
                    >
                      {seg.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide lg:hidden">
              {history.length === 0 ? (
                <span className="shrink-0 text-xs text-slate-500">{t("wheel.historyEmpty")}</span>
              ) : (
                history.map((h, i) => (
                  <span
                    key={`mob-${h.label}-${i}`}
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${historyBadgeClass(h.multiplier, h.label)}`}
                  >
                    {h.label}
                  </span>
                ))
              )}
            </div>
          </motion.div>
        </div>

        <aside className="hidden w-52 shrink-0 border-l border-white/10 bg-black/25 p-4 lg:block">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("wheel.payoutLegend")}</p>
          <div className="mb-5 flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
            {WHEEL_SEGMENTS.map((seg, i) => (
              <div
                key={`legend-desk-${seg.kind}-${i}`}
                className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/30 px-2 py-1.5"
              >
                <span className="w-4 shrink-0 text-center text-[10px] font-bold text-slate-500">{i + 1}</span>
                <span
                  className="h-5 w-5 shrink-0 rounded-md border border-white/15 shadow-inner"
                  style={{ backgroundColor: seg.color }}
                  aria-hidden
                />
                <span className="text-xs font-black tabular-nums" style={{ color: seg.textColor }}>
                  {seg.label}
                </span>
              </div>
            ))}
          </div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("wheel.history")}</p>
          <div className="flex flex-col gap-2">
            {history.map((h, i) => (
              <span
                key={`desk-${h.label}-${i}`}
                className={`rounded-lg border px-2 py-1.5 text-center text-xs font-bold ${historyBadgeClass(h.multiplier, h.label)}`}
              >
                {h.label}
              </span>
            ))}
          </div>
        </aside>
      </div>

      <div className="relative z-30 shrink-0 border-t border-white/10 bg-[#12051f]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:px-5 sm:pt-3">
        <div className="mx-auto w-full max-w-lg space-y-2 sm:space-y-3">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">{t("wheel.betLabel")}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={phase !== "ready"}
                onClick={() => setBet((b) => clampBet(b - WHEEL_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-300/25 bg-black/45 px-3 py-2.5 font-bold tabular-nums">
                {bet.toLocaleString()}
                <ChipIcon size="sm" />
              </div>
              <button
                type="button"
                disabled={phase !== "ready"}
                onClick={() => setBet((b) => clampBet(b + WHEEL_BET_STEP, balance))}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
              {WHEEL_BET_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={phase !== "ready" || balance < v}
                  onClick={() => setBet(clampBet(v, balance))}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    bet === v
                      ? "border border-violet-300/50 bg-violet-950/70 text-violet-100"
                      : "border border-white/10 bg-white/5 text-slate-300"
                  }`}
                >
                  {v === WHEEL_MAX_BET ? t("minigames.betPresetMax") : v}
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
              <p className="mt-2 text-xs text-red-300">{t("wheel.insufficientBalance")}</p>
            ) : null}
          </div>

          {mainButton()}
        </div>
      </div>

      <AnimatePresence>
        {showResultCard && lastSpin ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            className={`pointer-events-none fixed left-1/2 top-[30%] z-40 w-[min(90vw,20rem)] -translate-x-1/2 rounded-2xl border px-4 py-4 text-center shadow-2xl backdrop-blur-md ${
              lastSpin.label === "JACKPOT" || lastSpin.multiplier >= 20
                ? "border-amber-300/55 bg-amber-950/90 text-amber-100"
                : lastSpin.profit > 0
                  ? "border-emerald-400/40 bg-emerald-950/85 text-emerald-100"
                  : lastSpin.profit < 0
                    ? "border-red-400/40 bg-red-950/85 text-red-100"
                    : "border-slate-400/35 bg-slate-950/85 text-slate-100"
            }`}
          >
            <p className="text-2xl font-black">{lastSpin.label}</p>
            <p className="mt-1 text-sm opacity-90">
              {lastSpin.profit > 0
                ? `+${lastSpin.profit}`
                : lastSpin.profit < 0
                  ? `-${Math.abs(lastSpin.profit)}`
                  : t("wheel.gainBreakEven")}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
