import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, TrendingUp, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/ToastContext";
import {
  updateUserBalance,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
  fetchBalanceFromServer,
} from "../utils/userProfile";
import { apiUrl } from "../utils/apiBase";
import { ChipIcon } from "../components/ChipIcon";
import slotSevenLucky from "../assets/slot-seven-lucky.png";
import slotLemon from "../assets/slot-lemon.png";
import slotCherries from "../assets/slot-cherries.png";

type SlotSymbol = "🍒" | "🍊" | "💎" | "7️⃣" | "🎰";

const SLOT_SYM_IMG_REEL_CLS =
  "relative z-10 h-[4.25rem] w-auto max-w-[5.5rem] object-contain [filter:drop-shadow(0_2px_8px_rgba(0,0,0,0.45))] sm:h-[5rem] sm:max-w-[6.5rem] md:h-[5.85rem] md:max-w-[7.25rem]";
const SLOT_SYM_IMG_PAYTABLE_CLS =
  "h-12 w-auto max-w-[4.25rem] object-contain [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.35))] sm:h-14 sm:max-w-[5rem]";

function SlotSymbolDisplay({
  symbol,
  variant = "reel",
}: {
  symbol: SlotSymbol;
  variant?: "reel" | "paytable";
}) {
  const imgCls = variant === "reel" ? SLOT_SYM_IMG_REEL_CLS : SLOT_SYM_IMG_PAYTABLE_CLS;

  if (symbol === "7️⃣") {
    return (
      <img src={slotSevenLucky} alt="" className={imgCls} draggable={false} aria-hidden />
    );
  }
  if (symbol === "🍊") {
    return <img src={slotLemon} alt="" className={imgCls} draggable={false} aria-hidden />;
  }
  if (symbol === "🍒") {
    return <img src={slotCherries} alt="" className={imgCls} draggable={false} aria-hidden />;
  }
  const emojiCls =
    variant === "reel"
      ? "text-5xl sm:text-6xl md:text-7xl"
      : "text-3xl sm:text-4xl";
  return (
    <span className={`relative z-10 ${emojiCls}`} aria-hidden>
      {symbol}
    </span>
  );
}

// Mapping entre les données du backend et tes émojis UI
const API_TO_UI: Record<string, SlotSymbol> = {
  cherry: "🍒",
  lemon: "🍊",
  diamond: "💎",
  seven: "7️⃣",
  bell: "🎰",
};

interface SlotResult {
  symbols: SlotSymbol[];
  isWin: boolean;
  winAmount?: number;
}

