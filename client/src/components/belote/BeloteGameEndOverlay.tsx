import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Trophy } from "lucide-react";
import { NeonButton } from "../NeonButton";

export function BeloteGameEndOverlay({
  teamScoreA,
  teamScoreB,
  winningTeam,
  myTeam,
  potTotal,
  payoutPerWinner,
  chipsWon,
  onLobby,
}: {
  teamScoreA: number;
  teamScoreB: number;
  winningTeam: string;
  myTeam?: string;
  potTotal?: number;
  payoutPerWinner?: number;
  chipsWon?: number;
  onLobby: () => void;
}) {
  const { t } = useTranslation();
  const won = myTeam != null && myTeam === winningTeam;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
    >
      <motion.div
        initial={{ scale: 0.92, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl"
      >
        <div className="h-1 bg-gradient-to-r from-emerald-600 via-amber-500/60 to-emerald-600" />
        <div className="p-8 text-center text-white">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              won ? "bg-amber-500/20 text-amber-300" : "bg-slate-700/50 text-slate-300"
            }`}
          >
            <Trophy className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            {won ? t("belote.youWon") : t("belote.gameOver")}
          </h1>
          <p className="mb-1 text-emerald-200/80">
            {t("belote.finalScore", { a: teamScoreA, b: teamScoreB })}
          </p>
          <p className="mb-2 text-lg font-semibold text-amber-200">
            {t("belote.winnerTeam", { team: winningTeam })}
          </p>
          {potTotal != null && potTotal > 0 ? (
            <p className="mb-2 text-sm text-emerald-200/80">
              {t("belote.potTotal", { amount: potTotal })}
            </p>
          ) : null}
          {won && (chipsWon ?? payoutPerWinner) != null && (chipsWon ?? payoutPerWinner)! > 0 ? (
            <p className="mb-6 text-base font-semibold text-amber-300">
              {t("belote.youWonChips", { amount: chipsWon ?? payoutPerWinner ?? 0 })}
            </p>
          ) : !won && potTotal != null && potTotal > 0 ? (
            <p className="mb-6 text-sm text-slate-400">{t("belote.buyInLost")}</p>
          ) : (
            <p className="mb-6" />
          )}
          <NeonButton variant="green" className="w-full px-8 py-4" onClick={onLobby}>
            {t("belote.backLobby")}
          </NeonButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
