import { useCallback, useEffect, useRef, useState } from "react";
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
import { useTableVoiceChat } from "../features/voice/useTableVoiceChat";
import { TableVoicePanel } from "../features/voice/TableVoicePanel";
import { trackEvent } from "../utils/analytics";

export function BeloteGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("gameId");
  const isSpectating = searchParams.get("spectate") === "1";
  const { userId } = useUser();
  const { socket } = useSocket();
  const { state, ended, presentUserIds, turnTimeLeft, botThinkingId, sendAction } = useBeloteSocket(gameId, {
    spectate: isSpectating,
  });
  const mySettlement = ended?.settlements?.find((s) => s.userId === userId);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [acting, setActing] = useState(false);
  const voiceEnabled = Boolean(gameId && userId && state && !isSpectating && !ended);
  const voice = useTableVoiceChat(gameId, userId, socket, voiceEnabled);
  const trackedBeloteRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameId || isSpectating || !state || trackedBeloteRef.current === gameId) return;
    trackedBeloteRef.current = gameId;
    trackEvent("play_belote");
  }, [gameId, isSpectating, state]);

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
      state?.phase === "CONTREE_ROUND" ||
      state?.phase === "CLASSIQUE_TAKE" ||
      state?.phase === "CLASSIQUE_CHOOSE");

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
          potTotal={ended.potTotal}
          payoutPerWinner={ended.payoutPerWinner}
          chipsWon={mySettlement?.chipsAwarded}
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
              speakingUserIds={voice.speakingUserIds}
              botThinkingId={botThinkingId}
            />
            {!isSpectating ? (
              <div className="pointer-events-auto absolute bottom-[max(5.5rem,18%)] right-2 z-30 w-[min(100%,14rem)] sm:right-4">
                <TableVoicePanel
                  voice={voice}
                  myUserId={userId}
                  channelLabel={voice.channelLabel}
                  tablePlayers={state.players.map((p) => ({
                    userId: p.userId,
                    username: p.username,
                  }))}
                />
              </div>
            ) : null}
          </div>

          {isSpectating ? (
            <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-3 py-2.5 text-center backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
                {t("game.spectatorBadge")}
              </p>
              <p className="mt-1 text-[11px] text-emerald-200/65">{t("belote.spectatorHint")}</p>
            </div>
          ) : (
            <div className="relative max-h-[min(46dvh,18rem)] shrink-0 overflow-y-auto overflow-x-visible border-t border-white/10 bg-slate-950/95 px-2 py-1.5 shadow-[0_-8px_28px_rgba(0,0,0,0.45)] backdrop-blur-md sm:px-3 sm:py-2 pb-[max(0.35rem,env(safe-area-inset-bottom))]">
              <BeloteActionBar
                state={state}
                myUserId={userId}
                onAction={handleAction}
                disabled={acting}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