const SYMBOLS: SlotSymbol[] = ["🍒", "🍊", "💎", "7️⃣", "🎰"];
const MULTIPLIERS = {
  "🍒": 2,
  "🍊": 3,
  "💎": 5,
  "7️⃣": 10,
  "🎰": 50,
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
    symbols: ["💎", "💎", "💎"],
    isWin: false,
    winAmount: 0,
  });
  const [showWin, setShowWin] = useState(false);
  const [spinningReels, setSpinningReels] = useState([false, false, false]);

  const isRefund = result.isWin && result.winAmount === bet;
  const isBigWin = result.isWin && result.winAmount! > bet;

  const MAX_BET = 500;
  const maxBet = Math.min(MAX_BET, balance);

  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const chips = await fetchBalanceFromServer({ authoritative: true });
      setBalance(chips);
    } catch {
      addToast(t("slot.errorLoadBalance"), "error");
    }
  }, [addToast, t]);

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
    const currentBalance = getUserBalance();
    if (isSpinning || currentBalance < bet) return;

    const token = localStorage.getItem("token");
    if (!token) {
      addToast(t("slot.errorMustLogin"), "error");
      return;
    }

    // Déduction visuelle immédiate
    const newBalanceAfterBet = currentBalance - bet;
    updateUserBalance(newBalanceAfterBet);

    // Lancement des animations (Code d'Azra)
    setIsSpinning(true);
    setShowWin(false);
    setSpinningReels([true, true, true]);
    setReels([generateReelSymbols(), generateReelSymbols(), generateReelSymbols()]);

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

      const data = successBody;

      // Application des résultats sur l'UI (Code d'Azra)
      const finalApiSymbols = data.reels;
      const finalUiSymbols = finalApiSymbols.map((sym) => API_TO_UI[sym] ?? "🍒") as SlotSymbol[];
      const isWin = data.winAmount > 0;

      setReels([
        generateReelSymbols(finalUiSymbols[0]),
        generateReelSymbols(finalUiSymbols[1]),
        generateReelSymbols(finalUiSymbols[2]),
      ]);

      setTimeout(() => setSpinningReels([false, true, true]), 500);
      setTimeout(() => setSpinningReels([false, false, true]), 1000);
      setTimeout(() => {
        setSpinningReels([false, false, false]);
        
        setResult({
          symbols: finalUiSymbols,
          isWin: isWin,
          winAmount: data.winAmount,
        });
        
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
      }, 1500);

    } catch (err: unknown) {
      // Si tout échoue, on rembourse la mise visuellement
      updateUserBalance(currentBalance);
      addToast(errorMessage(err, t("slot.errorSpin")), "error");
      setIsSpinning(false);
      setSpinningReels([false, false, false]);
    }
  };

  return (
    <div className="relative z-10 flex w-full min-w-0 max-w-full flex-col items-stretch gap-4 text-slate-200 lg:flex-row lg:items-start lg:gap-6">
      <div className="relative min-w-0 w-full flex-1">
        <div className="relative rounded-[1.35rem] border-2 border-slate-600/85 bg-gradient-to-b from-slate-900/95 via-slate-950 to-slate-900 p-4 pt-10 shadow-[0_20px_48px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)] sm:rounded-2xl sm:p-6 sm:pt-11 lg:p-8">
          <div className="absolute -top-2.5 left-1/2 z-10 max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-full border border-slate-500/60 bg-slate-800/90 px-4 py-1.5 shadow-lg backdrop-blur-sm sm:-top-3 sm:px-6 sm:py-2">
            <h3 className="bg-gradient-to-r from-purple-300 to-cyan-200 bg-clip-text text-center text-sm font-bold tracking-wide text-transparent sm:text-lg">
              {t("slot.brandTitle")}
            </h3>
          </div>

          <div className="pointer-events-none absolute left-3 top-11 opacity-50 sm:left-5 sm:top-12">
            <Sparkles className="h-5 w-5 text-purple-400/80 sm:h-6 sm:w-6" aria-hidden />
          </div>
          <div className="pointer-events-none absolute right-3 top-11 opacity-50 sm:right-5 sm:top-12">
            <Sparkles className="h-5 w-5 text-cyan-400/75 sm:h-6 sm:w-6" aria-hidden />
          </div>

          <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="rounded-xl border border-slate-600/75 bg-slate-800/50 px-4 py-3 sm:px-6">
              <p className="mb-1 text-xs font-semibold text-slate-400 sm:text-sm">{t("slot.balance")}</p>
              <p className="flex items-center justify-center gap-2 text-2xl font-bold tabular-nums text-green-400 sm:text-3xl">
                <span>{balance.toLocaleString()}</span>
                <ChipIcon size="lg" className="brightness-110" />
              </p>
            </div>

            <div className="rounded-xl border border-slate-600/75 bg-slate-800/50 px-4 py-3 sm:px-6">
              <p className="mb-1 text-xs font-semibold text-slate-400 sm:text-sm">{t("slot.selectBet")}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBet(Math.max(10, bet - 25))}
                  disabled={isSpinning}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-700/90 text-sm font-bold text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  −
                </button>
                <p className="flex min-w-[80px] items-center justify-center gap-1.5 text-center text-2xl font-bold tabular-nums text-green-400">
                  <span>{bet}</span>
                  <ChipIcon size="md" className="brightness-110" />
                </p>
                <button
                  type="button"
                  onClick={() => setBet(Math.min(maxBet, bet + 25))}
                  disabled={isSpinning || bet >= maxBet}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600 bg-slate-700/90 text-sm font-bold text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1 justify-center sm:flex-nowrap">
                {[10, 50, 100, 250, 500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBet(Math.min(maxBet, Math.min(balance, preset)))}
                    disabled={isSpinning || balance < preset}
                    className="min-w-[3rem] flex-1 py-1 text-xs font-bold rounded-lg border border-slate-600 bg-slate-700/90 text-slate-100 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {preset === 500 ? 'MAX' : preset}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-center text-xs text-slate-500">
                Max : 500 <ChipIcon size="sm" className="inline" />
              </p>
            </div>
          </div>

          <div className="relative mb-4 sm:mb-8">
            <div className="rounded-2xl border border-slate-600/80 bg-slate-900/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-6 lg:p-8">
              <div
                className={`pointer-events-none absolute left-2 right-2 top-1/2 z-20 flex h-24 -translate-y-1/2 items-center justify-center transition-all duration-500 sm:left-8 sm:right-8 sm:h-32 ${
                  isBigWin && !isSpinning
                    ? "border-y-2 border-emerald-500/45 bg-gradient-to-r from-transparent via-emerald-600/20 to-transparent shadow-[0_0_28px_rgba(16,185,129,0.2)]"
                    : isRefund && !isSpinning
                    ? "border-y-2 border-amber-500/45 bg-gradient-to-r from-transparent via-amber-600/15 to-transparent"
                    : ""
                }`}
              >
                {isBigWin && !isSpinning && (
                  <motion.div
                    className="text-base font-bold text-emerald-300 sm:text-2xl"
                    animate={{ scale: [1, 1.08, 1], opacity: [1, 0.88, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    {t("slot.winLine")}
                  </motion.div>
                )}
                {isRefund && !isSpinning && (
                  <motion.div
                    className="text-base font-bold text-amber-300 sm:text-2xl"
                    animate={{ scale: [1, 1.08, 1], opacity: [1, 0.88, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    {t("slot.refundLine")}
                  </motion.div>
                )}
              </div>

              <div className="-mx-1 flex min-w-0 justify-center gap-1.5 overflow-x-auto overflow-y-visible px-1 pb-1 sm:mx-0 sm:gap-4 sm:overflow-visible sm:px-0">
                {reels.map((reel, reelIndex) => {
                  const isReelSpinning = spinningReels[reelIndex];
                  const centerIndex = Math.floor(REEL_SYMBOLS_COUNT / 2);

                  return (
                    <div
                      key={reelIndex}
                      className="min-w-[100px] max-w-[200px] shrink-0 flex-1 basis-0 sm:min-w-0 sm:shrink"
                    >
                      <div className="relative h-[350px] overflow-hidden rounded-xl border-2 border-slate-600/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 shadow-inner sm:rounded-2xl">
                        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 h-32 bg-gradient-to-b from-slate-950 via-slate-950/90 to-transparent" />
                        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-32 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent" />

                        <motion.div
                          className="flex flex-col items-center"
                          animate={
                            isReelSpinning
                              ? { y: [0, -110 * REEL_SYMBOLS_COUNT] }
                              : { y: -(centerIndex * 110) + 175 - 55 }
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
                                        className="absolute h-2 w-2 rounded-full bg-cyan-300/90 shadow-[0_0_8px_rgba(103,232,249,0.45)]"
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
                  <div className="relative max-w-[min(100%,24rem)] overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-b from-slate-900/98 via-emerald-950/85 to-slate-950 px-6 py-6 shadow-[0_24px_56px_rgba(0,0,0,0.55),0_0_40px_rgba(16,185,129,0.22)] ring-1 ring-emerald-400/20 sm:rounded-3xl sm:px-10 sm:py-8">
                    {[...Array(8)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute text-purple-300/50"
                        initial={{ scale: 0, x: "50%", y: "50%" }}
                        animate={{
                          scale: [0, 1, 0],
                          x: `${50 + Math.cos((i * Math.PI * 2) / 8) * 180}%`,
                          y: `${50 + Math.sin((i * Math.PI * 2) / 8) * 180}%`,
                        }}
                        transition={{ duration: 1.1, ease: "easeOut" }}
                      >
                        <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                      </motion.div>
                    ))}
                    <div className="relative z-10">
                      <motion.p
                        className="mb-2 bg-gradient-to-r from-purple-200 to-cyan-200 bg-clip-text text-center text-xl font-bold tracking-wide text-transparent sm:text-3xl"
                        animate={{ scale: [1, 1.04, 1] }}
                        transition={{ duration: 0.55, repeat: Infinity }}
                      >
                        {t("slot.winBanner")}
                      </motion.p>
                      <motion.p
                        className="flex items-center justify-center gap-2 text-center text-3xl font-bold tabular-nums text-emerald-300 drop-shadow-md sm:text-4xl"
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
            whileHover={!isSpinning && balance >= bet ? { scale: 1.02 } : {}}
            whileTap={!isSpinning && balance >= bet ? { scale: 0.98 } : {}}
            className={`relative w-full overflow-hidden rounded-xl border-2 py-4 text-lg font-bold tracking-wide shadow-[0_12px_28px_rgba(0,0,0,0.4)] transition-all sm:py-5 sm:text-xl ${
              isSpinning || balance < bet
                ? "cursor-not-allowed border-slate-700 bg-slate-800/80 text-slate-500"
                : "border-green-400/45 bg-gradient-to-b from-green-600 to-green-800 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_0_rgb(21_128_61)] hover:from-green-500 hover:to-green-700"
            }`}
          >
            {!isSpinning && balance >= bet && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2 sm:gap-3">
              {isSpinning ? (
                <>
                  <Zap className="h-7 w-7 shrink-0 animate-spin opacity-90" /> {t("slot.spinning")}
                </>
              ) : balance < bet ? (
                <>{t("slot.insufficientFunds")}</>
              ) : (
                <>
                  <Sparkles className="h-6 w-6 shrink-0 text-cyan-200/90" /> {t("slot.spin")}{" "}
                  <Sparkles className="h-6 w-6 shrink-0 text-cyan-200/90" />
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>

      <aside className="w-full min-w-0 shrink-0 rounded-2xl border-2 border-slate-600/80 bg-gradient-to-b from-slate-900/95 to-slate-950 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.4)] sm:p-6 lg:w-80 lg:max-w-sm xl:max-w-none">
        <div className="mb-5 flex items-center gap-3 border-b border-slate-600/60 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-600 bg-slate-800/80">
            <TrendingUp className="h-5 w-5 text-purple-300" />
          </div>
          <h3 className="bg-gradient-to-r from-purple-200 to-cyan-200 bg-clip-text text-lg font-bold text-transparent sm:text-xl">
            {t("slot.paytableTitle")}
          </h3>
        </div>

        <div className="space-y-3">
          {Object.entries(MULTIPLIERS).map(([symbol, multiplier]) => {
            const sym = symbol as SlotSymbol;
            const paytableLabel =
              sym === "7️⃣"
                ? t("slot.paytableTriple", { symbol: "7" })
                : sym === "🍊"
                  ? t("slot.paytableTriple", { symbol: "🍋" })
                  : t("slot.paytableTriple", { symbol });
            return (
            <motion.div
              key={symbol}
              className="rounded-xl border border-slate-600/60 bg-slate-800/40 p-3 transition-colors hover:border-slate-500 sm:p-4"
              whileHover={{ scale: 1.005 }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex shrink-0 items-center justify-center">
                    <SlotSymbolDisplay symbol={sym} variant="paytable" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-100">{paytableLabel}</p>
                    <p className="text-sm text-slate-400">{t("slot.paytableThreeSame")}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold tabular-nums text-emerald-400 sm:text-2xl">×{multiplier}</p>
                  <p className="text-xs text-emerald-300/60">{t("slot.multiplierLabel")}</p>
                </div>
              </div>
            </motion.div>
            );
          })}
        </div>

        <div className="mt-5 rounded-xl border border-slate-600/60 bg-slate-800/35 p-4">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
            <div>
              <p className="mb-1 font-semibold text-purple-200">{t("slot.quantumBoostTitle")}</p>
              <p className="text-sm leading-relaxed text-slate-400">{t("slot.quantumBoostBody")}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-600/50 pt-5">
          <p className="mb-3 text-sm font-semibold text-slate-400">{t("slot.sessionCurrent")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-slate-600/55 bg-slate-800/45 p-3 text-center">
              <p className="text-xl font-bold tabular-nums text-emerald-400">{sessionStats.wins}</p>
              <p className="text-xs text-slate-500">{t("slot.sessionWins")}</p>
            </div>
            <div className="rounded-lg border border-slate-600/55 bg-slate-800/45 p-3 text-center">
              <p className="text-xl font-bold tabular-nums text-green-400">{sessionStats.spins}</p>
              <p className="text-xs text-slate-500">{t("slot.sessionSpins")}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}