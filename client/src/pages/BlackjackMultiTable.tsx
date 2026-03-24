import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { apiUrl } from "../utils/apiBase";
import { updateUserBalance, fetchBalanceFromServer } from "../utils/userProfile";
import { mergeGamificationFromServerResponse } from "../utils/gamificationStorage";

type BjPhase = "betting" | "player_turn" | "dealer" | "payout";

type BjCard = { rank: string; suit: string };

interface BjSeatPublic {
  userId: string;
  username: string;
  position: number;
  cards: BjCard[];
  bet: number;
  totalBet: number;
  doubled: boolean;
  playState: string;
  isCurrentTurn: boolean;
  handTotal?: number;
}

interface BjTableState {
  gameId: string;
  roomId: string;
  phase: BjPhase;
  handNumber: number;
  minBet: number;
  dealerCards: BjCard[];
  dealerHoleHidden: boolean;
  seats: BjSeatPublic[];
  currentSeatUserId: string | null;
}

function suitSymbol(s: string): string {
  switch (s) {
    case "h":
      return "♥";
    case "d":
      return "♦";
    case "c":
      return "♣";
    case "s":
      return "♠";
    default:
      return s;
  }
}

function suitColor(s: string): string {
  return s === "h" || s === "d" ? "text-rose-600" : "text-slate-900";
}

