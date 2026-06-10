import { useNavigate } from "react-router";
import { CrashGameView } from "../components/crash/CrashGameView";
import { useCrashRound } from "../features/crash/useCrashRound";
import { SOLO_GAMES_BACK_PATH } from "../utils/soloGameNav";

export function Crash() {
  const navigate = useNavigate();
  const game = useCrashRound();

  return (
    <CrashGameView
      phase={game.phase}
      multiplier={game.multiplier}
      crashPoint={game.crashPoint}
      bet={game.bet}
      autoCashout={game.autoCashout}
      balance={game.balance}
      history={game.history}
      cashedOutAt={game.cashedOutAt}
      cashoutProfit={game.cashoutProfit}
      acting={game.acting}
      insufficient={game.insufficient}
      canPlaceBet={game.canPlaceBet}
      hasBet={game.hasBet}
      isPlayerRound={game.isPlayerRound}
      countdown={game.countdown}
      canvasRef={game.canvasRef}
      onBack={() => navigate(SOLO_GAMES_BACK_PATH)}
      onBetChange={game.setBet}
      onAutoCashoutChange={game.setAutoCashout}
      onPlaceBet={game.placeBet}
      onCashout={() => void game.cashout()}
      onRelaunch={game.relaunch}
    />
  );
}
