import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, TrendingUp, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/ToastContext";
import {
  updateUserBalance,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
} from "../utils/userProfile";
import { apiUrl } from "../utils/apiBase";
import { ChipIcon } from "../components/ChipIcon";

type SlotSymbol = "🍒" | "🍊" | "💎" | "7️⃣" | "🎰";

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

  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/auth/balance"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const raw: unknown = await res.json();
        const chips =
          raw !== null &&
          typeof raw === "object" &&
          "chips" in raw &&
          typeof (raw as { chips: unknown }).chips === "number"
            ? Math.max(0, Math.floor((raw as { chips: number }).chips))
            : getUserBalance();
        setBalance(chips);
      }
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
    <div className="flex w-full min-w-0 max-w-full flex-col items-stretch gap-4 lg:flex-row lg:items-start lg:gap-6">
      {/* Machine à sous principale */}
      <div className="relative min-w-0 w-full flex-1">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-4 border-yellow-600/50 p-4 pt-10 shadow-[0_0_60px_20px_rgba(202,138,4,0.3)] sm:rounded-3xl sm:p-6 sm:pt-12 lg:p-8">
          
          <div className="absolute -top-3 left-1/2 z-10 max-w-[calc(100%-1rem)] -translate-x-1/2 rounded-full border-2 border-yellow-400 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 px-4 py-1.5 shadow-lg sm:-top-4 sm:px-8 sm:py-2">
            <h3 className="text-center text-sm font-bold tracking-wider text-white sm:text-xl">
              {t("slot.brandTitle")}
            </h3>
          </div>

          <div className="absolute top-4 left-4">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          <div className="absolute top-4 right-4">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>

          {/* Affichage du solde et mise */}
          <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="bg-slate-950/60 backdrop-blur-sm border-2 border-yellow-500/30 rounded-xl px-4 py-3 sm:px-6">
              <p className="text-yellow-200/70 text-xs font-semibold sm:text-sm mb-1">{t("slot.balance")}</p>
              <p className="flex items-center justify-center gap-2 text-2xl font-bold tabular-nums text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] sm:text-3xl">
                <span>{balance.toLocaleString()}</span>
                <ChipIcon size="lg" className="brightness-110" />
              </p>
            </div>

            <div className="bg-slate-950/60 backdrop-blur-sm border-2 border-yellow-500/30 rounded-xl px-4 py-3 sm:px-6">
              <p className="text-yellow-200/70 text-xs font-semibold sm:text-sm mb-1">{t("slot.selectBet")}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBet(Math.max(10, bet - 10))}
                  disabled={isSpinning}
                  className="w-8 h-8 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold transition-all"
                >
                  -
                </button>
                <p className="flex min-w-[80px] items-center justify-center gap-1.5 text-center text-2xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                  <span>{bet}</span>
                  <ChipIcon size="md" className="brightness-110" />
                </p>
                <button
                  onClick={() => setBet(Math.min(balance, bet + 10))}
                  disabled={isSpinning || balance < bet + 10}
                  className="w-8 h-8 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold transition-all"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          {/* Rouleaux de la machine à sous */}
          <div className="relative mb-4 sm:mb-8">
            <div className="bg-slate-950/80 backdrop-blur-xl rounded-2xl border-4 border-yellow-500/40 p-3 shadow-inner sm:p-6 lg:p-8">
              <div
                className={`pointer-events-none absolute left-2 right-2 top-1/2 z-20 flex h-24 -translate-y-1/2 items-center justify-center transition-all duration-500 sm:left-8 sm:right-8 sm:h-32 ${
                  result.isWin && !isSpinning && result.winAmount! > bet
                    ? "bg-gradient-to-r from-transparent via-green-500/30 to-transparent border-y-4 border-green-400 shadow-[0_0_40px_15px_rgba(34,197,94,0.5)]"
                    : ""
                }`}
              >
                {result.isWin && !isSpinning && result.winAmount! > bet && (
                  <motion.div
                    className="text-base font-bold text-green-400 sm:text-2xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    {t("slot.winLine")}
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
                      <div className="relative h-[350px] overflow-hidden rounded-xl border-4 border-yellow-600/40 bg-gradient-to-br from-slate-800 to-slate-900 sm:rounded-2xl">
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent z-10 pointer-events-none" />

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
                            const shouldDim = !isSpinning && result.isWin && result.winAmount! > bet && !isCenterSymbol;
                            
                            const distanceFromCenter = Math.abs(symbolIndex - centerIndex);
                            const blurAmount = isSpinning ? 0 : Math.min(distanceFromCenter * 2, 8);
                            const opacityAmount = isSpinning ? 1 : Math.max(1 - distanceFromCenter * 0.3, 0.2);
                            const scaleAmount = isSpinning ? 1 : isCenterSymbol ? 1 : Math.max(1 - distanceFromCenter * 0.1, 0.7);

                            return (
                              <div
                                key={symbolIndex}
                                className={`relative flex items-center justify-center text-5xl transition-all duration-500 sm:text-6xl md:text-7xl ${
                                  shouldDim ? "grayscale opacity-30 blur-sm" : ""
                                } ${isResultSymbol && result.isWin && result.winAmount! > bet ? "animate-pulse" : ""}`}
                                style={{ 
                                  height: "110px",
                                  filter: shouldDim ? undefined : `blur(${blurAmount}px)`,
                                  opacity: shouldDim ? undefined : opacityAmount,
                                  transform: shouldDim ? undefined : `scale(${scaleAmount})`,
                                }}
                              >
                                {isResultSymbol && result.isWin && result.winAmount! > bet && (
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    {[...Array(8)].map((_, i) => (
                                      <motion.div
                                        key={i}
                                        className="absolute w-3 h-3 bg-green-400 rounded-full"
                                        initial={{ x: 0, y: 0, opacity: 1 }}
                                        animate={{
                                          x: Math.cos((i * Math.PI * 2) / 8) * 80,
                                          y: Math.sin((i * Math.PI * 2) / 8) * 80,
                                          opacity: 0,
                                          scale: [1, 0.5, 0],
                                        }}
                                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                                      />
                                    ))}
                                  </div>
                                )}
                                <span className="relative z-10">{symbol}</span>
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
                  initial={{ scale: 0, opacity: 0, y: 50 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0, opacity: 0, y: -50 }}
                  className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-3"
                >
                  <div className="relative max-w-[min(100%,24rem)] overflow-hidden rounded-2xl border-4 border-green-300 bg-gradient-to-br from-green-600 via-green-500 to-green-600 px-6 py-6 shadow-[0_0_60px_30px_rgba(34,197,94,0.6)] sm:rounded-3xl sm:px-12 sm:py-8">
                    {[...Array(12)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        initial={{ scale: 0, x: "50%", y: "50%" }}
                        animate={{
                          scale: [0, 1, 0],
                          x: `${50 + Math.cos((i * Math.PI * 2) / 12) * 200}%`,
                          y: `${50 + Math.sin((i * Math.PI * 2) / 12) * 200}%`,
                        }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      >
                        <Sparkles className="w-6 h-6 text-yellow-300" />
                      </motion.div>
                    ))}
                    <div className="relative z-10">
                      <motion.p
                        className="mb-2 text-center text-2xl font-bold text-white drop-shadow-lg sm:text-4xl"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        {t("slot.winBanner")}
                      </motion.p>
                      <motion.p
                        className="flex items-center justify-center gap-2 text-center text-3xl font-bold text-yellow-100 drop-shadow-lg sm:text-5xl"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
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
            onClick={handleSpin}
            disabled={isSpinning || balance < bet}
            whileHover={!isSpinning && balance >= bet ? { scale: 1.05 } : {}}
            whileTap={!isSpinning && balance >= bet ? { scale: 0.95 } : {}}
            className={`w-full rounded-2xl py-4 text-lg font-bold tracking-widest transition-all shadow-2xl sm:py-6 sm:text-2xl relative overflow-hidden ${
              isSpinning || balance < bet
                ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-white shadow-[0_0_40px_10px_rgba(202,138,4,0.5)] hover:shadow-[0_0_60px_20px_rgba(202,138,4,0.7)]"
            }`}
          >
            {!isSpinning && balance >= bet && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-3">
              {isSpinning ? (
                <>
                  <Zap className="w-8 h-8 animate-spin" /> {t("slot.spinning")}
                </>
              ) : balance < bet ? (
                <>{t("slot.insufficientFunds")}</>
              ) : (
                <>
                  <Sparkles className="w-8 h-8" /> {t("slot.spin")}{" "}
                  <Sparkles className="w-8 h-8" />
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Panneau des règles */}
      <div className="w-full min-w-0 shrink-0 rounded-2xl border-2 border-yellow-600/40 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 shadow-[0_0_40px_10px_rgba(202,138,4,0.2)] sm:p-6 lg:w-80 lg:max-w-sm xl:max-w-none">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-yellow-600/30">
          <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-yellow-400" />
          </div>
          <h3 className="text-lg font-bold text-yellow-400 sm:text-xl">{t("slot.paytableTitle")}</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(MULTIPLIERS).map(([symbol, multiplier]) => (
            <motion.div
              key={symbol}
              className="bg-slate-950/60 backdrop-blur-sm border-2 border-yellow-600/20 rounded-xl p-3 transition-all hover:border-yellow-500/40 sm:p-4 md:hover:translate-x-1"
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{symbol}</span>
                  <div>
                    <p className="text-white font-semibold">
                      {t("slot.paytableTriple", { symbol })}
                    </p>
                    <p className="text-yellow-200/60 text-sm">{t("slot.paytableThreeSame")}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">x{multiplier}</p>
                  <p className="text-green-300/60 text-xs">{t("slot.multiplierLabel")}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border-2 border-yellow-500/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold mb-1">{t("slot.quantumBoostTitle")}</p>
              <p className="text-yellow-200/70 text-sm leading-relaxed">{t("slot.quantumBoostBody")}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t-2 border-yellow-600/30">
          <p className="text-yellow-400/70 text-sm font-semibold mb-3">{t("slot.sessionCurrent")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 rounded-lg p-3 text-center">
              <p className="text-green-400 font-bold text-xl">{sessionStats.wins}</p>
              <p className="text-green-300/60 text-xs">{t("slot.sessionWins")}</p>
            </div>
            <div className="bg-slate-950/60 rounded-lg p-3 text-center">
              <p className="text-yellow-400 font-bold text-xl">{sessionStats.spins}</p>
              <p className="text-yellow-300/60 text-xs">{t("slot.sessionSpins")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}