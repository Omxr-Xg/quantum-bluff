import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useTableTheme } from "../../contexts/TableThemeContext";
import dealerShuffleAvatar from "../../assets/avatars/D1.png";

/** Dos de carte compact pour les mains du croupier. */
function MiniCardBack({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[3px] border border-white/15 shadow-md ${className}`}
      style={{
        aspectRatio: "5 / 7",
        background: "linear-gradient(145deg, #151d2e 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-[2px] rounded-[2px] opacity-80"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0 4px, rgba(255,255,255,0.04) 4px 5px), radial-gradient(ellipse 70% 50% at 50% 50%, rgba(185,28,28,0.18), transparent 70%)",
        }}
      />
    </div>
  );
}

export interface DeckShuffleOverlayProps {
  shuffleCount: number;
  title: string;
}

/**
 * Overlay mélange : même esprit que la table (feutre + liseré or) + avatar croupier et paquet animé.
 */
export function DeckShuffleOverlay({ shuffleCount, title }: DeckShuffleOverlayProps) {
  const { t } = useTranslation();
  const { feltGradient, feltBorder } = useTableTheme();
  const progress = Math.min(100, Math.round((shuffleCount / 8) * 100));
  const handPhase = shuffleCount % 4;
  const leftLift = handPhase === 0 || handPhase === 3;
  const sway = (shuffleCount % 6) - 2.5;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/88 backdrop-blur-[4px] px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[min(92vw,22rem)] overflow-hidden rounded-[1.75rem] border-[10px] shadow-[0_28px_90px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.07)] sm:max-w-md sm:rounded-[2rem] sm:border-[12px]"
        style={{
          borderColor: "rgba(212, 175, 55, 0.32)",
          background:
            "linear-gradient(165deg, rgba(15,23,42,0.97) 0%, rgba(2,6,23,0.99) 45%, rgba(30,27,15,0.96) 100%)",
        }}
      >
        <div
          className="relative overflow-hidden rounded-[1.2rem] sm:rounded-[1.5rem]"
          style={{
            borderWidth: 3,
            borderStyle: "solid",
            borderColor: feltBorder,
            background: feltGradient,
            boxShadow: "inset 0 0 80px rgba(0,0,0,0.35)",
          }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.12] mix-blend-overlay bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%223%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E')]" />

          <div className="relative z-10 flex flex-col items-center px-6 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
            <p className="text-center text-[10px] font-bold uppercase tracking-[0.32em] text-white/80 drop-shadow-sm sm:text-[11px]">
              {title}
            </p>

            {/* Croupier + paquet */}
            <div className="relative mt-7 flex flex-col items-center sm:mt-8">
              <motion.div
                className="relative"
                animate={{ rotate: sway * 0.35 }}
                transition={{ type: "spring", stiffness: 120, damping: 18 }}
              >
                <div className="relative flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full border-2 border-amber-400/50 bg-gradient-to-b from-slate-800 to-slate-950 shadow-[0_12px_40px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.12)] sm:h-[6.25rem] sm:w-[6.25rem]">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/10 via-transparent to-transparent" />
                  <img
                    src={dealerShuffleAvatar}
                    alt={t("game.dealer", "Donneur")}
                    className="relative z-[1] h-[78%] w-[78%] rounded-full object-cover shadow-inner ring-2 ring-black/25 sm:h-[76%] sm:w-[76%]"
                  />
                  <div className="absolute bottom-[14%] left-1/2 z-[2] flex -translate-x-1/2 gap-0.5" aria-hidden>
                    <span className="h-1.5 w-2.5 rounded-[1px] bg-red-900 shadow-sm" />
                    <span className="h-1.5 w-2.5 rounded-[1px] bg-red-900 shadow-sm" />
                  </div>
                </div>

                {/* Mains + petit jeu qui « mélange » */}
                <div className="pointer-events-none absolute -bottom-1 left-1/2 z-[3] flex w-[9rem] -translate-x-1/2 justify-center sm:w-[10rem]">
                  <motion.div
                    className="absolute flex gap-0.5"
                    style={{ left: "18%", bottom: 0 }}
                    animate={{
                      y: leftLift ? -6 : 0,
                      rotate: leftLift ? -14 : -6,
                      x: leftLift ? -4 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  >
                    <MiniCardBack className="w-[22px] sm:w-[26px]" />
                    <MiniCardBack className="w-[22px] sm:w-[26px] -ml-2" />
                  </motion.div>
                  <motion.div
                    className="absolute flex gap-0.5"
                    style={{ right: "18%", bottom: 0 }}
                    animate={{
                      y: !leftLift ? -6 : 0,
                      rotate: !leftLift ? 14 : 6,
                      x: !leftLift ? 4 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  >
                    <MiniCardBack className="w-[22px] sm:w-[26px] -mr-2" />
                    <MiniCardBack className="w-[22px] sm:w-[26px]" />
                  </motion.div>
                </div>
              </motion.div>

              <p className="mt-10 text-center text-[11px] font-medium text-white/70 sm:mt-11 sm:text-xs">
                {t("game.dealer", "Donneur")}
              </p>
            </div>

            <div className="mt-6 w-full max-w-[200px] sm:mt-7 sm:max-w-[220px]">
              <div className="flex justify-between text-[9px] tabular-nums text-white/40 sm:text-[10px]">
                <span>0%</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-black/40 ring-1 ring-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-300"
                  initial={false}
                  animate={{ width: `${progress}%` }}
                  transition={{ type: "tween", duration: 0.18, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
