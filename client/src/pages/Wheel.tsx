import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/ToastContext";
import { getAuthItem } from "../utils/authStorage";
import { apiUrl } from "../utils/apiBase";
import {
  updateUserBalance,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
  fetchBalanceFromServer,
} from "../utils/userProfile";
import { clampBet, WHEEL_MIN_BET } from "../features/wheel/wheelMath";
import { renderWheelFrame, resizeWheelCanvas } from "../features/wheel/wheelCanvas";
import { runWheelSpinAnimation } from "../features/wheel/wheelSpinAnimation";
import { getWheelSegmentVisual } from "../features/wheel/wheelVisuals";
import { WHEEL_SEGMENTS } from "../features/wheel/wheelMath";
import { WheelGameView, wheelHistoryVisual, type WheelUiPhase } from "../components/wheel/WheelGameView";
import { SOLO_GAMES_BACK_PATH } from "../utils/soloGameNav";
import { isSoloActiveConflict } from "../features/soloGames/recoverActiveRound";

const HISTORY_KEY = "qb-wheel-history";

type HistoryEntry = { label: string; multiplier: number; profit: number };

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed)
      ? parsed.filter((e): e is HistoryEntry => typeof e === "object" && e != null && "multiplier" in e).slice(0, 20)
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
  const [phase, setPhase] = useState<WheelUiPhase>("ready");
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{
    label: string;
    gain: number;
    profit: number;
    glow: string;
    text: string;
  } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [acting, setActing] = useState(false);
  const [dims, setDims] = useState({ w: 520, h: 520 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const spinAnimRef = useRef<ReturnType<typeof runWheelSpinAnimation> | null>(null);

  const syncBalance = useCallback(() => setBalance(getUserBalance()), []);

  useEffect(() => {
    void fetchBalanceFromServer({ authoritative: true }).then(() => syncBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, [syncBalance]);

  const resize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const size = Math.min(el.clientWidth, el.clientHeight, 520);
    setDims({ w: size, h: size });
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeWheelCanvas(canvas, dims);
    renderWheelFrame(canvas, dims, rotationRef.current, 0);
  }, [dims]);

  useEffect(() => {
    return () => spinAnimRef.current?.cancel();
  }, []);

  const maxBet = Math.min(500, balance);
  const canSpin = phase === "ready" && balance >= bet && bet >= WHEEL_MIN_BET && !acting && !spinning;
  const insufficient = balance < bet;

  const historyRows = history.map((h) => {
    const visual = wheelHistoryVisual(h.label, h.multiplier);
    return {
      label: visual.label,
      amount: h.profit,
      glow: visual.glow,
      positive: h.profit > 0,
    };
  });

  const handleSpin = async (allowRetry = true) => {
    if (!canSpin) return;
    const token = getAuthItem("token");
    if (!token) {
      addToast(t("wheel.mustLogin"), "error");
      return;
    }

    setActing(true);
    setSpinning(true);
    setShowResult(false);
    setResult(null);
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
        segmentIndex?: number;
        chips?: number;
      };

      if (!res.ok) {
        if (allowRetry && isSoloActiveConflict(data.code)) {
          setPhase("ready");
          setSpinning(false);
          await new Promise((r) => window.setTimeout(r, 400));
          return handleSpin(false);
        }
        throw new Error(data.error ?? data.code ?? t("common.error"));
      }

      const label = data.result ?? "x1";
      const multiplier = data.multiplier ?? 1;
      const gain = data.gain ?? 0;
      const profit = data.profit ?? gain - bet;
      const segmentIndex = typeof data.segmentIndex === "number" ? data.segmentIndex : 0;
      const seg = WHEEL_SEGMENTS[segmentIndex] ?? WHEEL_SEGMENTS[0]!;
      const visual = getWheelSegmentVisual(seg);

      if (typeof data.chips === "number") updateUserBalance(data.chips);

      spinAnimRef.current?.cancel();
      spinAnimRef.current = runWheelSpinAnimation({
        startRotationRad: rotationRef.current,
        targetSegmentIndex: segmentIndex,
        onFrame: (rot, deflect) => {
          rotationRef.current = rot;
          const canvas = canvasRef.current;
          if (canvas) renderWheelFrame(canvas, dims, rot, deflect);
        },
        onComplete: (finalRot) => {
          rotationRef.current = finalRot;
          const canvas = canvasRef.current;
          if (canvas) renderWheelFrame(canvas, dims, finalRot, 0);

          syncBalance();
          const displayLabel = visual.label;
          setResult({ label: displayLabel, gain, profit, glow: visual.glow, text: visual.text });
          setShowResult(true);
          setHistory(pushHistory({ label: displayLabel, multiplier, profit }));
          setPhase("result");
          setSpinning(false);
          setActing(false);
        },
      });
    } catch (e) {
      setPhase("ready");
      setSpinning(false);
      setActing(false);
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    }
  };

  const resetToReady = () => {
    setPhase("ready");
    setShowResult(false);
    setResult(null);
  };

  return (
    <WheelGameView
      phase={phase}
      balance={balance}
      bet={bet}
      maxBet={maxBet}
      spinning={spinning}
      insufficient={insufficient}
      canSpin={canSpin}
      result={result}
      showResult={showResult}
      history={historyRows}
      canvasRef={canvasRef}
      containerRef={containerRef}
      onBack={() => navigate(SOLO_GAMES_BACK_PATH)}
      onBetChange={(v) => setBet(clampBet(v, balance))}
      onSpin={() => void handleSpin()}
      onRelaunch={resetToReady}
    />
  );
}
