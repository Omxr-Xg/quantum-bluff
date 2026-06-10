import { useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { motion } from "motion/react";
import { SlotMachine } from "./SlotMachine";
import { Roulette } from "./Roulette";
import { CustomScrollArea } from "../components/CustomScrollArea";
import { SOLO_GAMES_BACK_PATH } from "../utils/soloGameNav";

export function MiniGames() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const game = searchParams.get("game");
  const isValidGame = game === "roulette" || game === "slots";

  useEffect(() => {
    if (!isValidGame) {
      navigate("/lobby?tab=minigames", { replace: true });
    }
  }, [isValidGame, navigate]);

  const backToSoloGames = useCallback(() => {
    navigate(SOLO_GAMES_BACK_PATH);
  }, [navigate]);

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
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden bg-[#020206]">
          <CustomScrollArea className="min-h-0 flex-1" contentClassName="overflow-x-hidden">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mx-auto w-full min-w-0"
            >
              <SlotMachine onBack={backToSoloGames} />
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
            <Roulette retroCasino backToMinigamesHub onBackToMinigamesHub={backToSoloGames} />
          </motion.div>
        </div>
      )}
    </div>
  );
}
