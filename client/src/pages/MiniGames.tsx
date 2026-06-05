import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ChipIcon } from "../components/ChipIcon";
import { SlotMachine } from "./SlotMachine";
import { Roulette } from "./Roulette";
import { getUserBalance, BALANCE_CHANGED_EVENT } from "../utils/userProfile";
import { CustomScrollArea } from "../components/CustomScrollArea";

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

  const backToRetroCasino = useCallback(() => {
    navigate("/minigames/retro-casino");
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
    <div className="relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[#020716]">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.23),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_42%,rgba(245,158,11,0.08),transparent_48%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-950/38 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-700/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-amber-700/8 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.26) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.55),transparent_58%)]" />
      </div>

      {game === "slots" && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-[#140a08]">
          <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a100c] via-[#140a08] to-[#0c0604]" />
            <div
              className="absolute inset-0 opacity-[0.1]"
              style={{
                backgroundImage:
                  "linear-gradient(135deg,rgba(154,52,18,0.2)_25%,transparent_25%,transparent_50%,rgba(154,52,18,0.2)_50%,rgba(154,52,18,0.2)_75%,transparent_75%)",
                backgroundSize: "20px 20px",
              }}
            />
          </div>
          <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b-2 border-amber-800/40 bg-[#1a100c]/90 px-3 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.4)] sm:px-4">
            <button
              type="button"
              onClick={() => navigate("/minigames/retro-casino")}
              className="inline-flex items-center gap-2 rounded-sm border-2 border-amber-800/45 bg-stone-950/70 px-3 py-2 text-sm font-bold uppercase tracking-wide text-amber-100 transition hover:border-amber-600/55 hover:bg-amber-950/50"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("minigames.retroCasinoBack")}
            </button>
            <h1 className="hidden min-w-0 flex-1 items-center justify-center sm:flex">
              <span
                className="truncate bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text font-serif text-lg font-black uppercase tracking-[0.2em] text-transparent md:text-xl"
              >
                {t("slot.brandTitle")}
              </span>
            </h1>
            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 rounded-sm border-2 border-amber-700/40 bg-stone-950/75 px-3 py-1.5 text-sm font-bold tabular-nums text-amber-200">
              <span className="truncate">{playerChips.toLocaleString()}</span>
              <ChipIcon size="sm" className="shrink-0 brightness-110" />
            </div>
          </header>
          <CustomScrollArea className="min-h-0 flex-1" contentClassName="overflow-x-hidden px-2 pb-6 pt-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto w-full min-w-0"
            >
              <SlotMachine />
            </motion.div>
          </CustomScrollArea>
        </div>
      )}

      {game === "roulette" && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-[#140a08]">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
          >
            <Roulette retroCasino backToMinigamesHub onBackToMinigamesHub={backToRetroCasino} />
          </motion.div>
        </div>
      )}
    </div>
  );
}
