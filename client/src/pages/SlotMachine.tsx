import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Coins, Gem, History, TrendingUp, Trophy, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/ToastContext";
import {
  updateUserBalance,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
  fetchBalanceFromServer,
} from "../utils/userProfile";
import { trackEvent } from "../utils/analytics";
import { apiUrl } from "../utils/apiBase";
import { ChipIcon } from "../components/ChipIcon";
import { CustomScrollArea } from "../components/CustomScrollArea";
import { getAuthItem } from "../utils/authStorage";
import slotSevenLucky from "../assets/slot-seven-lucky.webp";
import slotLemon from "../assets/slot-lemon.webp";
import slotCherries from "../assets/slot-cherries.webp";

type SlotSymbol = "cherry" | "lemon" | "diamond" | "seven" | "bell";

const SLOT_SYM_IMG_REEL_CLS =
  "relative z-10 h-[3rem] w-auto max-w-[4rem] object-contain [filter:sepia(0.35)_saturate(1.15)_drop-shadow(0_3px_10px_rgba(0,0,0,0.55))] sm:h-[3.5rem] sm:max-w-[4.5rem] md:h-[4rem] md:max-w-[5rem]";
const SLOT_SYM_IMG_PAYTABLE_CLS =
  "h-9 w-auto max-w-[3rem] object-contain [filter:sepia(0.3)_saturate(1.1)_drop-shadow(0_2px_6px_rgba(0,0,0,0.4))] sm:h-10 sm:max-w-[3.5rem]";
const SLOT_SYM_ICON_REEL_CLS =
  "relative z-10 h-[3rem] w-[3rem] shrink-0 text-amber-300 [filter:drop-shadow(0_2px_8px_rgba(217,119,6,0.35))] sm:h-[3.5rem] sm:w-[3.5rem] md:h-[4rem] md:w-[4rem]";
const SLOT_SYM_ICON_PAYTABLE_CLS =
  "h-9 w-9 shrink-0 text-amber-200/90 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.35))] sm:h-10 sm:w-10";

function SlotSymbolDisplay({
  symbol,
  variant = "reel",
}: {
  symbol: SlotSymbol;
  variant?: "reel" | "paytable";
}) {
  const imgCls = variant === "reel" ? SLOT_SYM_IMG_REEL_CLS : SLOT_SYM_IMG_PAYTABLE_CLS;
  const iconCls = variant === "reel" ? SLOT_SYM_ICON_REEL_CLS : SLOT_SYM_ICON_PAYTABLE_CLS;

  if (symbol === "seven") {
    return (
      <img src={slotSevenLucky} alt="" className={imgCls} draggable={false} aria-hidden />
    );
  }
  if (symbol === "lemon") {
    return <img src={slotLemon} alt="" className={imgCls} draggable={false} aria-hidden />;
  }
  if (symbol === "cherry") {
    return <img src={slotCherries} alt="" className={imgCls} draggable={false} aria-hidden />;
  }
  if (symbol === "diamond") {
    return <Gem className={iconCls} aria-hidden strokeWidth={1.25} />;
  }
  if (symbol === "bell") {
    return <Bell className={iconCls} aria-hidden strokeWidth={1.25} />;
  }
  return null;
}

const API_TO_UI: Record<string, SlotSymbol> = {
  cherry: "cherry",
  lemon: "lemon",
  diamond: "diamond",
  seven: "seven",
  bell: "bell",
};

interface SlotResult {
  symbols: SlotSymbol[];
  isWin: boolean;
  winAmount?: number;
}

type BalanceHistoryEntry = {
  id: string;
  createdAt: string;
  reason: string;
  gameType: string | null;
  amount: number;
  balanceBefore: number | null;
  balanceAfter: number | null;
  roundId: string | null;
};

const SYMBOLS: SlotSymbol[] = ["cherry", "lemon", "diamond", "seven", "bell"];
const MULTIPLIERS: Record<SlotSymbol, number> = {
  cherry: 2,
  lemon: 3,
  diamond: 5,
  seven: 10,
  bell: 50,
};

const REEL_SYMBOLS_COUNT = 20;

