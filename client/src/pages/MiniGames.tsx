import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChipIcon } from "../components/ChipIcon";
import { SlotMachine } from "./SlotMachine";
import { Roulette } from "./Roulette";
import { getUserBalance, BALANCE_CHANGED_EVENT } from "../utils/userProfile";

export function MiniGames() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const game = searchParams.get("game");
  const isValidGame = game === "roulette" || game === "slots";

  const [playerChips, setPlayerChips] = useState(getUserBalance());

  useEffect(() => {
    if (!isValidGame) {
      navigate("/lobby?tab=minigames", { replace: true });
    }
  }, [isValidGame, navigate]);

  const backToLobbyMinigames = useCallback(() => {
    navigate("/lobby?tab=minigames");
  }, [navigate]);

  useEffect(() => {
    const syncBalance = () => setPlayerChips(getUserBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, []);

  if (!isValidGame) {
    return null;
  }

  return (
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {[...Array(18)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-yellow-500/25"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800)],
              x: [null, Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000)],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {game === "slots" && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-3 border-b border-amber-500/25 bg-slate-900/70 px-3 py-2.5 backdrop-blur-sm sm:px-4">
            <button
              type="button"
              onClick={backToLobbyMinigames}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("minigames.backToLobbyMinigamesTab")}
            </button>
            <div className="ml-auto flex items-center gap-2 text-sm font-bold text-amber-100">
              <ChipIcon size="sm" />
              <span className="tabular-nums">{playerChips.toLocaleString()}</span>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 pb-6 pt-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto w-full min-w-0 max-w-6xl"
            >
              <SlotMachine />
            </motion.div>
          </div>
        </div>
      )}

      {game === "roulette" && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            <Roulette backToMinigamesHub onBackToMinigamesHub={backToLobbyMinigames} />
          </motion.div>
        </div>
      )}
    </div>
  );
}
