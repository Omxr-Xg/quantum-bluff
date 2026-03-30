import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import victorySound from "../assets/sounds/victory.mp3";
import { PokerCard } from "./PokerCard";
import { ChipIcon } from "./ChipIcon";
import { useAccessibility } from "../contexts/AccessibilityContext";

interface CardData {
  suit: string;
  value: string;
}

interface ShowdownDisplayProps {
  winner: {
    name: string;
    hand: string;
    pot: number;
    isSplit?: boolean;
  } | null;
  winnerCards?: CardData[];
  onClose?: () => void;
}

function getHandColor(hand: string): string {
  if (hand.includes("Quinte flush")) return "text-purple-400";
  if (hand.includes("Carré")) return "text-blue-400";
  if (hand.includes("Full")) return "text-green-400";
  if (hand.includes("Couleur")) return "text-cyan-400";
  if (hand.includes("Quinte")) return "text-yellow-400";
  if (hand.includes("Brelan")) return "text-orange-400";
  if (hand.includes("Double paire")) return "text-pink-400";
  if (hand.includes("Paire")) return "text-indigo-400";
  if (hand.includes("Abandon")) return "text-slate-400";
  return "text-gray-400";
}

export function ShowdownDisplay({ winner, winnerCards, onClose }: ShowdownDisplayProps) {
  const { t } = useTranslation();
  const hasPlayedSoundRef = useRef(false);
  const { visualAlerts, colorblindMode } = useAccessibility();

  useEffect(() => {
    if (winner && !hasPlayedSoundRef.current) {
      hasPlayedSoundRef.current = true;
      if (visualAlerts) {
        // Alertes visuelles : flash + vibration au lieu du son
        try {
          if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        } catch {
          /* vibrate non supporté */
        }
      } else {
        const audio = new Audio(victorySound);
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    }
    if (!winner) hasPlayedSoundRef.current = false; // Reset pour le prochain showdown
  }, [winner, visualAlerts]);

  useEffect(() => {
    if (!winner || !onClose) return;
    const timer = setTimeout(onClose, 10000);
    return () => clearTimeout(timer);
  }, [winner, onClose]);

  if (!winner) return null;

  const displayHand = (winner.hand && winner.hand !== "—") ? winner.hand : t('showdown.highCard');

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.5 }}
        className={`fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm ${visualAlerts ? "visual-alert" : ""}`}
        onClick={onClose}
      >
        <motion.div
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-yellow-500 shadow-2xl max-w-md w-full p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-white mb-2">{t('showdown.title')}</h2>
          </div>

          <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
            <div className="text-center mb-4">
              <div className="text-gray-400 text-sm mb-1">{winner.isSplit ? t('showdown.result') : t('showdown.winner')}</div>
              <div className="text-2xl font-bold text-white">{winner.isSplit ? t('showdown.tieSplitPot') : (winner.name === "Vous" || winner.name === "you" ? t('game.you') : winner.name)}</div>
            </div>

            {winnerCards && winnerCards.length > 0 && (
              <div className="flex justify-center gap-3 my-4">
                {winnerCards.map((card, i) => (
                  <PokerCard
                    key={i}
                    suit={card.suit}
                    value={card.value}
                    size="md"
                    highlight
                    animated
                    animationDelay={i * 0.15}
                    colorblindMode={colorblindMode}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-between items-center border-t border-b border-slate-600 py-4 my-4">
              <span className="text-gray-400">{t('showdown.winningCombination')}</span>
              <span className={`text-xl font-bold ${getHandColor(displayHand)}`}>
                {displayHand}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">{winner.isSplit ? t('showdown.eachReceives') : t('showdown.gain')}</span>
              <span className="text-2xl font-bold text-yellow-400">
                {winner.pot.toLocaleString()} <ChipIcon size="sm" className="inline-block align-middle ml-0.5" />
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
          >
            {t('showdown.continue')}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
