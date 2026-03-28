import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, TrendingUp, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useToast } from "../contexts/ToastContext";
import { updateUserBalance } from "../utils/userProfile";
import { apiUrl } from "../utils/apiBase";

import { getUserBalance, BALANCE_CHANGED_EVENT } from "../utils/userProfile";

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

export function SlotMachine() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [bet, setBet] = useState(10);
  // 1. On prend le vrai solde au démarrage
  const [balance, setBalance] = useState<number>(getUserBalance());

  // 2. On écoute en temps réel TOUTES les modifications du solde
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

  // Chargement du solde initial depuis le serveur
  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(apiUrl("/api/auth/balance"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(Math.max(0, Math.floor(data.chips)));
      }
    } catch {
      addToast(t("slot.errorLoadBalance", "Erreur de chargement du solde"), "error");
    }
  }, [addToast, t]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  // Génère un rouleau. Si un targetSymbol est fourni, il sera placé au centre pour l'arrêt
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
    const currentBalance = getUserBalance(); // On récupère le solde le plus frais possible
    if (isSpinning || currentBalance < bet) return;

    const token = localStorage.getItem("token");
    if (!token) {
      addToast("Vous devez être connecté", "error");
      return;
    }

    // 1. DÉDUCTION IMMÉDIATE DU VRAI SOLDE
    const newBalanceAfterBet = currentBalance - bet;
    updateUserBalance(newBalanceAfterBet); // Cela mettra à jour l'UI partout instantanément

    setIsSpinning(true);
    setShowWin(false);
    setSpinningReels([true, true, true]);
    setReels([generateReelSymbols(), generateReelSymbols(), generateReelSymbols()]);

    try {
      const res = await fetch(apiUrl("/api/slot/spin"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erreur serveur");

      const finalApiSymbols = (data.reels || ["cherry", "cherry", "cherry"]) as string[];
      const finalUiSymbols = finalApiSymbols.map((sym) => API_TO_UI[sym] || "🍒") as SlotSymbol[];
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
        
        // 2. MISE À JOUR FINALE (On prend la valeur exacte renvoyée par le serveur)
        const finalChips = typeof data.chips === "number" 
          ? Math.max(0, Math.floor(data.chips)) 
          : getUserBalance() + (data.winAmount || 0);

        updateUserBalance(finalChips); // Met à jour tout le site avec le résultat final

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

    } catch (err: any) {
      // Si la requête échoue, on annule la mise et on rend l'argent !
      updateUserBalance(currentBalance);
      addToast(err.message || "Erreur lors du spin", "error");
      setIsSpinning(false);
      setSpinningReels([false, false, false]);
    }
  };

  return (
    <div className="flex gap-6 items-start">
      {/* Machine à sous principale */}
      <div className="flex-1 relative">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border-4 border-yellow-600/50 shadow-[0_0_60px_20px_rgba(202,138,4,0.3)] p-8">
          
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 px-8 py-2 rounded-full border-2 border-yellow-400 shadow-lg">
            <h3 className="text-white font-bold text-xl tracking-wider">QUANTUM SLOTS</h3>
          </div>

          <div className="absolute top-4 left-4">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          <div className="absolute top-4 right-4">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>

          {/* Affichage du solde et mise */}
          <div className="flex justify-between items-center mb-6">
            <div className="bg-slate-950/60 backdrop-blur-sm border-2 border-yellow-500/30 rounded-xl px-6 py-3">
              <p className="text-yellow-200/70 text-sm font-semibold mb-1">Solde</p>
              <p className="text-3xl font-bold text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                {balance.toLocaleString()} 🪙
              </p>
            </div>

            <div className="bg-slate-950/60 backdrop-blur-sm border-2 border-yellow-500/30 rounded-xl px-6 py-3">
              <p className="text-yellow-200/70 text-sm font-semibold mb-1">Mise</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBet(Math.max(10, bet - 10))}
                  disabled={isSpinning}
                  className="w-8 h-8 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-bold transition-all"
                >
                  -
                </button>
                <p className="text-2xl font-bold text-yellow-400 min-w-[80px] text-center drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">
                  {bet} 🪙
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
          <div className="relative mb-8">
            <div className="bg-slate-950/80 backdrop-blur-xl rounded-2xl border-4 border-yellow-500/40 p-8 shadow-inner">
              <div
                className={`absolute left-8 right-8 h-32 top-1/2 -translate-y-1/2 transition-all duration-500 pointer-events-none z-20 flex items-center justify-center ${
                  result.isWin && !isSpinning && result.winAmount! > bet
                    ? "bg-gradient-to-r from-transparent via-green-500/30 to-transparent border-y-4 border-green-400 shadow-[0_0_40px_15px_rgba(34,197,94,0.5)]"
                    : ""
                }`}
              >
                {result.isWin && !isSpinning && result.winAmount! > bet && (
                  <motion.div
                    className="text-green-400 font-bold text-2xl"
                    animate={{ scale: [1, 1.2, 1], opacity: [1, 0.7, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ★ WIN LINE ★
                  </motion.div>
                )}
              </div>

              <div className="flex gap-4 justify-center">
                {reels.map((reel, reelIndex) => {
                  const isReelSpinning = spinningReels[reelIndex];
                  const centerIndex = Math.floor(REEL_SYMBOLS_COUNT / 2);

                  return (
                    <div key={reelIndex} className="flex-1 max-w-[200px]">
                      <div className="relative h-[350px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-4 border-yellow-600/40 overflow-hidden">
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
                            // Assombrit seulement s'il y a un vrai gain (supérieur à la mise)
                            const shouldDim = !isSpinning && result.isWin && result.winAmount! > bet && !isCenterSymbol;
                            
                            const distanceFromCenter = Math.abs(symbolIndex - centerIndex);
                            const blurAmount = isSpinning ? 0 : Math.min(distanceFromCenter * 2, 8);
                            const opacityAmount = isSpinning ? 1 : Math.max(1 - distanceFromCenter * 0.3, 0.2);
                            const scaleAmount = isSpinning ? 1 : isCenterSymbol ? 1 : Math.max(1 - distanceFromCenter * 0.1, 0.7);

                            return (
                              <div
                                key={symbolIndex}
                                className={`flex items-center justify-center text-7xl transition-all duration-500 relative ${
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
                  className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none"
                >
                  <div className="bg-gradient-to-br from-green-600 via-green-500 to-green-600 border-4 border-green-300 rounded-3xl px-12 py-8 shadow-[0_0_60px_30px_rgba(34,197,94,0.6)] relative overflow-hidden">
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
                        className="text-white font-bold text-4xl mb-2 text-center drop-shadow-lg"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        🎰 QUANTUM WIN! 🎰
                      </motion.p>
                      <motion.p
                        className="text-yellow-100 font-bold text-5xl text-center drop-shadow-lg"
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                      >
                        +{result.winAmount} 🪙
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
            className={`w-full py-6 rounded-2xl font-bold text-2xl tracking-widest transition-all shadow-2xl relative overflow-hidden ${
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
                  <Zap className="w-8 h-8 animate-spin" /> SPINNING...
                </>
              ) : balance < bet ? (
                <>SOLDE INSUFFISANT</>
              ) : (
                <>
                  <Sparkles className="w-8 h-8" /> SPIN <Sparkles className="w-8 h-8" />
                </>
              )}
            </span>
          </motion.button>
        </div>
      </div>

      {/* Panneau des règles (INCHANGÉ - Parfait comme il est) */}
      <div className="w-80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-yellow-600/40 p-6 shadow-[0_0_40px_10px_rgba(202,138,4,0.2)]">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-yellow-600/30">
          <div className="w-10 h-10 bg-yellow-600/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-yellow-400" />
          </div>
          <h3 className="text-xl font-bold text-yellow-400">Tableau des gains</h3>
        </div>

        <div className="space-y-4">
          {Object.entries(MULTIPLIERS).map(([symbol, multiplier]) => (
            <motion.div
              key={symbol}
              className="bg-slate-950/60 backdrop-blur-sm border-2 border-yellow-600/20 rounded-xl p-4 hover:border-yellow-500/40 transition-all"
              whileHover={{ scale: 1.02, x: 5 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">{symbol}</span>
                  <div>
                    <p className="text-white font-semibold">3x {symbol}</p>
                    <p className="text-yellow-200/60 text-sm">3 symboles identiques</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-400">x{multiplier}</p>
                  <p className="text-green-300/60 text-xs">multiplicateur</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 bg-gradient-to-r from-yellow-600/20 to-yellow-500/20 border-2 border-yellow-500/40 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-300 font-semibold mb-1">Quantum Boost</p>
              <p className="text-yellow-200/70 text-sm leading-relaxed">
                Le serveur garantit des probabilités quantiques sur chaque tour !
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t-2 border-yellow-600/30">
          <p className="text-yellow-400/70 text-sm font-semibold mb-3">Session actuelle</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950/60 rounded-lg p-3 text-center">
              <p className="text-green-400 font-bold text-xl">{sessionStats.wins}</p>
              <p className="text-green-300/60 text-xs">Victoires</p>
            </div>
            <div className="bg-slate-950/60 rounded-lg p-3 text-center">
              <p className="text-yellow-400 font-bold text-xl">{sessionStats.spins}</p>
              <p className="text-yellow-300/60 text-xs">Tours joués</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}