import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { apiUrl } from "../utils/apiBase";
import {
  updateUserBalance,
  fetchBalanceFromServer,
  getUserBalance,
  BALANCE_CHANGED_EVENT,
} from "../utils/userProfile";
import {
  mergeGamificationFromServerResponse,
  getDisplayedBlackjackMaxBet,
  refreshGamificationFromServer,
  GAMIFICATION_CHANGED_EVENT,
} from "../utils/gamificationStorage";
import { BlackjackLobbyBackdrop } from "../components/blackjack/BlackjackLobbyBackdrop";
import {
  BlackjackMultiCasinoTable,
  handValueFromCards,
  type BjTableState,
} from "../components/blackjack/BlackjackMultiCasinoTable";
import {
  BlackjackRoundReveal,
  bjOutcomeKind,
  type BjRoundSummaryRow,
} from "../components/blackjack/BlackjackRoundReveal";
import { mapBlackjackRuntimeCodeToUi } from "../features/blackjack/runtimeStatus";

/** Same duration as `ROUND_REVEAL_MS` on the server before `finishHandAfterPayout`. */
const PAYOUT_TABLE_REVEAL_MS = 2000;

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function BlackjackMultiTable() {
  const { t } = useTranslation();
  const { gameId } = useParams<{ gameId: string }>();
  const [searchParams] = useSearchParams();
  const isSpectator = searchParams.get("spectate") === "1";
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { userId } = useUser();
  const { addToast } = useToast();

  const [state, setState] = useState<BjTableState | null>(null);
  const [hostId, setHostId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [betInput, setBetInput] = useState(10);
  const [acting, setActing] = useState(false);
  const [deletingTable, setDeletingTable] = useState(false);
  const [roundSummary, setRoundSummary] = useState<BjRoundSummaryRow[] | null>(null);
  const [runtimeBanner, setRuntimeBanner] = useState<string | null>(null);
  const [runtimeSeverity, setRuntimeSeverity] = useState<"info" | "warning" | "error">("info");
  const [runtimeDisableActions, setRuntimeDisableActions] = useState(false);
  const [showdownPhase, setShowdownPhase] = useState<"idle" | "table_reveal" | "results">("idle");
  const showdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playerChips, setPlayerChips] = useState(() => getUserBalance());
  const [bjMaxDisplay, setBjMaxDisplay] = useState(() => getDisplayedBlackjackMaxBet());

  const applyRuntimeCode = useCallback(
    (code?: string) => {
      const mapped = mapBlackjackRuntimeCodeToUi(code);
      if (!mapped) {
        setRuntimeBanner(null);
        setRuntimeDisableActions(false);
        setRuntimeSeverity("info");
        return;
      }
      const text = mapped.messageKey ? t(mapped.messageKey) : null;
      setRuntimeBanner(text);
      setRuntimeDisableActions(mapped.disableActions);
      setRuntimeSeverity(mapped.severity);
      if (code === "TABLE_LOCKED") {
        addToast(text ?? t("bjMulti.runtime.tableLocked"), "info");
      }
    },
    [addToast, t]
  );

  const mySeat = useMemo(
    () => state?.seats.find((s) => s.userId === userId) ?? null,
    [state, userId]
  );

  const myHandTotal = useMemo(() => {
    if (!mySeat?.cards.length) return null;
    if (typeof mySeat.handTotal === "number") return mySeat.handTotal;
    return handValueFromCards(mySeat.cards).total;
  }, [mySeat]);

  /** Résumé manche : priorité à l’état serveur (`payoutSummary`) pour toujours avoir les gains/pertes. */
  const effectiveRoundSummary = useMemo(() => {
    if (state?.phase !== "payout") return [];
    if (state.payoutSummary?.length) return state.payoutSummary;
    return roundSummary ?? [];
  }, [state?.phase, state?.payoutSummary, roundSummary]);

  const lastOutcomeToastHandRef = useRef<number | null>(null);

  const loadState = useCallback(async () => {
    if (!gameId) return;
    const res = await fetch(apiUrl(`/api/blackjack-tables/game/${gameId}/state`), {
      headers: authHeaders(),
    });
    if (res.status === 401) {
      navigate("/auth");
      return;
    }
    if (res.status === 410) {
      const body = (await res.json().catch(() => ({}))) as { code?: string };
      if (body.code === "TABLE_SESSION_RESET") {
        addToast(t("bjMulti.runtime.sessionReset"), "info");
      } else {
        addToast(t("bjMulti.tableGone"), "error");
      }
      navigate("/lobby?tab=blackjack");
      return;
    }
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { code?: string; error?: string };
      applyRuntimeCode(err.code);
      if (err.error) addToast(err.error, "error");
      return;
    }
    const data = (await res.json()) as {
      state: BjTableState;
      hostId: string;
    };
    applyRuntimeCode(undefined);
    setState(data.state);
    setHostId(data.hostId);
    setPlayerChips(getUserBalance());
  }, [gameId, navigate, addToast, t, applyRuntimeCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadState();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadState]);

  useEffect(() => {
    if (state && state.phase !== "payout") {
      setRoundSummary(null);
    }
  }, [state?.phase]);

  useEffect(() => {
    if (state?.phase === "betting") {
      setShowdownPhase("idle");
    }
  }, [state?.phase]);

  useEffect(() => {
    if (state?.phase !== "payout") {
      if (showdownTimerRef.current) {
        clearTimeout(showdownTimerRef.current);
        showdownTimerRef.current = null;
      }
      return;
    }
    if (!effectiveRoundSummary.length) return;

    setShowdownPhase("table_reveal");
    if (showdownTimerRef.current) clearTimeout(showdownTimerRef.current);
    showdownTimerRef.current = setTimeout(() => {
      showdownTimerRef.current = null;
      setShowdownPhase("results");
    }, PAYOUT_TABLE_REVEAL_MS);

    return () => {
      if (showdownTimerRef.current) {
        clearTimeout(showdownTimerRef.current);
        showdownTimerRef.current = null;
      }
    };
  }, [state?.phase, state?.handNumber, effectiveRoundSummary]);

  useEffect(() => {
    if (state?.phase !== "payout" || !userId || isSpectator || !effectiveRoundSummary.length) return;
    const row = effectiveRoundSummary.find((r) => r.userId === userId);
    if (!row) return;
    const h = state.handNumber;
    if (lastOutcomeToastHandRef.current === h) return;
    lastOutcomeToastHandRef.current = h;
    const kind = bjOutcomeKind(row.reason);
    if (kind === "win") addToast(t("bjMulti.toastYouWin", { chips: row.payout }), "success");
    else if (kind === "push") addToast(t("bjMulti.toastYouPush", { chips: row.payout }), "info");
    else addToast(t("bjMulti.toastYouLose"), "error");
  }, [state?.phase, state?.handNumber, effectiveRoundSummary, userId, isSpectator, addToast, t]);

  useEffect(() => {
    const onBalance = () => setPlayerChips(getUserBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, onBalance);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, onBalance);
  }, []);

  useEffect(() => {
    void refreshGamificationFromServer().then(() => setBjMaxDisplay(getDisplayedBlackjackMaxBet()));
  }, []);

  useEffect(() => {
    const sync = () => setBjMaxDisplay(getDisplayedBlackjackMaxBet());
    window.addEventListener(GAMIFICATION_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GAMIFICATION_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!socket || !gameId) return;
    socket.emit("JOIN_BLACKJACK_TABLE", { gameId });
    const onUpdate = (payload: {
      gameId: string;
      state: BjTableState;
      roundSummary?: BjRoundSummaryRow[];
    }) => {
      if (payload.gameId !== gameId) return;
      applyRuntimeCode(undefined);
      setState(payload.state);
      if (payload.roundSummary?.length) {
        setRoundSummary(payload.roundSummary);
      } else if (payload.state.phase !== "payout") {
        setRoundSummary(null);
      }
    };
    const onSocketError = (payload: {
      code?: string;
      message?: string;
      roomId?: string;
    }) => {
      if (!payload?.code) return;
      if (payload.code === "TABLE_SESSION_RESET") {
        addToast(t("bjMulti.runtime.sessionReset"), "info");
        navigate("/lobby?tab=blackjack");
        return;
      }
      applyRuntimeCode(payload.code);
      if (payload.message && payload.code !== "TABLE_LOCKED") {
        addToast(payload.message, "error");
      }
    };
    socket.on("BLACKJACK_TABLE_UPDATE", onUpdate);
    socket.on("ERROR", onSocketError);
    return () => {
      socket.off("BLACKJACK_TABLE_UPDATE", onUpdate);
      socket.off("ERROR", onSocketError);
    };
  }, [socket, gameId, addToast, applyRuntimeCode]);

  const postBet = async () => {
    if (!gameId || isSpectator) return;
    setActing(true);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/game/${gameId}/bet`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ bet: betInput }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        chips?: number;
        state?: BjTableState;
        settlements?: Array<Record<string, unknown>>;
        roundSummary?: BjRoundSummaryRow[];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        applyRuntimeCode(data.code);
        addToast(data.error ?? t("bjMulti.betFailed"), "error");
        return;
      }
      applyRuntimeCode(undefined);
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      if (data.state) setState(data.state);
      if (data.roundSummary?.length) setRoundSummary(data.roundSummary);
      if (data.settlements?.length) {
        for (const row of data.settlements) {
          mergeGamificationFromServerResponse(row);
        }
      }
      await fetchBalanceFromServer({ authoritative: true });
    } finally {
      setActing(false);
    }
  };

  const postDeal = async () => {
    if (!gameId || isSpectator) return;
    setActing(true);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/game/${gameId}/deal`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = (await res.json().catch(() => ({}))) as {
        state?: BjTableState;
        settlements?: Array<Record<string, unknown>>;
        roundSummary?: BjRoundSummaryRow[];
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        applyRuntimeCode(data.code);
        addToast(data.error ?? t("bjMulti.dealFailed"), "error");
        return;
      }
      applyRuntimeCode(undefined);
      if (data.state) setState(data.state);
      if (data.roundSummary?.length) setRoundSummary(data.roundSummary);
      if (data.settlements?.length) {
        for (const row of data.settlements) {
          mergeGamificationFromServerResponse(row);
        }
        await fetchBalanceFromServer({ authoritative: true });
      }
    } finally {
      setActing(false);
    }
  };

  const deleteTableAsHost = async () => {
    if (!state?.roomId || hostId !== userId) return;
    if (!window.confirm(t("bjMulti.deleteTableConfirm"))) return;
    setDeletingTable(true);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/${state.roomId}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const errBody = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        addToast(errBody.error ?? t("bjMulti.deleteTableFailed"), "error");
        return;
      }
      addToast(t("bjMulti.tableDeleted"), "success");
      navigate("/lobby?tab=blackjack");
    } finally {
      setDeletingTable(false);
    }
  };

  const postAction = async (action: "hit" | "stand" | "double") => {
    if (!gameId || isSpectator) return;
    setActing(true);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/game/${gameId}/action`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        state?: BjTableState;
        settlements?: Array<Record<string, unknown>>;
        roundSummary?: BjRoundSummaryRow[];
        chips?: number;
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        applyRuntimeCode(data.code);
        addToast(data.error ?? t("bjMulti.actionFailed"), "error");
        return;
      }
      applyRuntimeCode(undefined);
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      if (data.state) setState(data.state);
      if (data.roundSummary?.length) setRoundSummary(data.roundSummary);
      if (data.settlements?.length) {
        for (const row of data.settlements) {
          mergeGamificationFromServerResponse(row);
        }
      }
      await fetchBalanceFromServer({ authoritative: true });
    } finally {
      setActing(false);
    }
  };

  if (loading || !state) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#14080d]">
        <BlackjackLobbyBackdrop />
        {runtimeBanner ? (
          <div
            className={`absolute left-4 right-4 top-5 z-20 mx-auto max-w-3xl rounded-lg border px-4 py-3 text-sm ${
              runtimeSeverity === "error"
                ? "border-rose-500/60 bg-rose-950/40 text-rose-100"
                : runtimeSeverity === "warning"
                ? "border-amber-500/60 bg-amber-950/40 text-amber-100"
                : "border-sky-500/50 bg-sky-950/40 text-sky-100"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{runtimeBanner}</span>
              <button
                type="button"
                onClick={() => void loadState()}
                className="rounded-md border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-black/50"
              >
                Reessayer
              </button>
            </div>
          </div>
        ) : null}
        <Loader2 className="relative z-10 h-10 w-10 animate-spin text-rose-400" />
      </div>
    );
  }

  const isHost = hostId === userId;
  const allSeatsHaveBet =
    state.phase === "betting" &&
    state.seats.length > 0 &&
    state.seats.every((s) => s.playState === "bet_placed");
  const canBet =
    !runtimeDisableActions &&
    !isSpectator &&
    state.phase === "betting" &&
    mySeat?.playState === "no_bet";
  /** Distribution manuelle seulement si une mise existe mais pas tout le monde encore (ex. joueur AFK). */
  const canDeal =
    !runtimeDisableActions &&
    !isSpectator &&
    isHost &&
    state.phase === "betting" &&
    state.seats.some((s) => s.playState === "bet_placed") &&
    !allSeatsHaveBet;
  const myTurn =
    !runtimeDisableActions &&
    !isSpectator &&
    state.phase === "player_turn" &&
    state.currentSeatUserId === userId &&
    mySeat?.playState === "in_hand" &&
    (myHandTotal == null || myHandTotal < 21);
  const canDouble = myTurn && mySeat && mySeat.cards.length === 2 && !mySeat.doubled;

  const btnBase =
    "rounded-xl px-6 py-3 text-sm font-bold uppercase tracking-wide shadow-lg transition disabled:cursor-not-allowed disabled:opacity-45 sm:px-8 sm:text-base";

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-[#0a0608] pb-10">
      <BlackjackLobbyBackdrop />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pt-5 sm:pt-6">
        {runtimeBanner ? (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              runtimeSeverity === "error"
                ? "border-rose-500/60 bg-rose-950/40 text-rose-100"
                : runtimeSeverity === "warning"
                ? "border-amber-500/60 bg-amber-950/40 text-amber-100"
                : "border-sky-500/50 bg-sky-950/40 text-sky-100"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{runtimeBanner}</span>
              <button
                type="button"
                onClick={() => void loadState()}
                className="rounded-md border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-black/50"
              >
                Reessayer
              </button>
            </div>
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate("/lobby?tab=blackjack")}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm font-medium text-amber-100/90 backdrop-blur-sm transition hover:border-amber-400/40 hover:bg-black/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("bjMulti.backToLobby")}
          </button>
          <div className="flex flex-wrap items-center gap-2">
            {isHost && !isSpectator ? (
              <button
                type="button"
                disabled={deletingTable}
                onClick={() => void deleteTableAsHost()}
                className="inline-flex items-center gap-2 rounded-lg border border-rose-600/50 bg-rose-950/60 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-900/70 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {t("bjMulti.deleteTable")}
              </button>
            ) : null}
            {isSpectator ? (
              <span className="rounded-full border border-amber-500/50 bg-amber-950/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-amber-200 shadow-inner">
                {t("bjMulti.spectatorBadge")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <BlackjackMultiCasinoTable
        state={state}
        userId={userId ?? null}
        playerBalance={isSpectator ? null : playerChips}
        playerEffectiveMaxBet={bjMaxDisplay}
      >
        {!isSpectator ? (
          <div className="flex flex-col items-center gap-5">
            {canBet && (
              <div className="flex w-full max-w-md flex-col items-stretch gap-4 sm:flex-row sm:items-end sm:justify-center">
                <label className="flex flex-1 flex-col gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-amber-200/80 sm:text-left">
                  {t("bjMulti.yourBet")}
                  <input
                    type="number"
                    min={state.minBet}
                    max={bjMaxDisplay}
                    value={betInput}
                    onChange={(e) => setBetInput(Number(e.target.value))}
                    className="rounded-xl border-2 border-amber-700/50 bg-black/50 px-4 py-3 text-center font-mono text-lg text-white shadow-inner focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  />
                </label>
                <button
                  type="button"
                  disabled={runtimeDisableActions || acting}
                  onClick={postBet}
                  className={`${btnBase} w-full bg-gradient-to-b from-emerald-500 to-emerald-800 text-white shadow-emerald-950/50 hover:from-emerald-400 hover:to-emerald-700 sm:w-auto`}
                >
                  {t("bjMulti.placeBet")}
                </button>
              </div>
            )}
            {canDeal && (
              <button
                type="button"
                disabled={runtimeDisableActions || acting}
                onClick={postDeal}
                className={`${btnBase} w-full max-w-sm bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 text-slate-950 shadow-amber-950/40 hover:from-amber-300 hover:to-amber-800`}
              >
                {t("bjMulti.dealCards")}
              </button>
            )}
            {myTurn && (
              <div className="flex w-full max-w-lg flex-wrap justify-center gap-3">
                <button
                  type="button"
                  disabled={runtimeDisableActions || acting}
                  onClick={() => postAction("hit")}
                  className={`${btnBase} min-w-[7rem] bg-gradient-to-b from-sky-500 to-sky-900 text-white hover:from-sky-400`}
                >
                  {t("bjMulti.hit")}
                </button>
                <button
                  type="button"
                  disabled={runtimeDisableActions || acting}
                  onClick={() => postAction("stand")}
                  className={`${btnBase} min-w-[7rem] bg-gradient-to-b from-slate-600 to-slate-900 text-white hover:from-slate-500`}
                >
                  {t("bjMulti.stand")}
                </button>
                {canDouble && (
                  <button
                    type="button"
                    disabled={runtimeDisableActions || acting}
                    onClick={() => postAction("double")}
                    className={`${btnBase} min-w-[7rem] bg-gradient-to-b from-violet-500 to-violet-950 text-white hover:from-violet-400`}
                  >
                    {t("bjMulti.double")}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-amber-200/60">{t("bjMulti.spectatorHint")}</p>
        )}
      </BlackjackMultiCasinoTable>

      {showdownPhase === "table_reveal" ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[90] max-w-md -translate-x-1/2 rounded-full border border-amber-500/40 bg-black/75 px-6 py-3 text-center text-sm font-semibold text-amber-100 shadow-lg backdrop-blur-sm">
          {t("bjMulti.showdownRevealing")}
        </div>
      ) : null}

      {state.phase === "payout" && showdownPhase === "results" ? (
        <BlackjackRoundReveal state={state} roundSummary={effectiveRoundSummary} userId={userId ?? null} />
      ) : null}
    </div>
  );
}
