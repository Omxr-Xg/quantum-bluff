import { useCallback, useEffect, useRef, useState } from "react";
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
import { SlotGameView } from "../components/slot/SlotGameView";
import { parseApiReels, type SlotReels } from "../features/slot/slotTypes";
import { classifySlotWin } from "../features/slot/slotWinLabel";

const MAX_BET = 500;

type SlotSpinSuccessBody = {
  reels: string[];
  winAmount: number;
  chips?: number;
};

class SlotNoRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotNoRetryError";
  }
}

function parseSlotSpinSuccess(raw: unknown): SlotSpinSuccessBody | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.reels)) return null;
  const reels = o.reels.filter((x): x is string => typeof x === "string");
  if (reels.length < 4) return null;
  const winAmount = o.winAmount;
  if (typeof winAmount !== "number" || !Number.isFinite(winAmount)) return null;
  const chips = o.chips;
  if (chips !== undefined && (typeof chips !== "number" || !Number.isFinite(chips))) return null;
  return { reels, winAmount, ...(typeof chips === "number" ? { chips } : {}) };
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

const DEFAULT_RESULTS: SlotReels = ["crown", "diamond", "cherry", "bell"];

type SlotMachineProps = {
  onBack?: () => void;
};

export function SlotMachine({ onBack }: SlotMachineProps = {}) {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [balance, setBalance] = useState(getUserBalance());
  const [bet, setBet] = useState(20);
  const [spinning, setSpinning] = useState(false);
  const [results, setResults] = useState<SlotReels>(DEFAULT_RESULTS);
  const [reelsStopped, setReelsStopped] = useState(0);
  const [win, setWin] = useState<{ label: string; amount: number } | null>(null);
  const [history, setHistory] = useState<{ label: string; amount: number; positive: boolean }[]>([]);
  const [sessionTotalWon, setSessionTotalWon] = useState(0);

  const spinLockRef = useRef(false);
  const pendingSpinRef = useRef<{ reels: SlotReels; winAmount: number; chips?: number } | null>(null);

  const syncBalance = useCallback(() => setBalance(getUserBalance()), []);

  useEffect(() => {
    void fetchBalanceFromServer({ authoritative: true }).then(() => syncBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, [syncBalance]);

  const maxBet = Math.min(MAX_BET, balance);

  const winLabel = useCallback(
    (reels: SlotReels, winAmount: number) => {
      const kind = classifySlotWin(reels, winAmount);
      if (kind === "no_win") return t("slot.paytable.no_win");
      return t(`slot.paytable.${kind}`);
    },
    [t],
  );

  const handleReelStop = useCallback(() => {
    setReelsStopped((c) => c + 1);
  }, []);

  useEffect(() => {
    if (reelsStopped !== 4 || !spinning) return;
    const pending = pendingSpinRef.current;
    if (!pending) return;

    setSpinning(false);
    spinLockRef.current = false;
    pendingSpinRef.current = null;

    const { reels, winAmount, chips } = pending;
    const finalChips =
      typeof chips === "number" ? Math.max(0, Math.floor(chips)) : getUserBalance();
    updateUserBalance(finalChips);
    syncBalance();

    if (winAmount > 0) {
      const label = winLabel(reels, winAmount);
      setWin({ label, amount: winAmount });
      setSessionTotalWon((total) => total + winAmount);
      setHistory((h) => [{ label, amount: winAmount, positive: true }, ...h.slice(0, 5)]);
      if (winAmount === bet) {
        addToast(t("slot.refundLine"), "info");
      }
    } else {
      setHistory((h) => [{ label: t("slot.paytable.no_win"), amount: -bet, positive: false }, ...h.slice(0, 5)]);
    }
  }, [addToast, bet, reelsStopped, spinning, syncBalance, t, winLabel]);

  const handleSpin = async () => {
    if (spinLockRef.current || spinning || balance < bet) return;

    const token = getAuthItem("token");
    if (!token) {
      addToast(t("slot.errorMustLogin"), "error");
      return;
    }

    const balanceBefore = getUserBalance();
    updateUserBalance(balanceBefore - bet);
    syncBalance();

    spinLockRef.current = true;
    setSpinning(true);
    setWin(null);
    setReelsStopped(0);
    pendingSpinRef.current = null;

    const actionId = crypto.randomUUID();
    const roundId = actionId;
    const maxAttempts = 3;

    try {
      let successBody: SlotSpinSuccessBody | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const res = await fetch(apiUrl("/api/slot/spin"), {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ bet, actionId, roundId }),
          });
          const parsed: unknown = await res.json().catch(() => ({}));
          const parsedObj =
            parsed !== null && typeof parsed === "object"
              ? (parsed as Record<string, unknown>)
              : {};

          if (res.ok) {
            const validated = parseSlotSpinSuccess(parsed);
            if (!validated) throw new SlotNoRetryError(t("slot.errorInvalidServerResponse"));
            successBody = validated;
            break;
          }

          if (parsedObj.code === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
            throw new SlotNoRetryError(
              typeof parsedObj.error === "string" ? parsedObj.error : t("slot.errorSync"),
            );
          }

          const retriable =
            res.status >= 500 ||
            res.status === 408 ||
            (res.status === 409 && parsedObj.code === "DUPLICATE_ACTION");

          if (retriable && attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
            continue;
          }

          throw new Error(
            typeof parsedObj.error === "string" ? parsedObj.error : t("slot.errorServer"),
          );
        } catch (err: unknown) {
          if (err instanceof SlotNoRetryError) throw err;
          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
            continue;
          }
          throw err;
        }
      }

      if (!successBody) throw new Error(t("slot.errorUnreachable"));

      trackEvent("play_slots");

      const finalReels = parseApiReels(successBody.reels);
      setResults(finalReels);
      pendingSpinRef.current = {
        reels: finalReels,
        winAmount: successBody.winAmount,
        chips: successBody.chips,
      };
    } catch (err: unknown) {
      updateUserBalance(balanceBefore);
      syncBalance();
      addToast(errorMessage(err, t("slot.errorSpin")), "error");
      setSpinning(false);
      spinLockRef.current = false;
      pendingSpinRef.current = null;
    }
  };

  return (
    <SlotGameView
      balance={balance}
      bet={bet}
      maxBet={maxBet}
      spinning={spinning}
      results={results}
      reelsStopped={reelsStopped}
      win={win}
      history={history}
      sessionTotalWon={sessionTotalWon}
      onBack={onBack}
      onBetChange={setBet}
      onSpin={() => void handleSpin()}
      onReelStop={handleReelStop}
    />
  );
}