/** Corps JSON attendu pour `POST /api/slot/spin` en succès. */
type SlotSpinSuccessBody = {
  reels: string[];
  winAmount: number;
  chips?: number;
};

function parseSlotSpinSuccess(raw: unknown): SlotSpinSuccessBody | null {
  if (raw === null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.reels)) return null;
  const reels = o.reels.filter((x): x is string => typeof x === "string");
  if (reels.length < 3) return null;
  const winAmount = o.winAmount;
  if (typeof winAmount !== "number" || !Number.isFinite(winAmount)) return null;
  const chips = o.chips;
  if (chips !== undefined && (typeof chips !== "number" || !Number.isFinite(chips))) {
    return null;
  }
  return { reels, winAmount, ...(typeof chips === "number" ? { chips } : {}) };
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}

/** Erreurs sans nouvelle tentative (idempotence, réponse invalide). */
class SlotNoRetryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SlotNoRetryError";
  }
}

export function SlotMachine() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState(10);
  const [balance, setBalance] = useState<number>(getUserBalance());

  useEffect(() => {
    const syncBalance = () => setBalance(getUserBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, []);
  const [sessionStats, setSessionStats] = useState({ wins: 0, spins: 0 });

  const [reels, setReels] = useState<SlotSymbol[][]>([
    generateReelSymbols(),
    generateReelSymbols(),
    generateReelSymbols(),
  ]);
  const [result, setResult] = useState<SlotResult>({
    symbols: ["diamond", "diamond", "diamond"],
    isWin: false,
    winAmount: 0,
  });
  const [showWin, setShowWin] = useState(false);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<BalanceHistoryEntry[]>([]);
  const [spinKey, setSpinKey] = useState(0);
  const spinLockRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
    };
  }, []);

  const isRefund = result.isWin && result.winAmount === bet;
  const isBigWin = result.isWin && result.winAmount! > bet;

  const MAX_BET = 500;
  const maxBet = Math.min(MAX_BET, balance);

  const loadBalance = useCallback(async () => {
    const token = getAuthItem("token");
    if (!token) return;
    try {
      const chips = await fetchBalanceFromServer({ authoritative: true });
      setBalance(chips);
    } catch {
      addToast(t("slot.errorLoadBalance"), "error");
    }
  }, [addToast, t]);

  const loadBalanceHistory = useCallback(async () => {
    const token = getAuthItem("token");
    if (!token) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/balance-history?limit=50"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = (await res.json().catch(() => ({}))) as {
        error?: string;
        entries?: BalanceHistoryEntry[];
      };
      if (!res.ok) {
        throw new Error(parsed?.error || "Impossible de charger l'historique du solde.");
      }
      setHistoryEntries(Array.isArray(parsed.entries) ? parsed.entries : []);
    } catch (err) {
      setHistoryError(errorMessage(err, "Impossible de charger l'historique du solde."));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  function generateReelSymbols(targetSymbol?: SlotSymbol): SlotSymbol[] {
    const arr = Array(REEL_SYMBOLS_COUNT)
      .fill(0)
      .map(() => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    if (targetSymbol) {
      arr[Math.floor(REEL_SYMBOLS_COUNT / 2)] = targetSymbol;
    }
    return arr;
  }

  const handleSpin = async () => {
    if (spinLockRef.current) return;
    const currentBalance = getUserBalance();
    if (isSpinning || currentBalance < bet) return;

    const token = getAuthItem("token");
    if (!token) {
      addToast(t("slot.errorMustLogin"), "error");
      return;
    }

    // Déduction visuelle immédiate
    const newBalanceAfterBet = currentBalance - bet;
    updateUserBalance(newBalanceAfterBet);

    // Lancement des animations (Code d'Azra)
    spinLockRef.current = true;
    setIsSpinning(true);
    setShowWin(false);
    setSpinningReels([true, true, true]);
    setReels([generateReelSymbols(), generateReelSymbols(), generateReelSymbols()]);
    setSpinKey((prev) => prev + 1);

    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    // Sécurité et tentatives du backend (Code Serveur)
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
            if (!validated) {
              throw new SlotNoRetryError(t("slot.errorInvalidServerResponse"));
            }
            successBody = validated;
            break;
          }

          if (parsedObj.code === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
            throw new SlotNoRetryError(
              typeof parsedObj.error === "string" ? parsedObj.error : t("slot.errorSync")
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
            typeof parsedObj.error === "string" ? parsedObj.error : t("slot.errorServer")
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

      if (!successBody) {
        throw new Error(t("slot.errorUnreachable"));
      }

      trackEvent("play_slots");

      const data = successBody;

      // Application des résultats sur l'UI (Code d'Azra)
      const finalApiSymbols = data.reels;
      const finalUiSymbols = finalApiSymbols.map((sym) => API_TO_UI[sym] ?? "cherry") as SlotSymbol[];
      const isWin = data.winAmount > 0;

      setReels([
        generateReelSymbols(finalUiSymbols[0]),
        generateReelSymbols(finalUiSymbols[1]),
        generateReelSymbols(finalUiSymbols[2]),
      ]);

      const t1 = setTimeout(() => setSpinningReels([false, true, true]), 500);
      const t2 = setTimeout(() => setSpinningReels([false, false, true]), 1000);
      const t3 = setTimeout(() => {
        setSpinningReels([false, false, false]);
        
        setResult({
          symbols: finalUiSymbols,
          isWin: isWin,
          winAmount: data.winAmount,
        });
      }, 1500);

      const t4 = setTimeout(() => {
        const finalChips =
          typeof data.chips === "number"
            ? Math.max(0, Math.floor(data.chips))
            : getUserBalance() + data.winAmount;

        updateUserBalance(finalChips);

        setSessionStats(prev => ({ 
          wins: prev.wins + (isWin && data.winAmount > bet ? 1 : 0), 
          spins: prev.spins + 1 
        }));

        if (isWin && data.winAmount > bet) {
          setShowWin(true);
          setTimeout(() => setShowWin(false), 3000);
        }
        if (isWin && data.winAmount === bet) {
          addToast(t("slot.refundLine"), "info");
        }
        setIsSpinning(false);
        spinLockRef.current = false;
      }, 2000); // Attend que l'animation de freinage de 0.5s se termine
      timeoutsRef.current = [t1, t2, t3, t4];

    } catch (err: unknown) {
      // Si tout échoue, on rembourse la mise visuellement
      updateUserBalance(currentBalance);
      addToast(errorMessage(err, t("slot.errorSpin")), "error");
      setSpinningReels([false, false, false]);
      
      const tErr = setTimeout(() => {
        setIsSpinning(false);
        spinLockRef.current = false;
      }, 500);
      timeoutsRef.current = [tErr];
    }
  };

  const reasonLabel = (reason: string): string => {
    const labels: Record<string, string> = {
      SLOT_STAKE: "Mise slot",
      SLOT_PAYOUT: "Gain slot",
      ROULETTE_STAKE: "Mise roulette",
      ROULETTE_PAYOUT: "Gain roulette",
      BLACKJACK_STAKE: "Mise blackjack",
      BLACKJACK_PAYOUT: "Gain blackjack",
      HIDDEN_BET_STAKE: "Mise pari caché",
      HIDDEN_BET_PAYOUT: "Gain pari caché",
      HIDDEN_BET_REFUND_VOID: "Remboursement pari annulé",
      HIDDEN_BET_REFUND_CANCEL: "Remboursement pari annulé",
      LOAN_FUNDED_IN: "Prêt reçu",
      LOAN_FUNDED_OUT: "Prêt envoyé",
      LOAN_REPAYMENT_IN: "Remboursement reçu",
      LOAN_REPAYMENT_OUT: "Remboursement envoyé",
      DEV_TOPUP: "Ajout de solde",
    };
    return labels[reason] || reason;
  };

  const slotStatus =
    !isSpinning && isBigWin
      ? t("slot.winLine")
      : !isSpinning && isRefund
        ? t("slot.refundLine")
        : null;

  return (
    <div className="relative z-10 flex w-full min-w-0 max-w-full flex-col items-stretch gap-5 text-amber-50 lg:flex-row lg:items-start lg:gap-7 xl:gap-8">
      <div className="relative min-w-0 w-full flex-1">
        <div className="relative overflow-hidden rounded-sm border-4 border-amber-800/55 bg-[linear-gradient(165deg,#1c120e_0%,#140a08_42%,#0c0604_100%)] p-4 shadow-[inset_0_2px_0_rgba(251,191,36,0.12),inset_0_-8px_24px_rgba(0,0,0,0.45),0_28px_64px_rgba(0,0,0,0.5)] sm:p-6 lg:p-8">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            aria-hidden
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1px, transparent 1px, transparent 3px)",
            }}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(135deg,rgba(154,52,18,0.18)_25%,transparent_25%,transparent_50%,rgba(154,52,18,0.18)_50%,rgba(154,52,18,0.18)_75%,transparent_75%)",
              backgroundSize: "16px 16px",
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-3 rounded-sm border border-dashed border-amber-700/20" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          <div className="relative z-10 mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-[minmax(12rem,18rem)_minmax(8rem,1fr)_minmax(16rem,20rem)] sm:items-center">
            <button
              type="button"
              onClick={() => {
                setHistoryOpen(true);
                void loadBalanceHistory();
              }}
              className="group flex w-full items-center justify-between gap-4 rounded-sm border-2 border-amber-800/40 bg-[#1a100c]/85 px-4 py-3 text-left shadow-[inset_0_1px_0_rgba(251,191,36,0.1)] transition hover:border-amber-600/55 hover:bg-[#241610] sm:px-5"
            >
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700/90">{t("slot.balance")}</p>
                <p className="flex items-center gap-2 font-serif text-2xl font-black tabular-nums text-amber-200 sm:text-3xl">
                  <span>{balance.toLocaleString()}</span>
                  <ChipIcon size="lg" className="brightness-110" />
                </p>
              </div>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-amber-700/40 bg-amber-950/50 text-amber-200 transition group-hover:border-amber-500/50 group-hover:bg-amber-900/40">
                <History className="h-4 w-4" aria-hidden />
              </span>
            </button>

            <div className="flex min-h-10 items-center justify-center">
              {slotStatus ? (
                <motion.div
                  className={`rounded-sm border-2 px-4 py-2 text-center font-serif text-sm font-black uppercase tracking-wider ${
                    isBigWin
                      ? "border-amber-500/45 bg-amber-950/70 text-amber-100 shadow-[0_0_20px_rgba(217,119,6,0.2)]"
                      : "border-stone-600/40 bg-stone-950/60 text-stone-300"
                  }`}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {slotStatus}
                </motion.div>
              ) : (
                <span
                  className="hidden h-px w-full max-w-[8rem] bg-gradient-to-r from-transparent via-amber-200/18 to-transparent sm:block"
                  aria-hidden
                />
              )}
            </div>

            <div className="flex w-full flex-col items-center rounded-sm border-2 border-amber-800/40 bg-[#1a100c]/85 px-4 py-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.08)] sm:px-5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-700/90">{t("slot.selectBet")}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setBet(Math.max(10, bet - 25))}
                  disabled={isSpinning}
                  className="flex h-9 w-9 items-center justify-center rounded-sm border-2 border-amber-800/35 bg-stone-950/80 text-sm font-bold text-amber-100 transition hover:border-amber-600/50 hover:bg-amber-950/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <p className="flex min-w-[88px] items-center justify-center gap-1.5 rounded-sm border-2 border-amber-600/35 bg-amber-950/50 px-3 py-1.5 text-center font-serif text-2xl font-black tabular-nums text-amber-200">
                  <span>{bet}</span>
                  <ChipIcon size="md" className="brightness-110" />
                </p>
                <button
                  type="button"
                  onClick={() => setBet(Math.min(maxBet, bet + 25))}
                  disabled={isSpinning || bet >= maxBet}
                  className="flex h-9 w-9 items-center justify-center rounded-sm border-2 border-amber-800/35 bg-stone-950/80 text-sm font-bold text-amber-100 transition hover:border-amber-600/50 hover:bg-amber-950/60 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:flex-nowrap">
                {[10, 50, 100, 250, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBet(Math.min(maxBet, Math.min(balance, preset)))}
                    disabled={isSpinning || balance < preset}
                    className="min-w-[3rem] flex-1 rounded-sm border border-amber-800/35 bg-stone-950/70 px-2 py-1.5 text-xs font-bold text-amber-100/90 transition hover:border-amber-600/45 hover:bg-amber-950/55 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {preset === 500 ? t("minigames.betPresetMax") : preset}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-center text-xs text-amber-800/80">
                {t("minigames.maxBetNote", { amount: 500 })}{" "}
                <ChipIcon size="sm" className="inline" />
              </p>
            </div>
          </div>

          <div className="relative z-10 mb-4 mt-16 sm:mb-8 sm:mt-20 lg:mt-24">
            <div
              className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-sm border-2 border-amber-500/50 bg-gradient-to-b from-red-950 via-[#1a100c] to-red-950 px-5 py-2 shadow-[0_0_24px_rgba(217,119,6,0.25),inset_0_1px_0_rgba(251,191,36,0.2)] sm:px-8"
              aria-hidden
            >
              <p
                className="whitespace-nowrap bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-center font-serif text-sm font-black uppercase tracking-[0.28em] text-transparent sm:text-base"
              >
                ★ {t("slot.brandTitle")} ★
              </p>
            </div>

            <div className="relative overflow-hidden rounded-sm border-4 border-amber-700/45 bg-[linear-gradient(180deg,#2a1810_0%,#1a100c_50%,#0f0a08_100%)] p-3 shadow-[inset_0_4px_12px_rgba(0,0,0,0.5),0_16px_40px_rgba(0,0,0,0.4)] sm:p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-x-6 top-3 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent" />
              <div className="pointer-events-none absolute inset-x-6 bottom-3 h-px bg-gradient-to-r from-transparent via-amber-800/40 to-transparent" />
              <div className="pointer-events-none absolute bottom-8 left-2 top-8 w-1.5 bg-gradient-to-b from-amber-900/20 via-amber-600/30 to-amber-900/20" />
              <div className="pointer-events-none absolute bottom-8 right-2 top-8 w-1.5 bg-gradient-to-b from-amber-900/20 via-amber-600/30 to-amber-900/20" />
              <div
                className={`pointer-events-none absolute left-2 right-2 top-1/2 z-20 flex h-16 -translate-y-1/2 items-center justify-center transition-all duration-500 sm:left-8 sm:right-8 sm:h-20 ${
                  isBigWin && !isSpinning
                    ? "border-y-4 border-amber-500/50 bg-gradient-to-r from-transparent via-amber-600/15 to-transparent shadow-[0_0_24px_rgba(217,119,6,0.25)]"
                    : isRefund && !isSpinning
                    ? "border-y-2 border-stone-600/50 bg-gradient-to-r from-transparent via-stone-700/12 to-transparent"
                    : "border-y-2 border-amber-800/30 bg-gradient-to-r from-transparent via-amber-900/10 to-transparent"
                }`}
              >
              </div>

              <div className="-mx-1 flex min-w-0 justify-center gap-2 overflow-x-auto overflow-y-visible px-1 pb-1 sm:mx-0 sm:gap-4 sm:overflow-visible sm:px-0">
                {reels.map((reel, reelIndex) => {
                  const isReelSpinning = spinningReels[reelIndex];
                  const centerIndex = Math.floor(REEL_SYMBOLS_COUNT / 2);

                  return (
                    <div
                      key={reelIndex}
                      className="min-w-[100px] max-w-[200px] shrink-0 flex-1 basis-0 sm:min-w-0 sm:shrink"
                    >
                      <div className="relative h-[255px] overflow-hidden rounded-sm border-[3px] border-amber-700/50 bg-[linear-gradient(180deg,#3d2818_0%,#1f140c_42%,#120a06_100%)] shadow-[inset_0_6px_16px_rgba(0,0,0,0.55),inset_0_-4px_12px_rgba(251,191,36,0.06),0_8px_20px_rgba(0,0,0,0.35)]">
                        <div className="pointer-events-none absolute inset-x-1 top-1 z-10 h-8 bg-gradient-to-b from-amber-200/12 to-transparent" />
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-20 bg-gradient-to-b from-[#0a0604] via-[#0a0604]/92 to-transparent" />
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-20 bg-gradient-to-t from-[#0a0604] via-[#0a0604]/92 to-transparent" />
                        <div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-0.5 bg-gradient-to-b from-transparent via-amber-600/35 to-transparent" />
                        <div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-0.5 bg-gradient-to-b from-transparent via-amber-600/35 to-transparent" />

                        <motion.div
                          key={`reel-${reelIndex}-spin-${spinKey}`}
                          className="flex flex-col items-center"
                          animate={
                            isReelSpinning
                              ? { y: [0, -110 * REEL_SYMBOLS_COUNT] }
                              : { y: -(centerIndex * 110) + 73 }
                          }
                          transition={
                            isReelSpinning
                              ? { duration: 0.8, repeat: Infinity, ease: "linear" }
                              : { duration: 0.5, ease: "easeOut" }
                          }
                        >
                          {reel.map((symbol, symbolIndex) => {
                            const isCenterSymbol = symbolIndex === centerIndex;
                            const isResultSymbol = !isSpinning && isCenterSymbol;
                            const shouldDim = !isSpinning && isBigWin && !isCenterSymbol;
                            
                            const distanceFromCenter = Math.abs(symbolIndex - centerIndex);
                            const blurAmount = isSpinning ? 0 : Math.min(distanceFromCenter * 2, 8);
                            const opacityAmount = isSpinning ? 1 : Math.max(1 - distanceFromCenter * 0.3, 0.2);
                            const scaleAmount = isSpinning ? 1 : isCenterSymbol ? 1 : Math.max(1 - distanceFromCenter * 0.1, 0.7);

                            return (
                              <div
                                key={symbolIndex}
                                className={`relative flex items-center justify-center text-5xl transition-all duration-500 sm:text-6xl md:text-7xl ${
                                  shouldDim ? "grayscale opacity-30 blur-sm" : ""
                                } ${isResultSymbol && isBigWin ? "animate-pulse" : ""}`}
                                style={{ 
                                  height: "110px",
                                  filter: shouldDim ? undefined : `blur(${blurAmount}px)`,
                                  opacity: shouldDim ? undefined : opacityAmount,
                                  transform: shouldDim ? undefined : `scale(${scaleAmount})`,
                                }}
                              >
                                {isResultSymbol && isBigWin && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    {[...Array(8)].map((_, i) => (
                                      <motion.div
                                        key={i}
                                        className="absolute h-2 w-2 rounded-full bg-amber-200/90 shadow-[0_0_8px_rgba(251,191,36,0.35)]"
                                        initial={{ x: 0, y: 0, opacity: 1 }}
                                        animate={{
                                          x: Math.cos((i * Math.PI * 2) / 8) * 72,
                                          y: Math.sin((i * Math.PI * 2) / 8) * 72,
                                          opacity: 0,
                                          scale: [1, 0.5, 0],
                                        }}
                                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
                                      />
                                    ))}
                                  </div>
                                )}
                                <SlotSymbolDisplay symbol={symbol} variant="reel" />
                              </div>
                            );
                          })}
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pop-up de victoire */}
            <AnimatePresence>
              {showWin && result.winAmount && (
                <motion.div
                  initial={{ scale: 0.92, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.92, opacity: 0, y: -12 }}
                  className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-3"
                >
                  <div className="relative max-w-[min(100%,24rem)] overflow-hidden rounded-sm border-4 border-amber-500/55 bg-gradient-to-b from-red-950/95 via-[#1a100c] to-[#0c0604] px-6 py-6 shadow-[0_24px_56px_rgba(0,0,0,0.6),0_0_32px_rgba(217,119,6,0.3)] sm:px-10 sm:py-8">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute text-amber-200/40"
                        initial={{ scale: 0, x: "50%", y: "50%" }}
                        animate={{
                          scale: [0, 1, 0],
                          x: `${50 + Math.cos((i * Math.PI * 2) / 8) * 180}%`,
                          y: `${50 + Math.sin((i * Math.PI * 2) / 8) * 180}%`,
                        }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                      >
                        <Coins className="h-5 w-5 sm:h-6 sm:w-6" />
                      </motion.div>
                    ))}
                    <div className="relative z-10">
                      <motion.p
                        className="mb-2 bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-100 bg-clip-text text-center font-serif text-xl font-black uppercase tracking-[0.2em] text-transparent sm:text-3xl"
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ duration: 0.55, repeat: Infinity }}
                      >
                        {t("slot.winBanner")}
                      </motion.p>
                      <motion.p
                        className="flex items-center justify-center gap-2 text-center text-3xl font-bold tabular-nums text-amber-200 drop-shadow-md sm:text-4xl"
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ duration: 0.65, repeat: Infinity, delay: 0.15 }}
                      >
                        <span>+{result.winAmount}</span>
                        <ChipIcon size="lg" className="brightness-110" />
                      </motion.p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            onClick={handleSpin}
            disabled={isSpinning || balance < bet}
            whileHover={!isSpinning && balance >= bet ? { scale: 1.012, y: -1 } : {}}
            whileTap={!isSpinning && balance >= bet ? { scale: 0.985, y: 1 } : {}}
            className={`relative z-10 w-full overflow-hidden rounded-sm border-[3px] py-4 font-serif text-lg font-black uppercase tracking-[0.18em] shadow-[0_12px_28px_rgba(0,0,0,0.45)] transition-all sm:py-5 sm:text-xl ${
              isSpinning || balance < bet
                ? "cursor-not-allowed border-stone-700 bg-stone-900/80 text-stone-500"
                : "border-amber-500/55 bg-gradient-to-r from-amber-950 via-red-950 to-amber-950 text-amber-100 shadow-[inset_0_2px_0_rgba(251,191,36,0.15),0_0_28px_rgba(217,119,6,0.2)] hover:border-amber-400/65 hover:from-amber-900 hover:via-red-900 hover:to-amber-900 hover:text-amber-50"
            }`}
          >
            {!isSpinning && balance >= bet && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/26 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
              {isSpinning ? (
                <>
                  <Zap className="h-7 w-7 shrink-0 animate-spin opacity-90 text-amber-100" /> {t("slot.spinning")}
                </>
              ) : balance < bet ? (
                <>{t("slot.insufficientFunds")}</>
              ) : (
                <>
                  <Coins className="h-6 w-6 shrink-0 text-amber-200/90" /> {t("slot.spin")}{" "}
                  <Coins className="h-6 w-6 shrink-0 text-amber-200/90" />
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>

      <aside className="relative w-full min-w-0 shrink-0 overflow-hidden rounded-sm border-4 border-amber-800/45 bg-[linear-gradient(165deg,#1c120e_0%,#140a08_55%,#0c0604_100%)] p-4 shadow-[inset_0_2px_0_rgba(251,191,36,0.1),0_18px_46px_rgba(0,0,0,0.38)] sm:p-6 lg:w-80 lg:max-w-sm xl:max-w-none">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(212,175,55,0.35) 1px, transparent 0)",
            backgroundSize: "14px 14px",
          }}
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/35 to-transparent" />

        <div className="relative z-10 mb-5 flex items-center gap-3 border-b-2 border-amber-800/35 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-amber-700/40 bg-amber-950/50 shadow-[0_0_14px_rgba(217,119,6,0.12)]">
            <TrendingUp className="h-5 w-5 text-amber-400" />
          </div>
          <h3
            className="bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text font-serif text-lg font-black uppercase tracking-wider text-transparent sm:text-xl"
          >
            {t("slot.paytableTitle")}
          </h3>
        </div>

        <div className="relative z-10 space-y-3">
          {Object.entries(MULTIPLIERS).map(([symbol, multiplier]) => {
            const sym = symbol as SlotSymbol;
            const symName = t(`slot.symbols.${sym}`);
            const paytableLabel = t("slot.paytableTriple", { symbol: symName });
            return (
            <motion.div
              key={symbol}
              className="group rounded-sm border-2 border-amber-900/35 bg-[#1a100c]/75 p-3 shadow-[inset_0_1px_0_rgba(251,191,36,0.06)] transition-colors hover:border-amber-700/45 hover:bg-[#241610] sm:p-4"
              whileHover={{ scale: 1.008, x: 1 }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-amber-800/35 bg-stone-950/80 transition group-hover:border-amber-600/40 group-hover:bg-amber-950/40">
                    <SlotSymbolDisplay symbol={sym} variant="paytable" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-serif font-semibold text-amber-100">{paytableLabel}</p>
                    <p className="text-sm text-amber-800/90">{t("slot.paytableThreeSame")}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-serif text-xl font-black tabular-nums text-amber-300 sm:text-2xl">×{multiplier}</p>
                  <p className="text-xs text-amber-700/80">{t("slot.multiplierLabel")}</p>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>

        <div className="relative z-10 mt-5 border-t-2 border-amber-800/30 pt-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-800/90">
            <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
            {t("slot.sessionCurrent")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-sm border-2 border-emerald-900/35 bg-emerald-950/25 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="font-serif text-xl font-black tabular-nums text-emerald-400">{sessionStats.wins}</p>
              <p className="text-xs text-amber-900/80">{t("slot.sessionWins")}</p>
            </div>
            <div className="rounded-sm border-2 border-amber-900/35 bg-amber-950/20 p-3 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="font-serif text-xl font-black tabular-nums text-amber-300">{sessionStats.spins}</p>
              <p className="text-xs text-amber-900/80">{t("slot.sessionSpins")}</p>
            </div>
          </div>
        </div>
      </aside>

      <AnimatePresence>
        {historyOpen ? (
          <motion.div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/65 p-4 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setHistoryOpen(false)}
          >
            <motion.div
              className="w-full max-w-2xl rounded-2xl border border-amber-700/35 bg-[#13100d] p-4 shadow-2xl sm:p-6"
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-amber-700/25 pb-3">
                <h3 className="text-lg font-bold text-amber-200 sm:text-xl">Historique du solde</h3>
                <button
                  type="button"
                  className="rounded-lg border border-slate-600 bg-slate-800/80 px-3 py-1.5 text-sm text-slate-200 hover:bg-slate-700"
                  onClick={() => setHistoryOpen(false)}
                >
                  Fermer
                </button>
              </div>

              {historyLoading ? <p className="py-8 text-center text-slate-400">Chargement…</p> : null}
              {historyError ? <p className="py-6 text-center text-rose-300">{historyError}</p> : null}

              {!historyLoading && !historyError ? (
              <CustomScrollArea className="h-[60vh] max-h-[26rem]" contentClassName="space-y-2 pr-2">
                  {historyEntries.length === 0 ? (
                    <p className="py-8 text-center text-slate-400">Aucun mouvement enregistré.</p>
                  ) : (
                    historyEntries.map((entry) => {
                      const before = typeof entry.balanceBefore === "number" ? entry.balanceBefore : null;
                      const after = typeof entry.balanceAfter === "number" ? entry.balanceAfter : null;
                      const delta = before !== null && after !== null ? after - before : entry.amount;
                      const positive = delta >= 0;
                      return (
                        <div
                          key={entry.id}
                          className="rounded-xl border border-amber-700/20 bg-[#1a1511]/65 px-3 py-2.5 sm:px-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-100">{reasonLabel(entry.reason)}</p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {new Intl.DateTimeFormat("fr-CA", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(entry.createdAt))}
                              </p>
                            </div>
                            <p className={`text-sm font-bold tabular-nums ${positive ? "text-emerald-300" : "text-rose-300"}`}>
                              {positive ? "+" : ""}
                              {delta.toLocaleString()}
                            </p>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                            <span>Avant: {before !== null ? before.toLocaleString() : "—"}</span>
                            <span>Apres: {after !== null ? after.toLocaleString() : "—"}</span>
                            <span>Jeu: {entry.gameType || "global"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CustomScrollArea>
              ) : null}
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
