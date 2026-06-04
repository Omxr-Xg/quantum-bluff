import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { useBeloteSocket } from "../features/belote/useBeloteSocket";
import { BeloteCasinoTable } from "../components/belote/BeloteCasinoTable";
import { BeloteActionBar } from "../components/belote/BeloteActionBar";
import { BeloteGameHud } from "../components/belote/BeloteGameHud";
import { BeloteGameEndOverlay } from "../components/belote/BeloteGameEndOverlay";
import { BlackjackLobbyBackdrop } from "../components/blackjack/BlackjackLobbyBackdrop";
import { QuitGameConfirmDialog } from "../components/QuitGameConfirmDialog";

export function BeloteGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("gameId");
  const { userId } = useUser();
  const { socket } = useSocket();
  const { state, ended, presentUserIds, turnTimeLeft, sendAction } = useBeloteSocket(gameId);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [acting, setActing] = useState(false);

  const handleAction = useCallback(
    (action: Record<string, unknown>) => {
      setActing(true);
      sendAction(action);
      window.setTimeout(() => setActing(false), 400);
    },
    [sendAction],
  );

  const confirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    if (gameId && socket) {
      socket.emit("LEAVE_BELOTE_GAME", { gameId });
    }
    navigate("/lobby?tab=belote");
  }, [gameId, socket, navigate]);

  if (!gameId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-gray-400">
        {t("belote.missingGame")}
      </div>
    );
  }

  const myTeam = state?.players.find((p) => p.userId === userId)?.team;
  const myPos = state?.players.find((p) => p.userId === userId)?.position;
  const turnPos =
    state?.phase === "PLAYING"
      ? state.deal.currentPlayerPosition
      : state?.biddingTurnPosition;
  const isMyTurn =
    myPos != null &&
    turnPos === myPos &&
    (state?.phase === "PLAYING" ||
      state?.phase === "BIDDING" ||
      state?.phase === "CONTREE_ROUND");

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden app-shell-bg">
      <BlackjackLobbyBackdrop />

      <QuitGameConfirmDialog
        open={showQuitConfirm}
        onCancel={() => setShowQuitConfirm(false)}
        onConfirm={confirmQuit}
      />

      {ended ? (
        <BeloteGameEndOverlay
          teamScoreA={ended.teamScoreA}
          teamScoreB={ended.teamScoreB}
          winningTeam={ended.winningTeam}
          myTeam={myTeam}
          onLobby={() => navigate("/lobby?tab=belote")}
        />
      ) : null}

      {!state || !userId ? (
        <div className="relative z-10 flex flex-1 items-center justify-center text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
          <BeloteGameHud
            state={state}
            myTeam={myTeam}
            turnTimeLeft={turnTimeLeft}
            isMyTurn={isMyTurn}
            onBack={() => setShowQuitConfirm(true)}
            onQuit={() => setShowQuitConfirm(true)}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <BeloteCasinoTable
              state={state}
              userId={userId}
              presentUserIds={presentUserIds}
              turnTimeLeft={turnTimeLeft}
            />
          </div>

          <div className="relative max-h-[min(38dvh,13.5rem)] shrink-0 overflow-y-auto overflow-x-hidden border-t border-white/10 bg-slate-950/95 px-2 py-1.5 shadow-[0_-8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md sm:max-h-[min(34dvh,12rem)] sm:px-3 sm:py-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
            <BeloteActionBar
              state={state}
              myUserId={userId}
              onAction={handleAction}
              disabled={acting}
            />
          </div>
        </div>
      )}
    </div>
  );
}