function CardFace({ card, hidden }: { card?: BjCard; hidden?: boolean }) {
  if (hidden || !card || card.suit === "?") {
    return (
      <div className="flex h-16 w-11 shrink-0 items-center justify-center rounded-md border-2 border-rose-900/60 bg-gradient-to-br from-rose-900 to-slate-900 shadow md:h-20 md:w-14">
        <span className="text-[10px] font-bold text-rose-300/50">?</span>
      </div>
    );
  }
  return (
    <div className="flex h-16 w-11 shrink-0 flex-col justify-between rounded-md border-2 border-white/90 bg-white p-1 shadow md:h-20 md:w-14">
      <div className={`text-[10px] font-bold leading-none ${suitColor(card.suit)}`}>
        {card.rank}
        <span className="ml-0.5">{suitSymbol(card.suit)}</span>
      </div>
      <div className={`text-center text-lg ${suitColor(card.suit)}`}>{suitSymbol(card.suit)}</div>
      <div className={`text-right text-[10px] font-bold leading-none ${suitColor(card.suit)}`}>
        {card.rank}
        <span className="ml-0.5">{suitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}

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

  const mySeat = useMemo(
    () => state?.seats.find((s) => s.userId === userId) ?? null,
    [state, userId]
  );

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
      addToast(t("bjMulti.tableGone"), "error");
      navigate("/blackjack/lobby");
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as {
      state: BjTableState;
      hostId: string;
    };
    setState(data.state);
    setHostId(data.hostId);
  }, [gameId, navigate, addToast, t]);

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
    if (!socket || !gameId) return;
    socket.emit("JOIN_BLACKJACK_TABLE", { gameId });
    const onUpdate = (payload: { gameId: string; state: BjTableState }) => {
      if (payload.gameId !== gameId) return;
      setState(payload.state);
    };
    socket.on("BLACKJACK_TABLE_UPDATE", onUpdate);
    return () => {
      socket.off("BLACKJACK_TABLE_UPDATE", onUpdate);
    };
  }, [socket, gameId]);

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
        error?: string;
        code?: string;
      };
      if (!res.ok) {
        addToast(data.error ?? t("bjMulti.betFailed"), "error");
        return;
      }
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      if (data.state) setState(data.state);
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
        error?: string;
      };
      if (!res.ok) {
        addToast(data.error ?? t("bjMulti.dealFailed"), "error");
        return;
      }
      if (data.state) setState(data.state);
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
        chips?: number;
        error?: string;
      };
      if (!res.ok) {
        addToast(data.error ?? t("bjMulti.actionFailed"), "error");
        return;
      }
      if (typeof data.chips === "number") updateUserBalance(data.chips);
      if (data.state) setState(data.state);
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

  if (loading || !state) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-rose-200">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const isHost = hostId === userId;
  const canBet = !isSpectator && state.phase === "betting" && mySeat?.playState === "no_bet";
  const canDeal =
    !isSpectator && isHost && state.phase === "betting" && state.seats.some((s) => s.playState === "bet_placed");
  const myTurn =
    !isSpectator && state.phase === "player_turn" && state.currentSeatUserId === userId && mySeat?.playState === "in_hand";
  const canDouble = myTurn && mySeat && mySeat.cards.length === 2 && !mySeat.doubled;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate("/blackjack/lobby")}
          className="inline-flex items-center gap-2 text-rose-300 hover:text-rose-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("bjMulti.backToLobby")}
        </button>
        {isSpectator && (
          <span className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-amber-200">
            {t("bjMulti.spectatorBadge")}
          </span>
        )}
      </div>

      <div className="text-center">
        <p className="text-xs uppercase tracking-widest text-slate-500">{t("bjMulti.phase")}</p>
        <p className="text-lg font-bold text-rose-100">{state.phase}</p>
        <p className="text-sm text-slate-400">
          {t("bjMulti.handLabel", { n: state.handNumber })} · {t("bjMulti.minBetLabel")} {state.minBet}
        </p>
      </div>

      <div className="rounded-2xl border border-rose-500/30 bg-slate-800/90 p-6">
        <h2 className="mb-3 text-center text-sm font-semibold text-slate-400">{t("bjMulti.dealer")}</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {state.dealerCards.map((c, i) => (
            <CardFace
              key={`d-${i}-${c.rank}-${c.suit}`}
              card={c}
              hidden={state.dealerHoleHidden && i === 1}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.seats
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((s) => (
            <div
              key={s.userId}
              className={`rounded-xl border p-4 ${
                s.isCurrentTurn ? "border-amber-400 bg-amber-950/30" : "border-slate-600 bg-slate-900/60"
              }`}
            >
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{s.username}</span>
                {s.userId === userId && <span className="text-rose-300">{t("bjMulti.you")}</span>}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {t("bjMulti.seatBet", { bet: s.bet, total: s.totalBet })} · {s.playState}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {s.cards.map((c, i) => (
                  <CardFace key={`${s.userId}-${i}`} card={c} />
                ))}
              </div>
            </div>
          ))}
      </div>

      {!isSpectator && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-600 bg-slate-900/50 p-6">
          {canBet && (
            <div className="flex flex-wrap items-end justify-center gap-3">
              <label className="text-sm text-slate-300">
                {t("bjMulti.yourBet")}
                <input
                  type="number"
                  min={state.minBet}
                  value={betInput}
                  onChange={(e) => setBetInput(Number(e.target.value))}
                  className="ml-2 w-28 rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-white"
                />
              </label>
              <button
                type="button"
                disabled={acting}
                onClick={postBet}
                className="rounded-xl bg-rose-600 px-6 py-2 font-bold hover:bg-rose-500 disabled:opacity-50"
              >
                {t("bjMulti.placeBet")}
              </button>
            </div>
          )}
          {canDeal && (
            <button
              type="button"
              disabled={acting}
              onClick={postDeal}
              className="rounded-xl bg-emerald-600 px-8 py-3 font-bold hover:bg-emerald-500 disabled:opacity-50"
            >
              {t("bjMulti.dealCards")}
            </button>
          )}
          {myTurn && (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                disabled={acting}
                onClick={() => postAction("hit")}
                className="rounded-xl bg-amber-500 px-5 py-2 font-bold text-slate-900 hover:bg-amber-400 disabled:opacity-50"
              >
                {t("bjMulti.hit")}
              </button>
              <button
                type="button"
                disabled={acting}
                onClick={() => postAction("stand")}
                className="rounded-xl bg-slate-600 px-5 py-2 font-bold hover:bg-slate-500 disabled:opacity-50"
              >
                {t("bjMulti.stand")}
              </button>
              {canDouble && (
                <button
                  type="button"
                  disabled={acting}
                  onClick={() => postAction("double")}
                  className="rounded-xl bg-violet-600 px-5 py-2 font-bold hover:bg-violet-500 disabled:opacity-50"
                >
                  {t("bjMulti.double")}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
