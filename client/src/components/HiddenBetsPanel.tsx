import {
  X,
  Trophy,
  GripVertical,
  DollarSign,
  Info,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDeviceType } from "./ui/use-mobile";
import { ChipIcon } from "./ChipIcon";
import {
  quoteHiddenBet,
  placeHiddenBet,
  fetchHiddenBetHistory,
  fetchHiddenBetTableHistory,
  type SelectionPayload,
  type HiddenBetMarketPhase,
} from "../api/hiddenBetsApi";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";

const CLASS_OPTIONS = [
  "HIGH_CARD",
  "PAIR",
  "TWO_PAIR",
  "THREE_OF_A_KIND",
  "STRAIGHT",
  "FLUSH",
  "QUANTUM_COMBI",
  "FULL_HOUSE",
  "FOUR_OF_A_KIND",
  "STRAIGHT_FLUSH",
] as const;

const RANK_OPTIONS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

type MarketModePre = "PLAYER_WINS" | "WINNING_HAND_CLASS" | "WINNING_HAND_CONTAINS_RANK";
type MarketModeLive =
  | "PLAYER_WINS_CURRENT_HAND"
  | "HAND_REACHES_SHOWDOWN"
  | "HAND_ENDS_BY_FOLD"
  | "FINAL_WINNING_HAND_CLASS";

type BetTab = "pre" | "live";

export type HiddenBetStatePayload = {
  currentHandId: string | null;
  nextHandId: string | null;
  windowOpen: boolean;
  windowType: "PRE_HAND" | "LIVE_FLOP" | "LIVE_TURN" | "LIVE_RIVER" | null;
  closesAt?: number;
};

interface HiddenBetsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  players: { id: string | number; name: string }[];
  gameId?: string | null;
  hiddenBetNextHandId?: string | null;
  hiddenBetWindowOpen?: boolean;
  hiddenBetState?: HiddenBetStatePayload | null;
}

