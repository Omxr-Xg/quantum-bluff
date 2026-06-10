import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
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
  CRASH_MIN_BET,
  clampBet,
  multiplierAtElapsedMs,
} from "../features/crash/crashMath";
import {
  crashCurveProgress,
  drawCrashCanvas,
} from "../features/crash/crashCanvas";
import {
  fetchCrashActiveRound,
  isSoloActiveConflict,
} from "../features/soloGames/recoverActiveRound";
import { CrashGameView, type CrashUiPhase } from "../components/crash/CrashGameView";

type Phase = CrashUiPhase;

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
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [phase, setPhase] = useState<Phase>("ready");
  const [multiplier, setMultiplier] = useState(1);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [cashoutProfit, setCashoutProfit] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>(() => loadHistory());
  const [acting, setActing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [hasBet, setHasBet] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCashoutTriggeredRef = useRef(false);

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
    setCashedOutAt(null);
    setCashoutProfit(null);
    autoCashoutTriggeredRef.current = false;
    return true;
  }, []);

  useEffect(() => {
    void resumeActiveRound();
  }, [resumeActiveRound]);

  const canPlaceBet =
    phase === "ready" && !hasBet && balance >= bet && bet >= CRASH_MIN_BET && !acting;
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
    setCashedOutAt(null);
    setCashoutProfit(null);
    setHasBet(false);
    setCountdown(5);
    autoCashoutTriggeredRef.current = false;
  }, [stopTimers]);

  const executeStart = useCallback(
    async (allowRetry = true) => {
      const token = getAuthItem("token");
      if (!token) {
        addToast(t("crash.mustLogin"), "error");
        setHasBet(false);
        return;
      }
      setActing(true);
      setCashedOutAt(null);
      setCashoutProfit(null);
      autoCashoutTriggeredRef.current = false;
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
              setHasBet(false);
              return;
            }
            if (allowRetry) {
              return executeStart(false);
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
        setCrashPoint(null);
        setHasBet(false);
        setPhase("running");
      } catch (e) {
        addToast(e instanceof Error ? e.message : t("common.error"), "error");
        setHasBet(false);
        setCountdown(5);
      } finally {
        setActing(false);
      }
    },
    [addToast, bet, resumeActiveRound, syncBalance, t],
  );

  useEffect(() => {
    if (phase !== "ready") return;
    if (countdown <= 0) {
      if (hasBet) {
        if (!acting) void executeStart();
        return;
      }
      setCountdown(5);
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [acting, countdown, executeStart, hasBet, phase]);

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
        };
        if (data.status === "crashed" && typeof data.crashPoint === "number") {
          stopTimers();
          setPhase("crashed");
          setCrashPoint(data.crashPoint);
          setMultiplier(data.crashPoint);
          setHistory(pushHistory(data.crashPoint));
          if (typeof data.chips === "number") updateUserBalance(data.chips);
          syncBalance();
          window.setTimeout(resetToReady, 2800);
        }
      } catch {
        /* ignore poll errors */
      }
    },
    [resetToReady, stopTimers, syncBalance],
  );

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const elapsed =
      phase !== "ready" && startedAtMs != null ? Date.now() - startedAtMs : 0;
    const crashed = phase === "crashed";
    const progress = crashCurveProgress(elapsed, multiplier, crashPoint, crashed);
    drawCrashCanvas(canvas, progress, multiplier, crashed);
  }, [crashPoint, multiplier, phase, startedAtMs]);

  useEffect(() => {
    if (phase === "ready") {
      redrawCanvas();
      return;
    }
    const tick = () => {
      if (startedAtMs != null && (phase === "running" || phase === "cashed_out")) {
        const m = multiplierAtElapsedMs(Date.now() - startedAtMs);
        setMultiplier(m);
      }
      redrawCanvas();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [phase, redrawCanvas, startedAtMs]);

  useEffect(() => {
    if (phase !== "running" || !roundId) return;
    settleTimerRef.current = setInterval(() => void pollSettle(roundId), 280);
    return () => {
      if (settleTimerRef.current) clearInterval(settleTimerRef.current);
    };
  }, [phase, pollSettle, roundId]);

  const handleCashout = useCallback(async () => {
    if (phase !== "running" || !roundId || acting) return;
    const token = getAuthItem("token");
    if (!token) return;
    setActing(true);
    stopTimers();
    autoCashoutTriggeredRef.current = true;
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
      setCashedOutAt(mult);
      setCashoutProfit(profit);
      if (typeof data.crashPoint === "number") setCrashPoint(data.crashPoint);
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      syncBalance();
      setHistory(pushHistory(mult));
      window.setTimeout(() => {
        if (data.crashPoint) setPhase("crashed");
        window.setTimeout(resetToReady, 1400);
      }, 1800);
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
      setPhase("running");
      autoCashoutTriggeredRef.current = false;
    } finally {
      setActing(false);
    }
  }, [acting, addToast, bet, multiplier, phase, pollSettle, resetToReady, roundId, stopTimers, syncBalance, t]);

  useEffect(() => {
    if (phase !== "running" || acting || autoCashoutTriggeredRef.current) return;
    const ac = parseFloat(autoCashout);
    if (Number.isNaN(ac) || ac < 1.01) return;
    if (multiplier >= ac) {
      void handleCashout();
    }
  }, [autoCashout, acting, handleCashout, multiplier, phase]);

  const handlePlaceBet = () => {
    if (!canPlaceBet) return;
    const token = getAuthItem("token");
    if (!token) {
      addToast(t("crash.mustLogin"), "error");
      return;
    }
    setHasBet(true);
  };

  const handleBetChange = (value: number) => {
    setBet(clampBet(value, balance));
  };

  return (
    <CrashGameView
      phase={phase}
      multiplier={multiplier}
      bet={bet}
      autoCashout={autoCashout}
      balance={balance}
      history={history}
      cashedOutAt={cashedOutAt}
      cashoutProfit={cashoutProfit}
      acting={acting}
      insufficient={insufficient}
      canPlaceBet={canPlaceBet}
      hasBet={hasBet}
      countdown={countdown}
      canvasRef={canvasRef}
      onBack={() => navigate("/minigames/quick-solo")}
      onBetChange={handleBetChange}
      onAutoCashoutChange={setAutoCashout}
      onPlaceBet={handlePlaceBet}
      onCashout={() => void handleCashout()}
      onRelaunch={resetToReady}
    />
  );
}
