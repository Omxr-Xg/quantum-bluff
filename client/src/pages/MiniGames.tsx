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
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-28 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-purple-600/18 blur-[100px]" />
        <div className="absolute -left-20 top-1/3 h-64 w-64 rounded-full bg-cyan-500/8 blur-[85px]" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-fuchsia-500/12 blur-[95px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.06),transparent_58%),radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.05),transparent_55%)]" />
      </div>

      {game === "slots" && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-700/90 bg-slate-900/95 px-3 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:px-4">
            <button
              type="button"
              onClick={backToLobbyMinigames}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm transition hover:bg-slate-700 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("minigames.backToLobbyMinigamesTab")}
            </button>
            <h1 className="hidden bg-gradient-to-r from-purple-300 via-purple-200 to-cyan-200 bg-clip-text text-center text-sm font-bold tracking-wide text-transparent sm:block md:text-base">
              {t("slot.brandTitle")}
            </h1>
            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 text-sm font-bold tabular-nums text-green-400">
              <span className="truncate">{playerChips.toLocaleString()}</span>
              <ChipIcon size="sm" className="shrink-0 brightness-110" />
            </div>
          </header>
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