export function HiddenBetsPanel({
  isOpen,
  onToggle,
  players,
  gameId,
  hiddenBetNextHandId,
  hiddenBetWindowOpen,
  hiddenBetState,
}: HiddenBetsPanelProps) {
  const { t } = useTranslation();
  const [betTab, setBetTab] = useState<BetTab>("pre");
  const [marketModePre, setMarketModePre] = useState<MarketModePre>("PLAYER_WINS");
  const [marketModeLive, setMarketModeLive] = useState<MarketModeLive>("PLAYER_WINS_CURRENT_HAND");
  const [playerId, setPlayerId] = useState("");
  const [classKey, setClassKey] = useState<string>("STRAIGHT");
  const [rank, setRank] = useState<string>("A");
  const [amount, setAmount] = useState(50);
  const [isPlacing, setIsPlacing] = useState(false);
  const [quoteOdds, setQuoteOdds] = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [potentialPayout, setPotentialPayout] = useState(0);
  const [quoteMeta, setQuoteMeta] = useState<{
    quoteHash: string;
    quoteExpiresAt: string;
    pricingVersion: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticketCount, setTicketCount] = useState(0);
  const [stakeTotal, setStakeTotal] = useState(0);

  type TableTicketRow = {
    id: string;
    status: string;
    userId?: string;
    user?: { username: string };
    stake?: number;
    quotedOdds?: number;
    potentialPayout?: number;
    stateSnapshotJson?: string | null;
    resolvedAt?: string | null;
    marketPhase?: string;
  };

  const [tableTickets, setTableTickets] = useState<TableTicketRow[]>([]);
  const [tableTicketsLoading, setTableTicketsLoading] = useState(false);
  const [tableTicketsError, setTableTicketsError] = useState<string | null>(null);
  const [pricingInfo, setPricingInfo] = useState<{
    ticketId: string;
    pricingBreakdown: unknown;
    pricingInputs: unknown;
  } | null>(null);

  const { socket } = useSocket();
  const { userId: currentUserId } = useUser();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const [position, setPosition] = useState({ x: 20, y: 96 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const livePhase: HiddenBetMarketPhase | null =
    hiddenBetState?.windowType === "LIVE_FLOP" ||
    hiddenBetState?.windowType === "LIVE_TURN" ||
    hiddenBetState?.windowType === "LIVE_RIVER"
      ? hiddenBetState.windowType
      : null;

  const inInterHandTransition =
    Boolean(
      gameId &&
        hiddenBetState?.windowOpen &&
        hiddenBetState?.windowType === "PRE_HAND" &&
        !hiddenBetState?.currentHandId
    );

  const loadHistory = useCallback(async () => {
    if (!gameId) return;
    try {
      const { tickets } = await fetchHiddenBetHistory(30);
      const list = (tickets ?? []) as { gameId?: string; stake?: number }[];
      const mine = list.filter((x) => x.gameId === gameId);
      setTicketCount(mine.length);
      setStakeTotal(mine.reduce((s, x) => s + (x.stake ?? 0), 0));
    } catch {
      /* ignore */
    }
  }, [gameId]);

  const loadTableTickets = useCallback(async () => {
    if (!gameId) return;
    setTableTicketsLoading(true);
    setTableTicketsError(null);
    try {
      const { tickets } = await fetchHiddenBetTableHistory(gameId, 100);
      const list = (tickets ?? []) as TableTicketRow[];
      // On n'affiche que les tickets "récents" pour coller à la transition entre deux mains.
      const cutoff = Date.now() - 15_000;
      setTableTickets(
        list.filter((tk) => {
          if (!tk.resolvedAt) return false;
          const ts = Date.parse(tk.resolvedAt);
          return Number.isFinite(ts) && ts >= cutoff;
        })
      );
    } catch (e) {
      setTableTicketsError((e as Error).message);
    } finally {
      setTableTicketsLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (isOpen && gameId) void loadHistory();
  }, [isOpen, gameId, loadHistory]);

  useEffect(() => {
    if (!isOpen) return;
    if (!inInterHandTransition) return;
    void loadTableTickets();
  }, [isOpen, inInterHandTransition, loadTableTickets]);

  useEffect(() => {
    if (!socket || !gameId) return;
    const onUpd = () => {
      void loadHistory();
      if (inInterHandTransition) void loadTableTickets();
    };
    socket.on("HIDDEN_BET_TICKET_UPDATED", onUpd);
    return () => {
      socket.off("HIDDEN_BET_TICKET_UPDATED", onUpd);
    };
  }, [socket, gameId, loadHistory, inInterHandTransition, loadTableTickets]);

  const buildSelectionPre = (): SelectionPayload => {
    if (marketModePre === "PLAYER_WINS") {
      return { marketType: "PLAYER_WINS", playerId: String(playerId) };
    }
    if (marketModePre === "WINNING_HAND_CLASS") {
      return { marketType: "WINNING_HAND_CLASS", class: classKey };
    }
    return { marketType: "WINNING_HAND_CONTAINS_RANK", rank };
  };

  const buildSelectionLive = (): SelectionPayload => {
    if (marketModeLive === "PLAYER_WINS_CURRENT_HAND") {
      return { marketType: "PLAYER_WINS_CURRENT_HAND", playerId: String(playerId) };
    }
    if (marketModeLive === "HAND_REACHES_SHOWDOWN") {
      return { marketType: "HAND_REACHES_SHOWDOWN" };
    }
    if (marketModeLive === "HAND_ENDS_BY_FOLD") {
      return { marketType: "HAND_ENDS_BY_FOLD" };
    }
    return { marketType: "FINAL_WINNING_HAND_CLASS", class: classKey };
  };

  useEffect(() => {
    if (!gameId) {
      setQuoteLoading(false);
      setQuoteOdds(null);
      setQuoteMeta(null);
      return;
    }

    const marketPhase: HiddenBetMarketPhase | null =
      betTab === "pre" ? "PRE_HAND" : livePhase;

    const targetHandId =
      betTab === "pre" ? hiddenBetNextHandId ?? null : hiddenBetState?.currentHandId ?? null;

    const windowOk =
      betTab === "pre"
        ? Boolean(hiddenBetWindowOpen && hiddenBetNextHandId)
        : Boolean(hiddenBetState?.windowOpen && livePhase && hiddenBetState?.currentHandId);

    if (!marketPhase || !targetHandId || !windowOk) {
      setQuoteLoading(false);
      setQuoteOdds(null);
      setQuoteMeta(null);
      return;
    }

    const sel = betTab === "pre" ? buildSelectionPre() : buildSelectionLive();
    if (betTab === "pre" && marketModePre === "PLAYER_WINS" && !playerId) {
      setQuoteLoading(false);
      setQuoteOdds(null);
      setQuoteMeta(null);
      return;
    }
    if (betTab === "live" && marketModeLive === "PLAYER_WINS_CURRENT_HAND" && !playerId) {
      setQuoteLoading(false);
      setQuoteOdds(null);
      setQuoteMeta(null);
      return;
    }

    let cancelled = false;
    setQuoteLoading(true);
    const run = async () => {
      try {
        const q = await quoteHiddenBet({
          gameId,
          marketPhase,
          targetHandId,
          combinator: "SINGLE",
          selections: [sel],
          stakePreview: amount,
        });
        if (cancelled) return;
        setQuoteOdds(q.quotedOdds);
        setPotentialPayout(q.potentialPayout);
        setQuoteMeta({
          quoteHash: q.quoteHash,
          quoteExpiresAt: q.quoteExpiresAt,
          pricingVersion: q.pricingVersion,
        });
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setQuoteOdds(null);
          setQuoteMeta(null);
          setError((e as Error).message);
        }
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
      setQuoteLoading(false);
    };
  }, [
    gameId,
    betTab,
    hiddenBetNextHandId,
    hiddenBetWindowOpen,
    hiddenBetState?.windowOpen,
    hiddenBetState?.currentHandId,
    livePhase,
    marketModePre,
    marketModeLive,
    playerId,
    classKey,
    rank,
    amount,
  ]);

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - position.x, y: clientY - position.y };
    e.preventDefault();

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const cx = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      setPosition({ x: cx - dragOffset.current.x, y: cy - dragOffset.current.y });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
  }, [position]);

  const handlePlaceBet = async () => {
    if (!gameId || !quoteMeta || !quoteOdds) return;
    const marketPhase: HiddenBetMarketPhase | null = betTab === "pre" ? "PRE_HAND" : livePhase;
    const targetHandId =
      betTab === "pre" ? hiddenBetNextHandId ?? null : hiddenBetState?.currentHandId ?? null;
    if (!marketPhase || !targetHandId) return;
    if (betTab === "pre" && marketModePre === "PLAYER_WINS" && !playerId) return;
    if (betTab === "live" && marketModeLive === "PLAYER_WINS_CURRENT_HAND" && !playerId) return;

    setIsPlacing(true);
    setError(null);
    try {
      const sel = betTab === "pre" ? buildSelectionPre() : buildSelectionLive();
      await placeHiddenBet({
        gameId,
        marketPhase,
        targetHandId,
        stake: amount,
        combinator: "SINGLE",
        selections: [sel],
        actionId: crypto.randomUUID(),
        quoteHash: quoteMeta.quoteHash,
        pricingVersion: quoteMeta.pricingVersion,
        quoteExpiresAt: quoteMeta.quoteExpiresAt,
      });
      await loadHistory();
      setAmount(50);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsPlacing(false);
    }
  };

  const panelClassName = isMobile
    ? "fixed z-[60] left-2 right-2 top-20 md:top-24 max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-yellow-500 shadow-2xl"
    : "fixed z-[60] w-80 md:w-96 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-yellow-500 shadow-2xl";

  const panelStyle = isMobile ? undefined : { left: position.x, top: position.y };

  const windowOkPre = Boolean(gameId && hiddenBetWindowOpen && hiddenBetNextHandId);
  const windowOkLive = Boolean(
    gameId && hiddenBetState?.windowOpen && livePhase && hiddenBetState?.currentHandId
  );
  const windowOk = betTab === "pre" ? windowOkPre : windowOkLive;

  const needsWinnerPre = betTab === "pre" && marketModePre === "PLAYER_WINS" && !playerId;
  const needsWinnerLive = betTab === "live" && marketModeLive === "PLAYER_WINS_CURRENT_HAND" && !playerId;
  const needsWinner = needsWinnerPre || needsWinnerLive;

  const placeDisabled =
    !windowOk ||
    isPlacing ||
    quoteLoading ||
    quoteOdds == null ||
    needsWinner;

  const placeDisabledHint = (() => {
    if (!gameId) {
      return t("hiddenBets.hintNoGameId", "Ouvre une partie cash en ligne (URL avec gameId).");
    }
    if (!windowOk) {
      if (betTab === "pre") {
        return t(
          "hiddenBets.hintWindowClosed",
          "Les paris « prochaine main » sont disponibles entre deux mains (fenêtre ouverte)."
        );
      }
      return t(
        "hiddenBets.hintLiveClosed",
        "Paris live : disponibles pendant FLOP/TURN/RIVER (la street doit être en cours)."
      );
    }
    if (needsWinner) return t("hiddenBets.hintPickWinner", "Choisis un joueur.");
    if (quoteLoading) return t("hiddenBets.hintQuoting", "Calcul de la cote…");
    if (quoteOdds == null && error) return null;
    if (quoteOdds == null)
      return t("hiddenBets.hintNoQuote", "Cote indisponible. Réessaie ou vérifie la connexion.");
    return null;
  })();

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25 }}
          className={panelClassName}
          style={panelStyle}
        >
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 touch-none"
                onMouseDown={onDragStart}
                onTouchStart={onDragStart}
              >
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white font-bold">{t("hiddenBets.title")}</h3>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-4 py-2 flex gap-2 border-b border-slate-700">
            <button
              type="button"
              onClick={() => setBetTab("pre")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                betTab === "pre" ? "bg-yellow-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              {t("hiddenBets.tabNextHand", "Prochaine main")}
            </button>
            <button
              type="button"
              onClick={() => setBetTab("live")}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
                betTab === "live" ? "bg-yellow-600 text-white" : "bg-slate-700 text-slate-300"
              }`}
            >
              {t("hiddenBets.tabLive", "Main en cours")}
            </button>
          </div>

          <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-700">
            {betTab === "pre" && windowOkPre && (
              <>
                {t("hiddenBets.nextHand", "Prochaine main")}: {hiddenBetNextHandId?.slice(0, 8)}…
              </>
            )}
            {betTab === "pre" && !windowOkPre && t("hiddenBets.preClosed", "Fenêtre prochaine main fermée.")}
            {betTab === "live" && livePhase && (
              <>
                {t("hiddenBets.live", "Live")} — {livePhase} — main{" "}
                {hiddenBetState?.currentHandId?.slice(0, 8)}…
              </>
            )}
            {betTab === "live" && !windowOkLive && t("hiddenBets.liveClosed", "Paris live indisponibles hors FLOP/TURN/RIVER.")}
          </div>

          {inInterHandTransition && (
            <div className="px-4 py-3 border-b border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>{t("hiddenBets.tableResolvedTitle", "Tickets résolus (table)")}</span>
                {tableTicketsLoading && <span>{t("hiddenBets.loading", "Chargement…")}</span>}
              </div>

              {tableTicketsError && (
                <p className="text-red-400 text-xs mb-2">{tableTicketsError}</p>
              )}

              {!tableTicketsLoading && tableTickets.length === 0 && (
                <p className="text-slate-400 text-xs">{t("hiddenBets.noTableTickets", "Aucun ticket résolu pour le moment.")}</p>
              )}

              {!tableTicketsLoading && tableTickets.length > 0 && (
                <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                  {tableTickets.map((tk) => {
                    const uname =
                      (tk.user?.username ?? tk.userId ?? "").toString() || t("game.unknown", "Inconnu");
                    const whoLabel =
                      currentUserId && tk.userId === currentUserId ? t("game.you", "Vous") : uname;
                    const odds =
                      typeof tk.quotedOdds === "number" ? tk.quotedOdds : null;

                    const status =
                      tk.status === "WON"
                        ? "GAGNÉ"
                        : tk.status === "VOID"
                          ? "ANNULÉ"
                          : "PERDU";

                    const statusClass =
                      tk.status === "WON"
                        ? "border-green-500/50 bg-green-900/20"
                        : tk.status === "LOST"
                          ? "border-red-500/40 bg-red-900/15"
                          : "border-slate-600 bg-slate-700/20";

                    return (
                      <div
                        key={tk.id}
                        className={`rounded-lg border px-3 py-2 ${statusClass}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs text-white font-semibold truncate">
                            {whoLabel}
                          </div>
                          <div className="text-[10px] text-slate-200">
                            {status}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-[11px] text-yellow-300 font-bold">
                            {odds != null ? `x${odds.toFixed(2)}` : "—"}
                          </div>
                          <button
                            type="button"
                            className="p-0.5 rounded hover:bg-white/10 text-slate-200"
                            aria-label={t("hiddenBets.oddsInfo", "Infos sur la cote")}
                            onClick={() => {
                              try {
                                const parsed = tk.stateSnapshotJson ? JSON.parse(tk.stateSnapshotJson) : null
                                setPricingInfo({
                                  ticketId: tk.id,
                                  pricingBreakdown: parsed?.pricingBreakdown ?? null,
                                  pricingInputs: parsed?.pricingInputs ?? null,
                                })
                              } catch {
                                setPricingInfo({
                                  ticketId: tk.id,
                                  pricingBreakdown: null,
                                  pricingInputs: null,
                                })
                              }
                            }}
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="px-4 py-3 bg-slate-700/30 border-b border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">{t("hiddenBets.inProgress")}</span>
              <span className="text-white font-bold">{ticketCount}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">{t("hiddenBets.totalWagered")}</span>
              <span className="text-yellow-400 font-bold">
                {stakeTotal}{" "}
                <ChipIcon size="sm" className="inline-block align-middle ml-0.5" />
              </span>
            </div>
          </div>

          <div className="p-4 border-b border-slate-700 space-y-2">
            <div className="text-gray-400 text-sm">{t("hiddenBets.marketType", "Marché")}</div>
            {betTab === "pre" && (
              <select
                value={marketModePre}
                onChange={(e) => setMarketModePre(e.target.value as MarketModePre)}
                className="w-full bg-slate-700 text-white rounded-lg p-2 text-sm"
              >
                <option value="PLAYER_WINS">{t("hiddenBets.winner")}</option>
                <option value="WINNING_HAND_CLASS">{t("hiddenBets.winningClass", "Classe main gagnante")}</option>
                <option value="WINNING_HAND_CONTAINS_RANK">{t("hiddenBets.containsRank", "Rang dans la main")}</option>
              </select>
            )}
            {betTab === "live" && (
              <select
                value={marketModeLive}
                onChange={(e) => setMarketModeLive(e.target.value as MarketModeLive)}
                className="w-full bg-slate-700 text-white rounded-lg p-2 text-sm"
              >
                <option value="PLAYER_WINS_CURRENT_HAND">{t("hiddenBets.winnerCurrent", "Gagnant (main en cours)")}</option>
                <option value="HAND_REACHES_SHOWDOWN">Showdown</option>
                <option value="HAND_ENDS_BY_FOLD">{t("hiddenBets.endsByFold", "Fin par fold")}</option>
                <option value="FINAL_WINNING_HAND_CLASS">{t("hiddenBets.finalClass", "Classe finale")}</option>
              </select>
            )}
          </div>

          <div className="p-4 border-b border-slate-700 space-y-2">
            {betTab === "pre" && marketModePre === "PLAYER_WINS" && (
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-2 text-sm"
              >
                <option value="">{t("hiddenBets.chooseWinner")}</option>
                {players.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            {betTab === "live" && marketModeLive === "PLAYER_WINS_CURRENT_HAND" && (
              <select
                value={playerId}
                onChange={(e) => setPlayerId(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-2 text-sm"
              >
                <option value="">{t("hiddenBets.chooseWinner")}</option>
                {players.map((p) => (
                  <option key={String(p.id)} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            {((betTab === "pre" && marketModePre === "WINNING_HAND_CLASS") ||
              (betTab === "live" && marketModeLive === "FINAL_WINNING_HAND_CLASS")) && (
              <select
                value={classKey}
                onChange={(e) => setClassKey(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-2 text-sm"
              >
                {CLASS_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            {betTab === "pre" && marketModePre === "WINNING_HAND_CONTAINS_RANK" && (
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full bg-slate-700 text-white rounded-lg p-2 text-sm"
              >
                {RANK_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="p-4 border-b border-slate-700">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="text-gray-400 text-xs mb-2">{t("hiddenBets.amount")}</div>
                <div className="flex items-center bg-slate-700 rounded-lg overflow-hidden">
                  <DollarSign className="w-5 h-5 text-gray-400 ml-3" />
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        Math.min(10000, Math.max(10, parseInt(e.target.value, 10) || 0))
                      )
                    }
                    className="w-full bg-transparent text-white p-2 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-gray-400 text-xs mb-2">{t("hiddenBets.odds")}</div>
                <div className="bg-slate-700 rounded-lg p-2 text-center">
                  <span className="text-yellow-400 font-bold">
                    x{quoteOdds != null ? quoteOdds.toFixed(2) : "—"}
                  </span>
                </div>
              </div>
            </div>
            {quoteOdds != null && (
              <div className="mt-3 text-sm">
                <span className="text-gray-400">{t("hiddenBets.potentialGain")}</span>
                <span className="text-green-400 font-bold ml-2">
                  {potentialPayout}{" "}
                  <ChipIcon size="sm" className="inline-block align-middle" />
                </span>
              </div>
            )}
            {error && !quoteLoading && <p className="text-red-400 text-xs mt-2">{error}</p>}
          </div>

          <div className="p-4">
            <button
              type="button"
              onClick={() => void handlePlaceBet()}
              disabled={placeDisabled}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                !placeDisabled
                  ? "bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white shadow-lg"
                  : "bg-slate-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isPlacing ? t("hiddenBets.placing") : t("hiddenBets.placeBet")}
            </button>
            {placeDisabled && placeDisabledHint && (
              <p className="text-slate-400 text-xs mt-2 text-center leading-snug">{placeDisabledHint}</p>
            )}
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {pricingInfo && (
      <div
        className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={() => setPricingInfo(null)}
      >
        <div
          className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-yellow-500 shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-4 border-b border-slate-700 flex items-center justify-between gap-3">
            <div className="text-white text-sm font-semibold">
              {t("hiddenBets.oddsInfoTitle", "Calcul exact de la cote")}
            </div>
            <button
              type="button"
              className="text-slate-200 hover:text-white bg-white/10 hover:bg-white/15 rounded px-2 py-1 text-xs"
              onClick={() => setPricingInfo(null)}
            >
              {t("hiddenBets.close", "Fermer")}
            </button>
          </div>
          <div className="p-4 text-xs text-slate-200">
            <div className="mb-3 text-slate-400">
              Ticket: <span className="text-slate-100 font-mono">{pricingInfo.ticketId}</span>
            </div>
            <div className="mb-4">
              <div className="text-slate-400 mb-2">
                {t("hiddenBets.pricingBreakdown", "Détail pricing")}
              </div>
              <pre className="bg-slate-950/40 border border-slate-700 rounded p-3 whitespace-pre-wrap break-words">
                {pricingInfo.pricingBreakdown != null
                  ? JSON.stringify(pricingInfo.pricingBreakdown, null, 2)
                  : t("hiddenBets.noPricingInfo", "Détail non disponible pour ce ticket.")}
              </pre>
            </div>
            {pricingInfo.pricingInputs != null && (
              <div>
                <div className="text-slate-400 mb-2">
                  {t("hiddenBets.pricingInputs", "Inputs pricing")}
                </div>
                <pre className="bg-slate-950/40 border border-slate-700 rounded p-3 whitespace-pre-wrap break-words">
                  {JSON.stringify(pricingInfo.pricingInputs, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
}
