import { motion } from "motion/react";
import { Trophy, Crown, Sparkles, LogOut, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RoundTransitionProps {
  roundNumber: number;
  winner?: {
    name: string;
    amount: number;
  };
  onComplete: () => void;
  /** Retour au lobby sans lancer la manche suivante */
  onLeaveToLobby?: () => void;
}

export function RoundTransition({
  roundNumber,
  winner,
  onComplete,
  onLeaveToLobby,
}: RoundTransitionProps) {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/40 rounded-full"
            initial={{
              x: `${Math.random() * 100}vw`,
              y: "-10px",
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              y: "110vh",
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 text-center">
        {winner && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-10"
          >
            <div
              className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-600/20 via-yellow-500/30 to-yellow-600/20 
                          border-2 border-yellow-500/50 rounded-2xl px-8 py-4 backdrop-blur-md"
            >
              <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
              <div className="text-left">
                <p className="text-sm text-yellow-200/80 font-serif">{t("game.roundWinnerLabel")}</p>
                <p className="text-2xl font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">
                  {winner.name}
                </p>
                <p className="text-lg text-yellow-400/90 font-semibold">
                  +{winner.amount.toLocaleString()} {t("game.jets", "jetons")}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -top-3 -left-3">
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <Sparkles className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            </motion.div>
          </div>
          <div className="absolute -bottom-3 -right-3">
            <motion.div
              animate={{
                rotate: -360,
                scale: [1, 1.2, 1],
              }}
              transition={{
                rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 },
              }}
            >
              <Sparkles className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
            </motion.div>
          </div>

          <p className="text-lg text-yellow-100/90 font-serif mb-2">{t("game.nextRoundPrompt")}</p>
          <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 mb-8">
            {t("game.roundTransitionRound", { n: roundNumber })}
          </p>

          <button
            type="button"
            onClick={onComplete}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-amber-400/70 bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-4 text-base font-bold text-slate-900 shadow-[0_0_28px_rgba(251,191,36,0.35)] transition hover:from-amber-400 hover:to-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {t("game.nextRoundButton")}
            <ArrowRight className="h-5 w-5 shrink-0" />
          </button>
        </motion.div>

        {onLeaveToLobby && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="mt-8 flex justify-center px-4"
          >
            <button
              type="button"
              onClick={onLeaveToLobby}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-500/80 bg-slate-900/90 px-5 py-3 text-sm font-semibold text-slate-200 shadow-lg transition hover:border-red-500/60 hover:bg-red-950/50 hover:text-red-200"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {t("game.leaveBetweenHands")}
            </button>
          </motion.div>
        )}
      </div>

      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at center, rgba(251,191,36,0.1) 0%, transparent 70%)",
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
  );
}
