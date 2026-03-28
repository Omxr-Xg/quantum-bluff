import {
  X,
  Trophy,
  GripVertical,
  DollarSign,
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
  type SelectionPayload,
} from "../api/hiddenBetsApi";
import { useSocket } from "../hooks/useSocket";

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

type MarketMode = "PLAYER_WINS" | "WINNING_HAND_CLASS" | "WINNING_HAND_CONTAINS_RANK";

interface HiddenBetsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  players: { id: string | number; name: string }[];
  /** Partie cash en ligne uniquement */
  gameId?: string | null;
  hiddenBetNextHandId?: string | null;
  hiddenBetWindowOpen?: boolean;
}

export function HiddenBetsPanel({
  isOpen,
  onToggle,
  players,
  gameId,
  hiddenBetNextHandId,
  hiddenBetWindowOpen,
}: HiddenBetsPanelProps) {
  const { t } = useTranslation();
  const [marketMode, setMarketMode] = useState<MarketMode>("PLAYER_WINS");
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

  const { socket } = useSocket();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const [position, setPosition] = useState({ x: 20, y: 96 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

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

  useEffect(() => {
    if (isOpen && gameId) void loadHistory();
  }, [isOpen, gameId, loadHistory]);

  useEffect(() => {
    if (!socket || !gameId) return;
    const onUpd = () => {
      void loadHistory();
    };
    socket.on("HIDDEN_BET_TICKET_UPDATED", onUpd);
    return () => {
      socket.off("HIDDEN_BET_TICKET_UPDATED", onUpd);
    };
  }, [socket, gameId, loadHistory]);

  const buildSelection = (): SelectionPayload => {
    if (marketMode === "PLAYER_WINS") {
      return { marketType: "PLAYER_WINS", playerId: String(playerId) };
    }
    if (marketMode === "WINNING_HAND_CLASS") {
      return { marketType: "WINNING_HAND_CLASS", class: classKey };
    }
    return { marketType: "WINNING_HAND_CONTAINS_RANK", rank };
  };

  useEffect(() => {
    if (!gameId || !hiddenBetNextHandId || !hiddenBetWindowOpen) {
      setQuoteLoading(false);
      setQuoteOdds(null);
      setQuoteMeta(null);
      return;
    }
    if (marketMode === "PLAYER_WINS" && !playerId) {
      setQuoteLoading(false);
      setQuoteOdds(null);
      setQuoteMeta(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    const run = async () => {
      try {
        const sel = buildSelection();
        const q = await quoteHiddenBet({
          gameId,
          handId: hiddenBetNextHandId,
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
  }, [gameId, hiddenBetNextHandId, hiddenBetWindowOpen, marketMode, playerId, classKey, rank, amount]);

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
    if (!gameId || !hiddenBetNextHandId || !quoteMeta || !quoteOdds) return;
    if (marketMode === "PLAYER_WINS" && !playerId) return;
    setIsPlacing(true);
    setError(null);
    try {
      const sel = buildSelection();
      await placeHiddenBet({
        gameId,
        handId: hiddenBetNextHandId,
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

  const disabledOffline = !gameId || !hiddenBetWindowOpen || !hiddenBetNextHandId;
  const needsWinner = marketMode === "PLAYER_WINS" && !playerId;
  const placeDisabled =
    disabledOffline ||
    isPlacing ||
    quoteLoading ||
    quoteOdds == null ||
    needsWinner;

  const placeDisabledHint = (() => {
    if (disabledOffline) {
      if (!gameId) {
        return t("hiddenBets.hintNoGameId", "Ouvre une partie cash en ligne (URL avec gameId).");
      }
      if (!hiddenBetNextHandId || !hiddenBetWindowOpen) {
        return t(
          "hiddenBets.hintWindowClosed",
          "Les paris cachés ne sont possibles qu’entre deux mains, quand le compte à rebours est actif ou en attente de joueurs."
        );
      }
    }
    if (needsWinner) return t("hiddenBets.hintPickWinner", "Choisis un joueur dans la liste « Gagnant ».");
    if (quoteLoading) return t("hiddenBets.hintQuoting", "Calcul de la cote…");
    if (quoteOdds == null && error) return null;
    if (quoteOdds == null) return t("hiddenBets.hintNoQuote", "Cote indisponible. Vérifie ta connexion ou réessaie après le prochain message de table.");
    return null;
  })();

  return (
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

          <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-700">
            {disabledOffline
              ? t("hiddenBets.serverOnly", "Paris cachés disponibles entre deux mains (partie en ligne).")
              : `${t("hiddenBets.nextHand", "Prochaine main")}: ${hiddenBetNextHandId?.slice(0, 8)}…`}
          </div>

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
            <select
              value={marketMode}
              onChange={(e) => setMarketMode(e.target.value as MarketMode)}
              className="w-full bg-slate-700 text-white rounded-lg p-2 text-sm"
            >
              <option value="PLAYER_WINS">{t("hiddenBets.winner")}</option>
              <option value="WINNING_HAND_CLASS">{t("hiddenBets.winningClass", "Classe main gagnante")}</option>
              <option value="WINNING_HAND_CONTAINS_RANK">{t("hiddenBets.containsRank", "Rang dans la main")}</option>
            </select>
          </div>

          <div className="p-4 border-b border-slate-700 space-y-2">
            {marketMode === "PLAYER_WINS" && (
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
            {marketMode === "WINNING_HAND_CLASS" && (
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
            {marketMode === "WINNING_HAND_CONTAINS_RANK" && (
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
  );
}
