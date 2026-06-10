import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../contexts/ToastContext";
import { getAuthItem } from "../../utils/authStorage";
import { trackEvent } from "../../utils/analytics";
import {
  updateUserBalance,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
  fetchBalanceFromServer,
} from "../../utils/userProfile";
import { isSoloActiveConflict } from "../soloGames/recoverActiveRound";
import type { CrashUiPhase } from "../../components/crash/CrashGameView";
import {
  crashCashout,
  crashStart,
  crashTick,
  fetchCrashActive,
  type CrashTickResponse,
} from "./crashApi";
import {
  CRASH_MIN_BET,
  clampBet,
  generateDemoCrashPoint,
  multiplierAtElapsedMs,
  multiplierFromStartedAt,
  serverOffsetFromSample,
} from "./crashMath";
import { crashCurveProgress, drawCrashCanvas } from "./crashCanvas";

const HISTORY_KEY = "qb-crash-history";
const TICK_MS = 300;

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

type RoundMode = "idle" | "spectator" | "player";

export function useCrashRound() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [balance, setBalance] = useState(getUserBalance());
  const [bet, setBet] = useState(100);
  const [autoCashout, setAutoCashout] = useState("2.00");
  const [phase, setPhase] = useState<CrashUiPhase>("ready");
  const [multiplier, setMultiplier] = useState(1);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [crashPoint, setCrashPoint] = useState<number | null>(null);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [cashoutProfit, setCashoutProfit] = useState<number | null>(null);
  const [history, setHistory] = useState<number[]>(() => loadHistory());
  const [acting, setActing] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [hasBet, setHasBet] = useState(false);
  const [isPlayerRound, setIsPlayerRound] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const modeRef = useRef<RoundMode>("idle");
  const startedAtMsRef = useRef<number | null>(null);
  const serverOffsetRef = useRef(0);
  const spectatorStartedAtRef = useRef<number | null>(null);
  const spectatorCrashRef = useRef<number | null>(null);
  const frozenMultRef = useRef<number | null>(null);
  const autoCashoutRef = useRef(autoCashout);
  const autoCashoutDoneRef = useRef(false);
  const handleCashoutRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    autoCashoutRef.current = autoCashout;
  }, [autoCashout]);

  const syncBalance = useCallback(() => setBalance(getUserBalance()), []);

  useEffect(() => {
    syncBalance();
    void fetchBalanceFromServer().then(() => syncBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, [syncBalance]);

  const applyServerTime = useCallback((serverNow: number) => {
    serverOffsetRef.current = serverOffsetFromSample(serverNow);
  }, []);

  const liveMultiplier = useCallback((): number => {
    if (frozenMultRef.current != null) return frozenMultRef.current;
    if (modeRef.current === "spectator") {
      const started = spectatorStartedAtRef.current;
      if (started == null) return 1;
      return multiplierAtElapsedMs(Date.now() - started);
    }
    if (modeRef.current === "player") {
      const started = startedAtMsRef.current;
      if (started == null) return 1;
      return multiplierFromStartedAt(started, serverOffsetRef.current);
    }
    return 1;
  }, []);

  const stopTickPoll = useCallback(() => {
    if (tickTimerRef.current) clearInterval(tickTimerRef.current);
    tickTimerRef.current = null;
  }, []);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const stopAll = useCallback(() => {
    stopRaf();
    stopTickPoll();
  }, [stopRaf, stopTickPoll]);

  const resetToReady = useCallback(() => {
    stopAll();
    modeRef.current = "idle";
    startedAtMsRef.current = null;
    spectatorStartedAtRef.current = null;
    spectatorCrashRef.current = null;
    frozenMultRef.current = null;
    autoCashoutDoneRef.current = false;
    serverOffsetRef.current = 0;
    setPhase("ready");
    setMultiplier(1);
    setRoundId(null);
    setCrashPoint(null);
    setCashedOutAt(null);
    setCashoutProfit(null);
    setHasBet(false);
    setIsPlayerRound(false);
    setCountdown(5);
  }, [stopAll]);

  const beginPlayerRound = useCallback(
    (id: string, startedAt: number, serverNow: number, stake: number) => {
      modeRef.current = "player";
      setIsPlayerRound(true);
      startedAtMsRef.current = startedAt;
      applyServerTime(serverNow);
      frozenMultRef.current = null;
      autoCashoutDoneRef.current = false;
      setRoundId(id);
      setBet(stake);
      setCrashPoint(null);
      setCashedOutAt(null);
      setCashoutProfit(null);
      setHasBet(false);
      setMultiplier(1);
      setPhase("running");
    },
    [applyServerTime],
  );

  const resumeActive = useCallback(async (): Promise<boolean> => {
    const active = await fetchCrashActive();
    if (!active.active) return false;
    beginPlayerRound(active.roundId, active.startedAt, active.serverNow, active.bet);
    setMultiplier(active.multiplier);
    return true;
  }, [beginPlayerRound]);

  useEffect(() => {
    void resumeActive();
  }, [resumeActive]);

  const handleTerminalTick = useCallback(
    (data: CrashTickResponse) => {
      if (data.status === "cashed_out") {
        stopTickPoll();
        autoCashoutDoneRef.current = true;
        frozenMultRef.current = data.multiplier;
        setPhase("cashed_out");
        setMultiplier(data.multiplier);
        setCashedOutAt(data.multiplier);
        setCashoutProfit(data.profit);
        setCrashPoint(data.crashPoint);
        if (typeof data.chips === "number") updateUserBalance(data.chips);
        syncBalance();
        setHistory(pushHistory(data.multiplier));
        window.setTimeout(() => {
          setCrashPoint(data.crashPoint);
          setMultiplier(data.crashPoint);
          frozenMultRef.current = data.crashPoint;
          setPhase("crashed");
          window.setTimeout(resetToReady, 1400);
        }, 1800);
        return;
      }
      if (data.status === "crashed") {
        stopAll();
        autoCashoutDoneRef.current = true;
        frozenMultRef.current = data.crashPoint;
        setPhase("crashed");
        setCrashPoint(data.crashPoint);
        setMultiplier(data.crashPoint);
        setHistory(pushHistory(data.crashPoint));
        if (typeof data.chips === "number") updateUserBalance(data.chips);
        syncBalance();
        window.setTimeout(resetToReady, 2800);
      }
    },
    [resetToReady, stopAll, stopTickPoll, syncBalance],
  );

  const pollTick = useCallback(
    async (id: string) => {
      if (!getAuthItem("token")) return;
      try {
        const data = await crashTick(id);
        applyServerTime(data.serverNow);
        if (data.status === "running") {
          applyServerTime(data.serverNow);
          return;
        }
        handleTerminalTick(data);
      } catch {
        /* retry au prochain tick */
      }
    },
    [applyServerTime, handleTerminalTick],
  );

  const startSpectatorRound = useCallback(() => {
    stopAll();
    modeRef.current = "spectator";
    setIsPlayerRound(false);
    startedAtMsRef.current = null;
    frozenMultRef.current = null;
    autoCashoutDoneRef.current = false;
    spectatorCrashRef.current = generateDemoCrashPoint();
    spectatorStartedAtRef.current = Date.now();
    setRoundId(null);
    setCrashPoint(spectatorCrashRef.current);
    setCashedOutAt(null);
    setCashoutProfit(null);
    setMultiplier(1);
    setPhase("running");
  }, [stopAll]);

  const executeStart = useCallback(
    async (allowRetry = true) => {
      if (!getAuthItem("token")) {
        addToast(t("crash.mustLogin"), "error");
        setHasBet(false);
        return;
      }
      setActing(true);
      try {
        const actionId = crypto.randomUUID();
        const data = await crashStart(bet, actionId);
        if (typeof data.chips === "number") updateUserBalance(data.chips);
        syncBalance();
        trackEvent("play_crash");
        beginPlayerRound(data.roundId, data.startedAt, data.serverNow, data.bet);
      } catch (e) {
        const code = (e as Error & { code?: string }).code;
        if (isSoloActiveConflict(code)) {
          if (await resumeActive()) {
            addToast(t("minigames.sessionResumed"), "info");
            setHasBet(false);
            return;
          }
          if (allowRetry) return executeStart(false);
        }
        addToast(e instanceof Error ? e.message : t("common.error"), "error");
        setHasBet(false);
        setCountdown(5);
      } finally {
        setActing(false);
      }
    },
    [addToast, beginPlayerRound, bet, resumeActive, syncBalance, t],
  );

  useEffect(() => {
    if (phase !== "ready") return;
    if (countdown <= 0) {
      if (hasBet) {
        if (!acting) void executeStart();
        return;
      }
      startSpectatorRound();
      return;
    }
    const timer = window.setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [acting, countdown, executeStart, hasBet, phase, startSpectatorRound]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const started =
      modeRef.current === "spectator"
        ? spectatorStartedAtRef.current
        : startedAtMsRef.current;
    const elapsed = started != null ? Date.now() - started : 0;
    const crashed = phase === "crashed";
    const drawMult =
      phase === "crashed"
        ? (crashPoint ?? multiplier)
        : phase === "cashed_out" && cashedOutAt != null
          ? cashedOutAt
          : multiplier;
    const progress = crashCurveProgress(elapsed, drawMult, crashPoint, crashed);
    drawCrashCanvas(canvas, progress, drawMult, crashed);
  }, [cashedOutAt, crashPoint, multiplier, phase]);

  useEffect(() => {
    if (phase === "ready") {
      redrawCanvas();
      return;
    }
    const frame = () => {
      if (phase === "running" && frozenMultRef.current == null) {
        const m = liveMultiplier();
        setMultiplier(m);

        if (
          modeRef.current === "player" &&
          !autoCashoutDoneRef.current &&
          !acting
        ) {
          const ac = parseFloat(autoCashoutRef.current);
          if (!Number.isNaN(ac) && ac >= 1.01 && m >= ac) {
            autoCashoutDoneRef.current = true;
            void handleCashoutRef.current?.();
          }
        }

        if (
          modeRef.current === "spectator" &&
          spectatorCrashRef.current != null &&
          m >= spectatorCrashRef.current
        ) {
          stopAll();
          frozenMultRef.current = spectatorCrashRef.current;
          setPhase("crashed");
          setMultiplier(spectatorCrashRef.current);
          setHistory(pushHistory(spectatorCrashRef.current));
          window.setTimeout(resetToReady, 2800);
          return;
        }
      }
      redrawCanvas();
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [acting, liveMultiplier, phase, redrawCanvas, resetToReady, stopAll]);

  useEffect(() => {
    if (phase !== "running" || modeRef.current !== "player" || !roundId) return;
    void pollTick(roundId);
    tickTimerRef.current = setInterval(() => void pollTick(roundId), TICK_MS);
    return () => stopTickPoll();
  }, [phase, pollTick, roundId, stopTickPoll]);

  const handleCashout = useCallback(async () => {
    if (phase !== "running" || modeRef.current !== "player" || !roundId || acting) return;
    if (!getAuthItem("token")) return;

    autoCashoutDoneRef.current = true;
    setActing(true);
    const displayMult = liveMultiplier();
    frozenMultRef.current = displayMult;
    setMultiplier(displayMult);
    stopTickPoll();

    try {
      const data = await crashCashout(roundId);
      applyServerTime(data.serverNow);
      frozenMultRef.current = data.multiplier;
      setPhase("cashed_out");
      setMultiplier(data.multiplier);
      setCashedOutAt(data.multiplier);
      setCashoutProfit(data.profit);
      setCrashPoint(data.crashPoint);
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      syncBalance();
      setHistory(pushHistory(data.multiplier));
      window.setTimeout(() => {
        setCrashPoint(data.crashPoint);
        setMultiplier(data.crashPoint);
        frozenMultRef.current = data.crashPoint;
        setPhase("crashed");
        window.setTimeout(resetToReady, 1400);
      }, 1800);
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (
        code === "ALREADY_CRASHED" ||
        code === "ROUND_NOT_RUNNING" ||
        code === "ROUND_NOT_FOUND"
      ) {
        void pollTick(roundId);
        return;
      }
      frozenMultRef.current = null;
      autoCashoutDoneRef.current = false;
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
      void pollTick(roundId);
    } finally {
      setActing(false);
    }
  }, [acting, addToast, applyServerTime, liveMultiplier, phase, pollTick, resetToReady, roundId, stopTickPoll, syncBalance, t]);

  handleCashoutRef.current = () => handleCashout();

  const canPlaceBet =
    phase === "ready" && !hasBet && balance >= bet && bet >= CRASH_MIN_BET && !acting;

  return {
    balance,
    bet,
    autoCashout,
    phase,
    multiplier,
    crashPoint,
    cashedOutAt,
    cashoutProfit,
    history,
    acting,
    countdown,
    hasBet,
    isPlayerRound,
    canPlaceBet,
    insufficient: balance < bet,
    canvasRef,
    setAutoCashout,
    setBet: (value: number) => setBet(clampBet(value, balance)),
    placeBet: () => {
      if (!canPlaceBet) return;
      if (!getAuthItem("token")) {
        addToast(t("crash.mustLogin"), "error");
        return;
      }
      setHasBet(true);
    },
    cashout: handleCashout,
    relaunch: resetToReady,
  };
}
