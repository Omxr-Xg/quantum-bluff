import { useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, Loader2, LogOut } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { useBeloteSocket } from "../features/belote/useBeloteSocket";
import { BeloteCasinoTable } from "../components/belote/BeloteCasinoTable";
import { BeloteActionBar } from "../components/belote/BeloteActionBar";
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
  const isMyTurn = myPos != null && turnPos === myPos;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden app-shell-bg pt-[5.25rem]">
      <BlackjackLobbyBackdrop />

      <div className="relative z-20 flex shrink-0 items-center justify-between gap-3 px-4 pb-2 pt-1 sm:px-5">
        <button
          type="button"
          onClick={() => setShowQuitConfirm(true)}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-500/40 hover:bg-red-950/40 hover:text-red-100"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">{t("belote.backLobby")}</span>
        </button>
        {state ? (
          <div className="hidden text-center text-xs text-emerald-200/70 sm:block">
            {t("belote.targetLine", { score: state.targetScore })}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setShowQuitConfirm(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-500/50 hover:bg-red-950/50 hover:text-red-100"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>{t("nav.quitGame")}</span>
        </button>
      </div>

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
        <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-3">
          {isMyTurn && turnTimeLeft != null ? (
            <div className="pointer-events-none fixed bottom-28 left-1/2 z-[70] -translate-x-1/2">
              <div
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-bold shadow-lg backdrop-blur-sm ${
                  turnTimeLeft <= 5
                    ? "animate-pulse border border-red-500/50 bg-red-950/85 text-red-100"
                    : "border border-amber-400/40 bg-black/75 text-amber-100"
                }`}
              >
                <Clock className="h-5 w-5" />
                <span className="tabular-nums text-lg">{turnTimeLeft}s</span>
              </div>
            </div>
          ) : null}
          <BeloteCasinoTable
            state={state}
            userId={userId}
            presentUserIds={presentUserIds}
            turnTimeLeft={turnTimeLeft}
            rootClassName="min-h-0 flex-1"
          >
            <BeloteActionBar
              state={state}
              myUserId={userId}
              onAction={handleAction}
              disabled={acting}
            />
          </BeloteCasinoTable>
        </div>
      )}
    </div>
  );
}
