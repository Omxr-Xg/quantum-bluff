import { useCallback, useEffect, useState } from "react";
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
import { clampBet, LUCKY_NUMBER_MIN_BET } from "../features/luckyNumber/luckyNumberMath";
import { runLuckyNumberHouseDrawAnimation } from "../features/luckyNumber/luckyNumberDrawAnimation";
import {
  LuckyNumberGameView,
  type LuckyHistoryRow,
  type LuckyNumberUiPhase,
} from "../components/luckyNumber/LuckyNumberGameView";
import { SOLO_GAMES_BACK_PATH } from "../utils/soloGameNav";
import { isSoloActiveConflict } from "../features/soloGames/recoverActiveRound";

const HISTORY_KEY = "qb-lucky-number-history";

type HistoryEntry = { drawnNumber: number; selectedNumber: number; win: boolean; profit: number };

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

function toHistoryRows(entries: HistoryEntry[]): LuckyHistoryRow[] {
  return entries.map((e, i) => ({
    id: `${e.selectedNumber}-${e.drawnNumber}-${i}`,
    playerNumber: e.selectedNumber,
    houseNumber: e.drawnNumber,
    profit: e.profit,
    win: e.win,
  }));
}

export function LuckyNumber() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [balance, setBalance] = useState(getUserBalance());
  const [bet, setBet] = useState(100);
  const [selectedNumber, setSelectedNumber] = useState(7);
  const [houseDisplay, setHouseDisplay] = useState<number | null>(null);
  const [phase, setPhase] = useState<LuckyNumberUiPhase>("ready");
  const [lastResult, setLastResult] = useState<{
    drawnNumber: number;
    win: boolean;
    profit: number;
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());
  const [acting, setActing] = useState(false);

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

  const resetToReady = () => {
    setPhase("ready");
    setHouseDisplay(null);
    setLastResult(null);
  };

  const handlePlay = async (allowRetry = true) => {
    if (!canPlay) return;
    const token = getAuthItem("token");
    if (!token) {
      addToast(t("luckyNumber.mustLogin"), "error");
      return;
    }

    setActing(true);
    setLastResult(null);
    setHouseDisplay(null);
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
      const profit = data.profit ?? (data.gain ?? 0) - bet;

      await runLuckyNumberHouseDrawAnimation(drawnNumber, setHouseDisplay);

      if (typeof data.chips === "number") updateUserBalance(data.chips);
      syncBalance();

      setLastResult({ drawnNumber, win, profit });
      setHistory(
        pushHistory({ drawnNumber, selectedNumber, win, profit }),
      );
      setPhase("result");
    } catch (e) {
      setPhase("ready");
      setHouseDisplay(null);
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setActing(false);
    }
  };

  return (
    <LuckyNumberGameView
      phase={phase}
      balance={balance}
      bet={bet}
      selectedNumber={selectedNumber}
      houseDisplay={houseDisplay}
      lastResult={lastResult}
      history={toHistoryRows(history)}
      acting={acting}
      insufficient={insufficient}
      canPlay={canPlay}
      onBack={() => navigate(SOLO_GAMES_BACK_PATH)}
      onBetChange={(v) => setBet(clampBet(v, balance))}
      onSelectNumber={setSelectedNumber}
      onPlay={() => void handlePlay()}
      onReplay={resetToReady}
    />
  );
}
