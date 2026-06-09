import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { History, Loader2 } from "lucide-react";
import { HandActionLogPanel } from "../components/HandActionLogPanel";
import { useBeloteActionLog } from "../features/belote/useBeloteActionLog";
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
import { useTableTheme } from "../contexts/TableThemeContext";

export function BeloteGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("gameId");
  const isSpectating = searchParams.get("spectate") === "1";
  const { userId } = useUser();
  const { socket } = useSocket();
  const { state, ended, loadError, presentUserIds, turnTimeLeft, botThinkingId, sendAction } =
    useBeloteSocket(gameId, {
      spectate: isSpectating,
    });
  const mySettlement = ended?.settlements?.find((s) => s.userId === userId);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [acting, setActing] = useState(false);
  const voiceEnabled = Boolean(gameId && userId && state && !isSpectating && !ended);
  const voice = useTableVoiceChat(gameId, userId, socket, voiceEnabled);
  const trackedBeloteRef = useRef<string | null>(null);
  const actionLog = useBeloteActionLog(gameId, state, userId ?? undefined);
  const { setSessionTableVisuals } = useTableTheme();

  useEffect(() => {
    if (!state?.tableVisuals) return;
    const tv = state.tableVisuals;
    setSessionTableVisuals({
      feltThemeId: tv.feltThemeId,
      feltCustomColor: tv.feltCustomColor ?? null,
      feltBackgroundId: tv.feltBackgroundId,
      feltBackgroundUrl: tv.feltBackgroundUrl ?? null,
    });
  }, [state?.tableVisuals, setSessionTableVisuals]);

  useEffect(() => {
    return () => setSessionTableVisuals(null);
  }, [gameId, setSessionTableVisuals]);

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

  const leaveToLobby = useCallback(() => {
    if (gameId && socket) {
      socket.emit("LEAVE_BELOTE_GAME", { gameId });
    }
    navigate("/lobby?tab=belote");
  }, [gameId, socket, navigate]);

  const confirmQuit = useCallback(() => {
    setShowQuitConfirm(false);
    leaveToLobby();
  }, [leaveToLobby]);

  if (!gameId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8 text-center text-gray-400">
        {t("belote.missingGame")}
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="relative flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
        <BlackjackLobbyBackdrop />
        <p className="relative z-10 text-red-300/90">{loadError}</p>
        <button
          type="button"
          onClick={leaveToLobby}
          className="relative z-10 rounded-xl border border-emerald-500/40 bg-emerald-950/80 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-900/90"
        >
          {t("belote.backLobby")}
        </button>
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
            isSpectating={isSpectating}
            onBack={() => (isSpectating ? leaveToLobby() : setShowQuitConfirm(true))}
            onQuit={() => (isSpectating ? leaveToLobby() : setShowQuitConfirm(true))}
          />

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <BeloteCasinoTable
              state={state}
              userId={userId}
              viewAnchorPosition={isSpectating ? 0 : undefined}
              presentUserIds={presentUserIds}
              turnTimeLeft={turnTimeLeft}
              speakingUserIds={voice.speakingUserIds}
              botThinkingId={botThinkingId}
            />
          </div>

          <HandActionLogPanel
            entries={actionLog.entries}
            open={actionLog.open}
            onOpenChange={actionLog.setOpen}
            titleKey="belote.actionLogTitle"
            emptyKey="belote.actionLogEmpty"
          />

          {state && !ended ? (
            <button
              type="button"
              onClick={() => actionLog.setOpen((open) => !open)}
              title={
                actionLog.open
                  ? t("hiddenBets.hideHistory", "Masquer l'historique")
                  : t("hiddenBets.showHistory", "Afficher l'historique")
              }
              aria-label={
                actionLog.open
                  ? t("hiddenBets.hideHistory", "Masquer l'historique")
                  : t("hiddenBets.showHistory", "Afficher l'historique")
              }
              aria-expanded={actionLog.open}
              className={`fixed bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] left-4 z-[90] flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-400 bg-slate-950/90 text-amber-100 shadow-[0_0_14px_rgba(245,158,11,0.55),0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:bg-amber-500 hover:text-slate-950 sm:left-6 ${
                actionLog.open ? "ring-2 ring-amber-200/70" : ""
              }`}
            >
              <History className="h-5 w-5" aria-hidden />
            </button>
          ) : null}

          {!isSpectating && voiceEnabled && userId && gameId ? (
            <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 z-[90] sm:left-6">
              <TableVoicePanel
                layout="room"
                panelHideMs={1000}
                voice={voice}
                myUserId={userId}
                channelLabel={voice.channelLabel}
                tablePlayers={state.players
                  .filter((p) => !p.isBot)
                  .map((p) => ({
                    userId: p.userId,
                    username: p.username,
                  }))}
              />
            </div>
          ) : null}

          {isSpectating ? (
            <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-3 py-3 text-center backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/90">
                {t("game.spectatorBadge")}
              </p>
              <p className="mt-1 text-[11px] text-emerald-200/65">{t("belote.spectatorHint")}</p>
              <button
                type="button"
                onClick={leaveToLobby}
                className="mt-2 rounded-lg border border-white/15 bg-slate-800/90 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
              >
                {t("belote.backLobby")}
              </button>
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
