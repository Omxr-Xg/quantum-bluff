import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { PokerTable } from "../components/PokerTable";
import { CommunityCards } from "../components/CommunityCards";
import { HiddenBetsPanel } from "../components/HiddenBetsPanel";
import { QuantumHUD } from "../components/QuantumHUD";
import { useQuantumHUD } from "../contexts/QuantumHUDContext";
import { PokerChat } from "../components/PokerChat";
import { MessageFeed } from "../components/MessageFeed";
import { PlayerDashboard } from "../components/PlayerDashboard";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../contexts/ToastContext";
import { User, Users, Menu, Loader2, Plus, MessageCircle, X, LogOut, Sparkles, Trophy, Activity, Info } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { QuantumBluffLogo } from "../assets/logo";
import { useDeviceType } from "../components/ui/use-mobile";
import { ChipIcon } from "../components/ChipIcon";
import { useUser } from "../hooks/useUser";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { addToUserBalance, addDevMoney, getUserBalance, getUserAvatar } from "../utils/userProfile";
import { RoundTransition } from "../components/RoundTransition";
import { GameInteractiveTour } from "../components/GameInteractiveTour";
import { QuitGameConfirmDialog } from "../components/QuitGameConfirmDialog";
import { HandActionLogPanel } from "../components/HandActionLogPanel";

import { fetchHiddenBetTableHistory } from "../api/hiddenBetsApi";

import type { ClientCard } from "../utils/cards";
import { normalizeServerCard } from "../utils/cards";
import { intChips } from "../utils/chips";
import { getWinMultiplierFromDifficultyParam } from "../utils/botModeReward";
import { BOT_TABLE_DEFAULTS } from "../config/botTableDefaults";
import { mergeGamificationFromServerResponse } from "../utils/gamificationStorage";
import { apiUrl } from "../utils/apiBase";

type Card = ClientCard;

const ADD_MONEY_PRESETS = [100, 1000, 2000, 3000, 5000];

interface ChatMessage {
  id: number;
  player: string;
  content: string;
  type: "emoji" | "text";
  timestamp: number;
  isLeaving?: boolean;
}

type GamePhase = "init" | "shuffle" | "deal" | "preflop" | "flop" | "turn" | "river" | "showdown";

/** SB / BB / BTN dans le journal (aligné préflop vs postflop). */
function actionLogRoleAbbrev(role: string | undefined, tr: (key: string) => string): string {
  if (!role || role === "PLAYER") return "";
  const keyMap: Record<string, string> = {
    SB: "game.actionLogRole.SMALL_BLIND",
    BB: "game.actionLogRole.BIG_BLIND",
    SMALL_BLIND: "game.actionLogRole.SMALL_BLIND",
    BIG_BLIND: "game.actionLogRole.BIG_BLIND",
    DEALER: "game.actionLogRole.DEALER",
  };
  const i18nKey = keyMap[role];
  return i18nKey ? tr(i18nKey) : "";
}

/** SB / BB tapis : mêmes rôles que `role` serveur / journal (SMALL_BLIND → SB, etc.). */
function mapServerRoleToTableRole(serverRole: string | undefined): NonNullable<BasePlayer["role"]> {
  if (serverRole === "SMALL_BLIND") return "SB";
  if (serverRole === "BIG_BLIND") return "BB";
  return "PLAYER";
}

interface BasePlayer {
  id: number | string;
  name: string;
  chips: number;
  bet: number;
  position: number;
  isActive: boolean;
  isDealer?: boolean;
  cards: Card[];
  isConnected?: boolean;
  hasFolded?: boolean;
  role?: "SB" | "BB" | "PLAYER";
  /** URL d’avatar (cash multijoueur, renvoyée par l’API / socket). */
  avatar?: string;
}

interface BotPlayer extends BasePlayer {
  isBot: true;
  difficulty: "easy" | "medium" | "hard" | "expert";
}

export function Game() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const gameIdParam = searchParams.get("gameId");
  const isSpectating = searchParams.get("spectate") === "1";
  const isBotMode = mode === "bot";
  const { userId } = useUser();
  const { updateFromCards: updateQuantumHUD } = useQuantumHUD();
  const difficultyParam = searchParams.get("difficulty") || "moyen";
  const winMultiplier = gameIdParam ? 1 : getWinMultiplierFromDifficultyParam(difficultyParam);

  const { socket } = useSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [hiddenBetNextHandId, setHiddenBetNextHandId] = useState<string | null>(null);
  const [hiddenBetWindowOpen, setHiddenBetWindowOpen] = useState(false);
  const [hiddenBetState, setHiddenBetState] = useState<{
    currentHandId: string | null;
    nextHandId: string | null;
    windowOpen: boolean;
    windowType: "PRE_HAND" | "LIVE_FLOP" | "LIVE_TURN" | "LIVE_RIVER" | null;
    closesAt?: number;
  } | null>(null);
  const [isQuantumOpen, setIsQuantumOpen] = useState(false);
  /** true = ouvert via clic ou menu ; le panneau reste si la souris quitte (sauf fermeture explicite) */
  const [quantumPinned, setQuantumPinned] = useState(false);
  const quantumPinnedRef = useRef(quantumPinned);
  useEffect(() => {
    quantumPinnedRef.current = quantumPinned;
  }, [quantumPinned]);
  const quantumHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quantumLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearQuantumHoverTimer = useCallback(() => {
    if (quantumHoverTimerRef.current) {
      clearTimeout(quantumHoverTimerRef.current);
      quantumHoverTimerRef.current = null;
    }
  }, []);

  const clearQuantumLeaveTimer = useCallback(() => {
    if (quantumLeaveTimerRef.current) {
      clearTimeout(quantumLeaveTimerRef.current);
      quantumLeaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearQuantumHoverTimer();
      clearQuantumLeaveTimer();
    };
  }, [clearQuantumHoverTimer, clearQuantumLeaveTimer]);

  const onQuantumProbasEnter = useCallback(() => {
    clearQuantumLeaveTimer();
    clearQuantumHoverTimer();
    quantumHoverTimerRef.current = setTimeout(() => {
      setIsQuantumOpen(true);
      quantumHoverTimerRef.current = null;
    }, 500);
  }, [clearQuantumHoverTimer, clearQuantumLeaveTimer]);

  const onQuantumProbasLeave = useCallback(() => {
    clearQuantumHoverTimer();
    clearQuantumLeaveTimer();
    quantumLeaveTimerRef.current = setTimeout(() => {
      if (!quantumPinnedRef.current) setIsQuantumOpen(false);
      quantumLeaveTimerRef.current = null;
    }, 280);
  }, [clearQuantumHoverTimer, clearQuantumLeaveTimer]);

  const onQuantumPanelEnter = useCallback(() => {
    clearQuantumLeaveTimer();
  }, [clearQuantumLeaveTimer]);

  const onQuantumPanelLeave = useCallback(() => {
    clearQuantumLeaveTimer();
    quantumLeaveTimerRef.current = setTimeout(() => {
      if (!quantumPinnedRef.current) setIsQuantumOpen(false);
      quantumLeaveTimerRef.current = null;
    }, 280);
  }, [clearQuantumLeaveTimer]);

  const onQuantumToggleClick = useCallback(() => {
    clearQuantumHoverTimer();
    clearQuantumLeaveTimer();
    if (!isQuantumOpen) {
      setIsQuantumOpen(true);
      setQuantumPinned(true);
      return;
    }
    if (!quantumPinned) {
      setQuantumPinned(true);
      return;
    }
    setIsQuantumOpen(false);
    setQuantumPinned(false);
  }, [isQuantumOpen, quantumPinned, clearQuantumHoverTimer, clearQuantumLeaveTimer]);

  const closeQuantumPanel = useCallback(() => {
    clearQuantumHoverTimer();
    clearQuantumLeaveTimer();
    setIsQuantumOpen(false);
    setQuantumPinned(false);
  }, [clearQuantumHoverTimer, clearQuantumLeaveTimer]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [_hasFolded, _setHasFolded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pot, setPot] = useState(150);
  const [playerChips, setPlayerChips] = useState(() =>
    searchParams.get("mode") === "bot" ? getUserBalance() : 5000
  );
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [handActionLog, setHandActionLog] = useState<{ id: string; line: string }[]>([]);
  const [hasPlayerActed, setHasPlayerActed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playersState, setPlayersState] = useState<(BasePlayer | BotPlayer)[]>([]);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [gameTourOpen, setGameTourOpen] = useState(false);
  const [gameTourStep, setGameTourStep] = useState(0);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | null>(null);
  const [devValidation, setDevValidation] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const turnTimeLimitSecRef = useRef(30);
  const handIdRef = useRef<string | undefined>(undefined);
  const actionSeqRef = useRef(0);
  const lastServerActionVersionRef = useRef<number>(-1);
  const lastServerActionVersionHandRef = useRef<string | undefined>(undefined);
  const lastCommunitySnapshotSigRef = useRef<string>("");
  const lastAppliedSocketSnapshotSigRef = useRef<string>("");
  const lastShowdownSnapshotAtRef = useRef<number>(0);
  const lastHandLogSocketDedupeRef = useRef<string>("");
  const [_timerActive, setTimerActive] = useState(false);
  const currentBet = useMemo(() => Math.max(0, ...playersState.map((p) => p.bet ?? 0)), [playersState]);
  
  const [phase, setPhase] = useState<GamePhase>("init");
  const [communityCardsState, setCommunityCardsState] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [burnedCardsCount, setBurnedCardsCount] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [, _setDealingCard] = useState<number | null>(null);
  const [roundPlayersActed, setRoundPlayersActed] = useState<Set<number>>(new Set());
  const [gameInitialized, setGameInitialized] = useState(false);
  const [handResult, setHandResult] = useState<"win" | "loss" | null>(null);
  const [_handResultData, setHandResultData] = useState<{ winnerName: string; handName: string } | null>(null);

  const [showTransition, setShowTransition] = useState(false);
  const [roundCount, setRoundCount] = useState(1);
  const [lastWinnerData, setLastWinnerData] = useState<{name: string, amount: number} | undefined>(undefined);

  const [gameOverReason, setGameOverReason] = useState<"human_eliminated" | "bot_eliminated" | null>(null);
  const [showdownResult, setShowdownResult] = useState<{
    winnerId: string;
    winnerIds?: string[];
    winnerName: string;
    hand: string;
    handRank: number;
    pot: number;
    isSplit?: boolean;
    /** Pas d’attente abattage (ex. adversaire parti) */
    skipRevealDelay?: boolean;
  } | null>(null);
  const [lastBotAction, setLastBotAction] = useState<{ name: string; action: string } | null>(null);
  const [runOutPhase, setRunOutPhase] = useState<GamePhase | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const gameStateFromSocketRef = useRef(false);
  const clearBotActionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playersStateRef = useRef<(BasePlayer | BotPlayer)[]>([]);
  const roundPlayersActedRef = useRef<Set<number>>(new Set());
  roundPlayersActedRef.current = roundPlayersActed;
  const deckRef = useRef<Card[]>([]);
  const communityCardsStateRef = useRef<(Card | null)[]>([]);
  const startOfHandChipsRef = useRef(0);
  const hasSetStartOfHandThisHandRef = useRef(false);
  const streetTransitionScheduledRef = useRef<string | null>(null);
  const streetTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doStreetTransitionRef = useRef<(() => void) | null>(null);
  const streetPhaseEnteredRef = useRef<number>(0);
  const bothActedNoTurnRef = useRef(false);
  const toAddLastRef = useRef(0);
  const botIsFetchingRef = useRef(false);
  const [_showdownReveal, setShowdownReveal] = useState(false);
  const showdownStartedRef = useRef(false);
  const showdownResultRef = useRef<typeof showdownResult>(null);
  showdownResultRef.current = showdownResult;
  const [_showdownWinnerCards, setShowdownWinnerCards] = useState<Card[]>([]);
  const [_pendingShowdownData, setPendingShowdownData] = useState<{
    winnerId: string;
    winnerIds?: string[];
    winnerName: string;
    hand: string;
    pot: number;
    winnerCards: Card[];
    isSplit?: boolean;
  } | null>(null);
  const handContributionsRef = useRef<Record<string, number>>({});
  const [sidePots, setSidePots] = useState<{ amount: number; eligibleIds: string[] }[]>([]);
  const [_isRematchHost, setIsRematchHost] = useState(false);
  const [, setCashCountdownEndsAt] = useState<number | null>(null);
  const [cashSeats, setCashSeats] = useState<{ seatIndex: number; userId: string | null; username: string | null; chips: number }[]>([]);
  const [cashWaitingPlayers, setCashWaitingPlayers] = useState(false);
  const [showInterHandPanel, setShowInterHandPanel] = useState(false);
  const [, setHasClickedReadyThisInterHand] = useState(false);
  const [interHandResultsVisible, setInterHandResultsVisible] = useState(false);
  const [nextHandReadyUserIds, setNextHandReadyUserIds] = useState<string[]>([]);
  const [allNextHandReady, setAllNextHandReady] = useState(false);
  const myNextHandReady =
    userId && nextHandReadyUserIds.some((u) => String(u) === String(userId));
  const [spectatorWantsToRejoin, setSpectatorWantsToRejoin] = useState(false);

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

  const [interHandTableTickets, setInterHandTableTickets] = useState<TableTicketRow[]>([]);
  const [interHandTableTicketsLoading, setInterHandTableTicketsLoading] = useState(false);
  const [interHandTableTicketsError, setInterHandTableTicketsError] = useState<string | null>(null);
  const [pricingInfo, setPricingInfo] = useState<{
    ticketId: string;
    pricingBreakdown: unknown;
    pricingInputs: unknown;
  } | null>(null);
  const flopAnimateTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flopAnimatedRef = useRef(false);

  const appendLocalHandAction = useCallback(
    (actor: BasePlayer | BotPlayer | undefined, kind: "check" | "call" | "raise" | "fold", extra?: { amount?: number }) => {
      if (gameIdParam) return;
      const st = phaseRef.current;
      if (st !== "preflop" && st !== "flop" && st !== "turn" && st !== "river") return;
      const nameBase =
        !actor
          ? "?"
          : actor.id === userId || actor.id === "human" || actor.name === "Vous" || actor.name === "you"
            ? t("game.you")
            : actor.name;
      const roleAbb = actionLogRoleAbbrev(actor?.role, t);
      const name = roleAbb && nameBase !== "?" ? `${nameBase} (${roleAbb})` : nameBase;
      const streetLabel = t(`game.actionLogStreet.${st}`);
      const amt = extra?.amount ?? 0;
      const detail =
        kind === "check"
          ? t("game.actionLogCheck", { name })
          : kind === "fold"
            ? t("game.actionLogFold", { name })
            : kind === "call"
              ? t("game.actionLogCall", { name, amount: amt })
              : t("game.actionLogRaise", { name, amount: amt });
      const line = t("game.actionLogLine", { street: streetLabel, detail });
      setHandActionLog((prev) => [...prev.slice(-99), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, line }]);
    },
    [gameIdParam, t, userId]
  );

  useEffect(() => {
    if (phase === "shuffle") setHandActionLog([]);
  }, [phase]);

  const loadInterHandTableTickets = useCallback(async () => {
    if (!gameIdParam) return;
    setInterHandTableTicketsLoading(true);
    setInterHandTableTicketsError(null);
    try {
      const { tickets } = await fetchHiddenBetTableHistory(gameIdParam, 100);
      setInterHandTableTickets((tickets ?? []) as TableTicketRow[]);
    } catch (e) {
      setInterHandTableTicketsError((e as Error).message);
    } finally {
      setInterHandTableTicketsLoading(false);
    }
  }, [gameIdParam]);

  // Pendant l’attente “ready”, on recharge les tickets résolus pour que tout le monde voie les mêmes résultats.
  useEffect(() => {
    if (!cashWaitingPlayers) return;
    void loadInterHandTableTickets();
  }, [cashWaitingPlayers, loadInterHandTableTickets]);

  useEffect(() => {
    if (!socket || !cashWaitingPlayers) return;
    const onUpd = () => {
      void loadInterHandTableTickets();
    };
    socket.on("HIDDEN_BET_TICKET_UPDATED", onUpd);
    return () => {
      socket.off("HIDDEN_BET_TICKET_UPDATED", onUpd);
    };
  }, [socket, cashWaitingPlayers, loadInterHandTableTickets]);

  useEffect(() => {
    if (cashWaitingPlayers) return;
    setInterHandTableTickets([]);
    setInterHandTableTicketsError(null);
    setPricingInfo(null);
  }, [cashWaitingPlayers]);

  const tourRefHeader = useRef<HTMLDivElement>(null);
  const tourRefTable = useRef<HTMLDivElement>(null);
  const tourRefPot = useRef<HTMLDivElement>(null);
  const tourRefBoard = useRef<HTMLDivElement>(null);
  const tourRefActions = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const gameTourRefs = useMemo(
    () => ({
      header: tourRefHeader,
      table: tourRefTable,
      pot: tourRefPot,
      board: tourRefBoard,
      actions: tourRefActions,
    }),
    []
  );

  const startGameTour = useCallback(() => {
    setShowMenu(false);
    setGameTourStep(0);
    setGameTourOpen(true);
  }, []);

  useEffect(() => {
    if (!showMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = menuContainerRef.current;
      if (el && !el.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [showMenu]);

  const { colorblindMode } = useAccessibility();
  const { addToast } = useToast();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  const SB = BOT_TABLE_DEFAULTS.SMALL_BLIND;
  const BB = BOT_TABLE_DEFAULTS.BIG_BLIND;

  /** Après l’abattage, attendre avant d’afficher l’écran « gagnant » / transition (cartes visibles au tapis). */
  const SHOWDOWN_REVEAL_MS = 3000;

  const lastScheduledShowdownTransitionSigRef = useRef<string>("");

  useEffect(() => {
    if (!showdownResult || showTransition) return;
    const sig = `${showdownResult.winnerId}:${showdownResult.winnerName}:${showdownResult.hand}:${showdownResult.pot}:${showdownResult.isSplit ? 1 : 0}:${showdownResult.skipRevealDelay ? 1 : 0}`;
    if (lastScheduledShowdownTransitionSigRef.current === sig) return;
    lastScheduledShowdownTransitionSigRef.current = sig;
    const delayMs = showdownResult.skipRevealDelay ? 0 : SHOWDOWN_REVEAL_MS;
    const id = window.setTimeout(() => {
      setLastWinnerData({
        name: showdownResult.winnerName,
        amount: showdownResult.pot,
      });
      // Cash multijoueur : pas de RoundTransition (overlay jaune + compte secondes).
      const isCashMultiplayer = Boolean(gameIdParam) && !isBotMode;
      if (!isCashMultiplayer) {
        setShowTransition(true);
      }
    }, delayMs);
    return () => clearTimeout(id);
  }, [showdownResult, showTransition, gameIdParam, isBotMode]);

  const openAddMoney = () => {
    setShowAddMoney(true);
    setAddMoneyAmount(null);
    setDevValidation("");
    setAddSuccess(false);
  };

  const closeAddMoney = () => {
    setShowAddMoney(false);
    setAddMoneyAmount(null);
    setDevValidation("");
    setAddSuccess(false);
  };

  const submitAddMoney = async () => {
    if (addMoneyAmount == null || addMoneyAmount <= 0) return;
    if (devValidation.trim().toLowerCase() !== "dev") return;
    const newBalance = mode === "bot"
      ? addToUserBalance(addMoneyAmount)
      : await addDevMoney(addMoneyAmount);
    if (mode === "bot") {
      setPlayerChips(newBalance);
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === "human" || String(p.id) === String(userId) ? { ...p, chips: newBalance } : p
        )
      );
    }
    setAddSuccess(true);
    setTimeout(() => closeAddMoney(), 800);
  };

  const getPlayers = (): (BasePlayer | BotPlayer)[] => {
    const count = parseInt(searchParams.get("bots") || "1", 10);
    const diff = searchParams.get("difficulty") || "moyen";
    const diffMap: "easy" | "medium" | "hard" | "expert" =
      diff === "facile"
        ? "easy"
        : diff === "moyen"
          ? "medium"
          : diff === "difficile"
            ? "hard"
            : diff === "expert"
              ? "expert"
              : "medium";
    const botChipsParam = searchParams.get("botChips");
    const botChipsList = botChipsParam ? botChipsParam.split(",").map((v) => Math.max(100, parseInt(v, 10) || 1000)) : [];

    if (mode === "bot") {
      const botNames = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
      const allPlayers: (BasePlayer | BotPlayer)[] = [];
      const totalPlayers = count + 1;

      for (let i = 0; i < count; i++) {
        const startChips = botChipsList[i] ?? 1000;
        allPlayers.push({
          id: `bot-${i + 1}`,
          name: `Bot ${botNames[i]}`,
          chips: startChips,
          bet: 0,
          position: i,
          isActive: false,
          isDealer: false,
          cards: [],
          isBot: true,
          difficulty: diffMap,
          isConnected: true,
          hasFolded: false,
          role: "PLAYER",
        });
      }

      allPlayers.push({
        id: "human",
        name: "Vous",
        chips: playerChips,
        bet: 0,
        position: count,
        isActive: false,
        isDealer: false,
        cards: [],
        isConnected: true,
        hasFolded: false,
        role: "PLAYER",
      });

      const dealerIndex = Math.floor(Math.random() * totalPlayers);
      allPlayers[dealerIndex].isDealer = true;

      // Même logique que le serveur (GameTable) : après le dealer → SB (auto), puis BB (auto), puis action.
      // Heads-up : dealer = SB, l’autre = BB ; preflop commence par le SB (dealer).
      const sbIdx = totalPlayers === 2 ? dealerIndex : (dealerIndex + 1) % totalPlayers;
      const bbIdx = totalPlayers === 2 ? (dealerIndex + 1) % totalPlayers : (dealerIndex + 2) % totalPlayers;

      allPlayers[sbIdx].role = "SB";
      allPlayers[sbIdx].bet = SB;
      allPlayers[sbIdx].chips = (allPlayers[sbIdx].chips ?? 0) - SB;
      allPlayers[bbIdx].role = "BB";
      allPlayers[bbIdx].bet = BB;
      allPlayers[bbIdx].chips = (allPlayers[bbIdx].chips ?? 0) - BB;

      const firstToAct = (bbIdx + 1) % totalPlayers;
      allPlayers[firstToAct].isActive = true;

      return allPlayers;
    }
    return [];
  };

  const activePlayers = playersState.length > 0 ? playersState : getPlayers();
  const activePlayer = activePlayers.find((p) => p.isActive);
  const callAmount = useMemo(() => {
    if (!activePlayer) return 0;
    const highestBet = Math.max(...activePlayers.map((p) => p.bet ?? 0), 0);
    return intChips(Math.max(0, highestBet - (activePlayer.bet ?? 0)));
  }, [activePlayers, activePlayer]);
  const isHero = (p: BasePlayer | BotPlayer) => p.id === userId || p.id === "human";
  const tablePlayers = activePlayers.map((player) => {
    const base = isHero(player)
      ? { ...player, position: 0, cards: player.cards || [] }
      : { ...player, position: activePlayers.filter((p) => !isHero(p)).indexOf(player) + 1 };
    return {
      ...base,
      hasFolded: player.hasFolded ?? false,
      lastAction: lastBotAction?.name === player.name ? lastBotAction.action : undefined,
    };
  });
  const isMyTurn = Boolean(
    activePlayer &&
      (String(activePlayer.id) === String(userId) ||
        activePlayer.name === "Vous" ||
        activePlayer.id === "human")
  );
  const heroPlayer = activePlayers.find((p) => isHero(p));
  const heroDisplayName = heroPlayer?.name === "Vous" || heroPlayer?.name === "you" ? t('game.you') : (heroPlayer?.name ?? t('game.you'));
  const hasFoldedFromState = heroPlayer?.hasFolded ?? false;
  /** Même montant en-tête (haut) et dans PlayerDashboard (bas) : pile du héros sur la table. */
  const displayedHeroChips =
    heroPlayer != null && typeof heroPlayer.chips === "number" ? heroPlayer.chips : playerChips;

  playersStateRef.current = activePlayers;

  /** Premier à parler post-flop : premier siège actif à gauche du bouton (SB en ring ; en HU = BB car le bouton est la SB) — aligné avec GameTable.getPostflopFirstPlayerId. */
  const getPostflopFirstActIndex = (): number => {
    const players = playersStateRef.current;
    if (!players || players.length < 2) return 0;
    const dealerIdx = players.findIndex((p) => p.isDealer);
    if (dealerIdx === -1) return 0;
    const idx = (dealerIdx + 1) % players.length;
    return idx;
  };

  const heroCards = tablePlayers.find((p) => isHero(p))?.cards || [];
  const communityCards = communityCardsState;

  const displayBurnedCardsCount = gameIdParam
    ? burnedCardsCount
    : (phase === "flop" ? 1 : phase === "turn" ? 2 : phase === "river" || phase === "showdown" ? 3 : 0);

  const generateDeck = (): Card[] => {
    const suits: Array<"hearts" | "diamonds" | "clubs" | "spades"> = ["hearts", "diamonds", "clubs", "spades"];
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const newDeck: Card[] = [];
    for (const suit of suits) {
      for (const value of values) {
        newDeck.push({ suit, value });
      }
    }
    return newDeck.sort(() => Math.random() - 0.5);
  };

  const dealCardsToPlayers = (currentDeck: Card[], currentPlayers: (BasePlayer | BotPlayer)[]) => {
    const newDeck = [...currentDeck];
    deckRef.current = newDeck;
    const updatedPlayers = currentPlayers.map((p) => ({ ...p, cards: [...(p.cards || [])] }));
    let cardIndex = 0;

    const dealInterval = setInterval(() => {
      const playerIndex = Math.floor(cardIndex / 2);

      if (playerIndex >= updatedPlayers.length) {
        clearInterval(dealInterval);
        setPhase("preflop");
        setRoundPlayersActed(new Set());
        setGameInitialized(true);
        return;
      }

      const card = newDeck.shift();
      if (card && updatedPlayers[playerIndex]) {
        if (!updatedPlayers[playerIndex].cards) updatedPlayers[playerIndex].cards = [];
        updatedPlayers[playerIndex].cards.push(card);
        const finalPlayers = updatedPlayers.map((p) => ({ ...p, cards: [...(p.cards || [])] }));
        setPlayersState(finalPlayers);
        const d = [...newDeck];
        deckRef.current = d;
        setDeck(d);
      }
      cardIndex++;
    }, 250);
  };

  const addContribution = (playerId: string | number, amount: number) => {
    const key = String(playerId);
    handContributionsRef.current[key] = (handContributionsRef.current[key] ?? 0) + intChips(amount);
  };

  const resetBetsAndSetFirstToAct = (startIndex: number) => {
    setRoundPlayersActed(new Set());
    setPlayersState((prev) => {
      if (prev.length === 0) return prev;
      const firstIdx = startIndex % prev.length;
      for (let i = 0; i < prev.length; i++) {
        const idx = (firstIdx + i) % prev.length;
        const p = prev[idx];
        if (p.isConnected !== false && !(p.hasFolded ?? false) && (p.chips ?? 0) > 0) {
          return prev.map((pl, j) => ({ ...pl, bet: 0, isActive: j === idx }));
        }
      }
      return prev.map((p) => ({ ...p, bet: 0, isActive: false }));
    });
  };

  const dealFlop = (runOutOnly?: boolean) => {
    setPhase("flop");
      if (!runOutOnly) resetBetsAndSetFirstToAct(getPostflopFirstActIndex());
    const newDeck = [...deckRef.current];
    newDeck.shift();
    const flopCards: Card[] = [];
    for (let i = 0; i < 3; i++) {
      const card = newDeck.shift();
      if (card) flopCards.push(card);
    }
    deckRef.current = newDeck;
    setDeck(newDeck);
    flopCards.forEach((card, i) => {
      const slot = i;
      setTimeout(() => {
        setCommunityCardsState((prev) => {
          const next = [...prev];
          next[slot] = card;
          communityCardsStateRef.current = next;
          return next;
        });
      }, i * 800);
    });
  };

  const dealTurn = (runOutOnly?: boolean) => {
    setPhase("turn");
      if (!runOutOnly) resetBetsAndSetFirstToAct(getPostflopFirstActIndex());
    const newDeck = [...deckRef.current];
    newDeck.shift();
    const card = newDeck.shift();
    deckRef.current = newDeck;
    setDeck(newDeck);
    if (card) {
      setCommunityCardsState((prev) => {
        const next = [...prev];
        next[3] = card;
        communityCardsStateRef.current = next;
        return next;
      });
    }
  };

  const dealRiver = (runOutOnly?: boolean) => {
    setPhase("river");
    if (!runOutOnly) resetBetsAndSetFirstToAct(getPostflopFirstActIndex());
    const newDeck = [...deckRef.current];
    newDeck.shift();
    const card = newDeck.shift();
    deckRef.current = newDeck;
    setDeck(newDeck);
    if (card) {
      setCommunityCardsState((prev) => {
        const next = [...prev];
        next[4] = card;
        communityCardsStateRef.current = next;
        return next;
      });
    }
  };

  useEffect(() => {
    const runInit = () => {
      let initial: (BasePlayer | BotPlayer)[] = [];
      if (gameIdParam && typeof window !== "undefined") {
        const stored = localStorage.getItem("gamePlayers");
        if (stored) {
          try {
            const parsed: { id: string; name: string }[] = JSON.parse(stored);
            initial = parsed.map((p, i) => ({
              id: String(p.id),
              name: p.name,
              chips: 1000,
              bet: 0,
              position: i,
              isActive: i === 0,
              isDealer: false,
              cards: [],
              isConnected: true,
              hasFolded: false,
              isBot: false,
            }));
          } catch { /* no-op */ }
        }
      }
      if (initial.length === 0) initial = getPlayers();
      initial.forEach((p) => {
        p.cards = [];
      });
      setPlayersState(initial);
      if (!gameIdParam) {
        setDeck(generateDeck());
      }
      if (mode === "bot") {
        setPot(SB + BB);
        setPlayerChips(getUserBalance());
        setPhase("init");
        setGameInitialized(false);
        setRoundPlayersActed(new Set());
        setSidePots([]);
        const contribs: Record<string, number> = {};
        initial.forEach((p) => { contribs[String(p.id)] = p.bet ?? 0; });
        handContributionsRef.current = contribs;
      }
    };
    if (mode === "bot" && !gameIdParam) {
      const t = setTimeout(runInit, 0);
      return () => clearTimeout(t);
    }
    runInit();
  }, [mode, gameIdParam, searchParams.get("bots") ?? "", searchParams.get("difficulty") ?? "", searchParams.get("botChips") ?? ""]);

  useEffect(() => {
    const replay = (location.state as { replay?: boolean })?.replay;
    if (!replay || !isBotMode) return;
    const initial = getPlayers();
    initial.forEach((p) => {
      p.cards = [];
    });
    setPlayersState(initial);
    setDeck(generateDeck());
    setPhase("init");
    setGameInitialized(false);
    setRoundPlayersActed(new Set());
    setPot(SB + BB);
    setPlayerChips(getUserBalance());
    setHandResult(null);
    setHandResultData(null);
    setShowdownResult(null);
    setGameOverReason(null);
    setRunOutPhase(null);
    setShowdownReveal(false);
    setShowdownWinnerCards([]);
    showdownStartedRef.current = false;
    setIsBotThinking(false);
    botIsFetchingRef.current = false;
    setSidePots([]);
    const contribs: Record<string, number> = {};
    initial.forEach((p) => { contribs[String(p.id)] = p.bet ?? 0; });
    handContributionsRef.current = contribs;
    setCommunityCardsState([null, null, null, null, null]);
    setHandActionLog([]);
    setBurnedCardsCount(0);
    hasSetStartOfHandThisHandRef.current = false;
    streetTransitionScheduledRef.current = null;
    if (streetTransitionTimeoutRef.current) {
      clearTimeout(streetTransitionTimeoutRef.current);
      streetTransitionTimeoutRef.current = null;
    }
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.state, isBotMode]);

  useEffect(() => {
    if (!gameIdParam || isSpectating || !userId) return;
    const url = `${apiUrl(`/api/game/${encodeURIComponent(gameIdParam)}`)}?playerId=${encodeURIComponent(userId)}`;
    let cancelled = false;
    fetch(url, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
    })
      .then((res) => {
        if (cancelled) return null;
        if (res.status === 404) {
          navigate("/lobby", { state: { message: "Partie terminée (adversaire parti ou partie supprimée)." } });
          return null;
        }
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((gameState: { players?: { id: string; name: string; chips: number; currentBet?: number; position?: number; isActive?: boolean; isDealer?: boolean; isConnected?: boolean; role?: string; cards?: { suit: string; value: string }[] }[]; pot?: number; phase?: string; communityCards?: (Card | null)[]; currentTurn?: string; turnTimeLimitSec?: number; handId?: string } | null) => {
        if (cancelled || !gameState) return;
        if (gameStateFromSocketRef.current) return;
        if (typeof gameState.turnTimeLimitSec === "number" && gameState.turnTimeLimitSec > 0) {
          turnTimeLimitSecRef.current = gameState.turnTimeLimitSec;
        }
        handIdRef.current = gameState.handId;
        const players = gameState.players ?? [];
        const phaseMap: Record<string, GamePhase> = {
          WAITING: "init",
          PREFLOP: "preflop",
          FLOP: "flop",
          TURN: "turn",
          RIVER: "river",
          SHOWDOWN: "showdown",
        };
        const phase = gameState.phase != null ? (phaseMap[gameState.phase] ?? gameState.phase.toLowerCase?.() ?? "preflop") : "preflop";
        const mapped = players.map((p, index) => {
          const isMe = !isSpectating && String(p.id) === String(userId);
          const serverCards = Array.isArray(p.cards) ? p.cards.map((c) => normalizeServerCard(c)).filter((c): c is Card => c !== null) : [];
          const hiddenOpponentCards: Card[] =
            !isMe && phase !== "showdown" && p.isActive !== false
              ? [{ suit: "hidden", value: "?" }, { suit: "hidden", value: "?" }]
              : [];
          return {
            id: String(p.id),
            name: p.name,
            chips: p.chips ?? 1000,
            bet: p.currentBet ?? 0,
            position: p.position ?? index,
            isActive: p.id === gameState.currentTurn,
            isDealer: p.isDealer ?? false,
            cards: isMe ? serverCards : (serverCards.length > 0 ? serverCards : hiddenOpponentCards),
            isConnected: p.isConnected !== false,
            hasFolded: false,
            isBot: false,
            role: mapServerRoleToTableRole(p.role),
            avatar: (p as { avatar?: string }).avatar,
          };
        });
        setPlayersState(mapped);
        setPot(gameState.pot ?? 0);
        const humanChips = players.find((p) => String(p.id) === String(userId))?.chips;
        if (humanChips != null) {
          setPlayerChips(humanChips);
        }
        setPhase(phase as GamePhase);
        setBurnedCardsCount((gameState as { burnedCardsCount?: number }).burnedCardsCount ?? 0);
      const cc = gameState.communityCards;
      if (Array.isArray(cc)) {
        const arr: (Card | null)[] = [null, null, null, null, null];
        cc.forEach((c, i) => { if (i < 5 && c && typeof c === "object") arr[i] = normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]); });
        if (phase === "flop" && arr[0] && arr[1] && arr[2] && !arr[3] && !arr[4]) {
          flopAnimateTimeoutsRef.current.forEach((t) => clearTimeout(t));
          flopAnimateTimeoutsRef.current = [];
          setCommunityCardsState([arr[0], null, null, null, null]);
          flopAnimateTimeoutsRef.current.push(
            setTimeout(() => setCommunityCardsState((prev) => [prev[0], arr[1], null, null, null]), 800)
          );
          flopAnimateTimeoutsRef.current.push(
            setTimeout(() => setCommunityCardsState([arr[0]!, arr[1]!, arr[2]!, null, null]), 1600)
          );
        } else {
          setCommunityCardsState(arr);
        }
      }
        const isPlayingPhase = phase !== "init";
        setGameInitialized(isPlayingPhase);
      })
      .catch((err) => {
        if (!cancelled) console.error("Erreur récupération état partie:", err);
      });
    return () => { cancelled = true; };
  }, [gameIdParam, userId, navigate, isSpectating]);

  useEffect(() => {
    if (!socket || !gameIdParam) return;
    if (isSpectating) {
      socket.emit("JOIN_SPECTATE", { gameId: gameIdParam });
    } else {
      if (!userId) return;
      socket.emit("JOIN_GAME", { gameId: gameIdParam, playerId: userId, avatarUrl: getUserAvatar() });
    }

    const onChatMessage = (data: { playerId: string; playerName: string; content: string; type: "emoji" | "text" }) => {
      const id = Date.now();
      const isMe = String(data.playerId) === String(userId);
      const newMessage: ChatMessage = {
        id: id,
        player: isMe ? "Vous" : data.playerName,
        content: data.content,
        type: data.type,
        timestamp: id,
        isLeaving: false,
      };
      setChatMessages((prev) => [...prev, newMessage]);
      setTimeout(() => {
        setChatMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, isLeaving: true } : msg)));
        setTimeout(() => setChatMessages((prev) => prev.filter((msg) => msg.id !== id)), 500);
      }, 4000);
    };
    socket.on("GAME_CHAT", onChatMessage);

    const onError = (payload: { code?: string; message?: string }) => {
      if (payload?.code === "GAME_NOT_FOUND") {
        navigate("/lobby", { state: { message: "Partie terminée (adversaire parti ou partie supprimée)." } });
      }
        else if (payload?.code === "ACTION_ERROR" || payload?.code === "INVALID_RAISE" || payload?.code === "TOO_MANY_ACTIONS") {
          addToast(payload?.message || t('common.error'), "error");
          setIsLoading(false);
          setHasPlayerActed(false);
        }
    };
    socket.on("ERROR", onError);
    return () => {
      socket.off("GAME_CHAT", onChatMessage);
      socket.off("ERROR", onError);
    };
  }, [socket, gameIdParam, userId, navigate, addToast, t, isSpectating]);

  useEffect(() => {
    if (!socket || !gameIdParam) return;
    if (!isSpectating && !userId) return;
    const phaseMap: Record<string, GamePhase> = {
      WAITING: "init",
      PREFLOP: "preflop",
      FLOP: "flop",
      TURN: "turn",
      RIVER: "river",
      SHOWDOWN: "showdown",
      ENDED_OPPONENT_LEFT: "showdown",
    };
    const onGameUpdate = (_source: "GAME_UPDATE" | "GAME_STATE_UPDATED", gameState: { players?: { id: string; name: string; chips: number; currentBet?: number; position?: number; isActive?: boolean; isDealer?: boolean; isConnected?: boolean; role?: string; cards?: { suit: string; value: string }[] }[]; pot?: number; phase?: string; communityCards?: (Card | null)[]; currentTurn?: string; showdownWinnerId?: string; showdownWinnerIds?: string[]; showdownIsSplit?: boolean; showdownHandName?: string; showdownPot?: number; cashCountdownEndsAt?: number; cashCountdownRemainingSec?: number; cashSeats?: { seatIndex: number; userId: string | null; username: string | null; chips: number }[]; spectatorRejoinQueue?: string[]; turnTimeLimitSec?: number; handId?: string; actionVersion?: number; streetVersion?: number; updatedAt?: string; hiddenBetNextHandId?: string; hiddenBetWindowOpen?: boolean; hiddenBetState?: { currentHandId: string | null; nextHandId: string | null; windowOpen: boolean; windowType: "PRE_HAND" | "LIVE_FLOP" | "LIVE_TURN" | "LIVE_RIVER" | null; closesAt?: number } | null }) => {
      gameStateFromSocketRef.current = true;
      setHiddenBetNextHandId(gameState.hiddenBetNextHandId ?? null);
      setHiddenBetWindowOpen(Boolean(gameState.hiddenBetWindowOpen));
      setHiddenBetState(gameState.hiddenBetState ?? null);
      const socketSnapshotSig = `${gameState.handId ?? "no-hand"}:${gameState.phase ?? "no-phase"}:${typeof gameState.actionVersion === "number" ? gameState.actionVersion : "no-ver"}:${gameState.currentTurn ?? "no-turn"}:${(gameState.communityCards ?? []).filter((c) => c != null).length}:${gameState.showdownWinnerId ?? "no-winner"}`;
      if (socketSnapshotSig === lastAppliedSocketSnapshotSigRef.current) {
        return;
      }
      lastAppliedSocketSnapshotSigRef.current = socketSnapshotSig;
      const incomingVersion = typeof gameState.actionVersion === "number" ? gameState.actionVersion : -1;
      const incomingHandId = gameState.handId ?? undefined;
      if (incomingHandId && incomingHandId !== lastServerActionVersionHandRef.current) {
        lastServerActionVersionHandRef.current = incomingHandId;
        lastServerActionVersionRef.current = -1;
        lastHandLogSocketDedupeRef.current = "";
        setHandActionLog([]);
      } else if (!incomingHandId && lastServerActionVersionHandRef.current) {
        lastServerActionVersionHandRef.current = undefined;
        lastServerActionVersionRef.current = -1;
        lastHandLogSocketDedupeRef.current = "";
        setHandActionLog([]);
      }
      if (
        incomingVersion >= 0 &&
        incomingHandId &&
        lastServerActionVersionHandRef.current === incomingHandId &&
        incomingVersion < lastServerActionVersionRef.current
      ) {
        return;
      }
      if (incomingVersion >= 0) {
        lastServerActionVersionRef.current = Math.max(lastServerActionVersionRef.current, incomingVersion);
        if (incomingHandId) {
          lastServerActionVersionHandRef.current = incomingHandId;
        }
      }
      const incomingPhase =
        gameState.phase != null
          ? (phaseMap[gameState.phase] ?? (gameState.phase as string).toLowerCase?.() ?? "preflop")
          : "preflop";
      if (incomingPhase !== "init" && incomingPhase !== "shuffle") {
        setCashWaitingPlayers(false);
        setCashCountdownEndsAt(null);
      }
      /** Garde AVANT toute mutation : évite d'appliquer WAITING (tous isActive false) juste après SHOWDOWN. */
      const previousHandIdBeforeUpdate = handIdRef.current;
      if (
        incomingPhase === "init" &&
        gameState.phase === "WAITING" &&
        previousHandIdBeforeUpdate &&
        Date.now() - lastShowdownSnapshotAtRef.current < 3000
      ) {
        return;
      }
      if (typeof gameState.turnTimeLimitSec === "number" && gameState.turnTimeLimitSec > 0) {
        turnTimeLimitSecRef.current = gameState.turnTimeLimitSec;
      }
      handIdRef.current = gameState.handId;
      if (typeof gameState.cashCountdownRemainingSec === "number") {
        setCashCountdownEndsAt(Date.now() + Math.max(0, gameState.cashCountdownRemainingSec) * 1000);
      } else if (gameState.cashCountdownEndsAt != null) {
        setCashCountdownEndsAt(gameState.cashCountdownEndsAt);
      }
      if (gameState.cashSeats && Array.isArray(gameState.cashSeats)) {
        setCashSeats(gameState.cashSeats);
        if (isSpectating && userId && gameState.cashSeats.some((s) => s.userId && String(s.userId) === String(userId))) {
          navigate(`/game?gameId=${gameIdParam}`, { replace: true });
          return;
        }
      }
      if (
        gameState.cashCountdownEndsAt == null &&
        (typeof gameState.cashCountdownRemainingSec !== "number" || gameState.cashCountdownRemainingSec <= 0) &&
        gameState.phase !== "WAITING"
      ) {
        setCashCountdownEndsAt(null);
      }
      if (gameState.spectatorRejoinQueue && Array.isArray(gameState.spectatorRejoinQueue)) {
        setSpectatorWantsToRejoin(gameState.spectatorRejoinQueue.includes(String(userId)));
      }
      const players = gameState.players ?? [];
      setPlayersState((prev) => {
        const myCardsFromPrev = isSpectating ? [] : (prev.find((p) => String(p.id) === String(userId))?.cards ?? []);
        const currentTurnId = gameState.currentTurn != null ? String(gameState.currentTurn) : "";
        const mapped = players.map((p, index) => {
          const isMe = !isSpectating && String(p.id) === String(userId);
          const serverCardsRaw = Array.isArray(p.cards) ? p.cards : [];
          const serverCards = serverCardsRaw.map((c) => normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0])).filter((c): c is Card => c !== null);
          const hiddenOpponentCards: Card[] =
            !isMe && incomingPhase !== "showdown" && p.isActive !== false
              ? [{ suit: "hidden", value: "?" }, { suit: "hidden", value: "?" }]
              : [];
          const myCards = isMe
            ? (serverCards.length > 0 ? serverCards : myCardsFromPrev)
            : (serverCards.length > 0 ? serverCards : hiddenOpponentCards);
          const serverInHand = p.isActive !== false;
          return {
            id: String(p.id),
            name: p.name,
            chips: p.chips ?? 1000,
            bet: p.currentBet ?? 0,
            position: p.position ?? index,
            isActive: String(p.id) === currentTurnId,
            isDealer: p.isDealer ?? false,
            cards: myCards,
            isConnected: p.isConnected !== false,
            hasFolded: gameState.phase === "WAITING" ? false : !serverInHand,
            isBot: false,
            role: mapServerRoleToTableRole(p.role),
            avatar: (p as { avatar?: string }).avatar,
          };
        });
        return mapped;
      });
      setPot(gameState.pot ?? 0);
      const phase = incomingPhase;
      if (phase === "showdown") {
        lastShowdownSnapshotAtRef.current = Date.now();
      }
      if (!(phase === "init" && phaseRef.current === "showdown" && showdownResultRef.current)) {
        setPhase(phase as GamePhase);
      }
      setBurnedCardsCount((gameState as { burnedCardsCount?: number }).burnedCardsCount ?? 0);
      const cc = gameState.communityCards;
      if (Array.isArray(cc)) {
        const arr: (Card | null)[] = [null, null, null, null, null];
        cc.forEach((c, i) => { if (i < 5 && c && typeof c === "object") arr[i] = normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]); });
        const incomingCommunityCount = arr.filter((c) => c != null).length;
        const communitySig = `${gameState.handId ?? 'no-hand'}:${gameState.phase ?? 'no-phase'}:${typeof gameState.actionVersion === 'number' ? gameState.actionVersion : 'no-ver'}:${incomingCommunityCount}`;
        lastCommunitySnapshotSigRef.current = communitySig;
        if (phase === "flop" && arr[0] && arr[1] && arr[2]) {
          if (!flopAnimatedRef.current) {
            flopAnimatedRef.current = true;
            flopAnimateTimeoutsRef.current.forEach((t) => clearTimeout(t));
            flopAnimateTimeoutsRef.current = [];
            setCommunityCardsState([arr[0], null, null, null, null]);
            const t1 = setTimeout(() => setCommunityCardsState((_prev) => [arr[0]!, arr[1]!, null, null, null]), 800);
            const t2 = setTimeout(() => setCommunityCardsState(arr), 1600);
            flopAnimateTimeoutsRef.current = [t1, t2];
          } else {
            setCommunityCardsState(arr);
          }
        } 
        else if (phase === "turn" && arr[3] && !arr[4]) {
          flopAnimatedRef.current = false;
          const currentComm = communityCardsStateRef.current;
          if (!currentComm[3]) {
            setCommunityCardsState([arr[0]!, arr[1]!, arr[2]!, null, null]);
            setTimeout(() => setCommunityCardsState(arr), 800);
          } else {
            setCommunityCardsState(arr);
          }
        }
        else if (phase === "river" && arr[4]) {
          const currentComm = communityCardsStateRef.current;
          if (!currentComm[4]) {
            setCommunityCardsState([arr[0]!, arr[1]!, arr[2]!, arr[3]!, null]);
            setTimeout(() => setCommunityCardsState(arr), 800);
          } else {
            setCommunityCardsState(arr);
          }
        } 
        else {
          if (phase !== "flop") flopAnimatedRef.current = false;
          setCommunityCardsState(arr);
        }
      }
      setGameInitialized(phase !== "init");
      setHasPlayerActed(false);
      setIsLoading(false);
      setRoundPlayersActed(new Set());

      const humanServerChips = !isSpectating ? players.find((p) => String(p.id) === String(userId))?.chips : undefined;
      if (humanServerChips != null) {
        setPlayerChips(humanServerChips);
      }

      const currentTurnId = gameState.currentTurn != null ? String(gameState.currentTurn) : "";
      if (phase === "showdown" && !isSpectating) {
        setTimerActive(false);
      } else if (currentTurnId === String(userId)) {
        setTimerActive(true);
        setTimeLeft(turnTimeLimitSecRef.current);
      }
      const hasShowdownWinner = gameState.showdownWinnerId || (gameState.showdownWinnerIds && gameState.showdownWinnerIds.length > 0);
      if (phase === "showdown" && hasShowdownWinner) {
        const winnerIds = gameState.showdownIsSplit && gameState.showdownWinnerIds?.length
          ? gameState.showdownWinnerIds
          : [gameState.showdownWinnerId!];
        const firstWinnerId = winnerIds[0]!;
        const winnerName = gameState.showdownIsSplit && winnerIds.length > 1
          ? t('game.tie')
          : (players.find((p) => String(p.id) === String(firstWinnerId))?.name ?? firstWinnerId);
        const totalPot = gameState.showdownPot ?? 0;
        const potWon = winnerIds.length > 1 ? Math.floor(totalPot / winnerIds.length) : totalPot;
        const humanChipsAfter = humanServerChips ?? 0;
        const balanceChange = humanChipsAfter - startOfHandChipsRef.current;
        addToUserBalance(balanceChange);

        // Multi : on déclenche la transition directe à la place du vieux ShowdownDisplay !
        setShowdownResult({
          winnerId: firstWinnerId,
          winnerIds: winnerIds.length > 1 ? winnerIds : undefined,
          winnerName,
          hand: gameState.showdownHandName ?? "—",
          pot: potWon,
          isSplit: gameState.showdownIsSplit ?? false,
          handRank: 0
        });
      }

      const la = (gameState as {
        lastHandAction?: {
          playerId: string;
          playerName: string;
          action: string;
          amount?: number;
          street: string;
          actionVersion: number;
          actorRole?: string;
        };
      }).lastHandAction;
      if (
        la &&
        typeof la.actionVersion === "number" &&
        incomingVersion >= 0 &&
        la.actionVersion === incomingVersion &&
        incomingHandId &&
        (la.action === "FOLD" || la.action === "CHECK" || la.action === "CALL" || la.action === "RAISE")
      ) {
        const dedupeKey = `${incomingHandId}:${la.actionVersion}`;
        if (lastHandLogSocketDedupeRef.current !== dedupeKey) {
          lastHandLogSocketDedupeRef.current = dedupeKey;
          const streetMap: Record<string, "preflop" | "flop" | "turn" | "river"> = {
            PREFLOP: "preflop",
            FLOP: "flop",
            TURN: "turn",
            RIVER: "river",
          };
          const streetKey = streetMap[la.street] ?? "preflop";
          const streetLabel = t(`game.actionLogStreet.${streetKey}`);
          const nameBase = String(la.playerId) === String(userId) ? t("game.you") : la.playerName;
          const roleAbb = actionLogRoleAbbrev(la.actorRole, t);
          const name = roleAbb ? `${nameBase} (${roleAbb})` : nameBase;
          const amt = typeof la.amount === "number" ? la.amount : 0;
          const detail =
            la.action === "CHECK"
              ? t("game.actionLogCheck", { name })
              : la.action === "FOLD"
                ? t("game.actionLogFold", { name })
                : la.action === "CALL"
                  ? t("game.actionLogCall", { name, amount: amt })
                  : t("game.actionLogRaise", { name, amount: amt });
          const line = t("game.actionLogLine", { street: streetLabel, detail });
          setHandActionLog((prev) => [...prev.slice(-99), { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, line }]);
        }
      }
    };
    const onGameUpdateMain = (state: Parameters<typeof onGameUpdate>[1]) => onGameUpdate("GAME_UPDATE", state);
    const onGameStateUpdated = (state: Parameters<typeof onGameUpdate>[1]) => onGameUpdate("GAME_STATE_UPDATED", state);
    socket.on("GAME_UPDATE", onGameUpdateMain);
    socket.on("GAME_STATE_UPDATED", onGameStateUpdated);
    const onGameEnded = (data: {
      gameId: string;
      winnerId?: string;
      reason: string;
      pot?: number;
      roomId?: string;
    }) => {
      if (data.reason === "opponent_left" && data.winnerId != null && String(data.winnerId) === String(userId)) {
        const balanceChange = Math.round(data.pot ?? 0);
        addToUserBalance(balanceChange);
        setShowdownResult((prevResult) => {
          if (prevResult) return prevResult;
          return {
            winnerId: data.winnerId,
            winnerName: "Vous",
            hand: t('game.opponentLeft'),
            handRank: 0,
            pot: data.pot ?? 0,
            skipRevealDelay: true,
          };
        });
      }
      if (
        (data.reason === "heads_up_peer_left" || data.reason === "all_players_left") &&
        data.roomId &&
        String(data.gameId) === String(gameIdParam)
      ) {
        navigate(`/waiting-room?roomId=${encodeURIComponent(data.roomId)}`, {
          replace: true,
          state: { message: t("game.cashTableClosedReturnToWaitingRoom") },
        });
      }
    };
    socket.on("GAME_ENDED", onGameEnded);
    const onCashWaiting = (state: { cashCountdownEndsAt?: number; cashSeats?: { seatIndex: number; userId: string | null; username: string | null; chips: number }[] }) => {
      setCashWaitingPlayers(true);
      setShowTransition(false); // jamais l’overlay jaune « prochaine manche » entre deux mains cash
      setShowInterHandPanel(false); // on attend d’abord la phase d’abattage
      setHasClickedReadyThisInterHand(false);
      setCashCountdownEndsAt(null);
      setNextHandReadyUserIds([]);
      setAllNextHandReady(false);
      if (state.cashSeats) setCashSeats(state.cashSeats);
    };
    socket.on("CASH_WAITING_PLAYERS", onCashWaiting);

    const onNextHandReadyUpdated = (data: { readyUserIds?: string[]; allReady?: boolean }) => {
      setNextHandReadyUserIds(Array.isArray(data.readyUserIds) ? data.readyUserIds : []);
      setAllNextHandReady(Boolean(data.allReady));
    };
    socket.on("CASH_NEXT_HAND_READY_UPDATED", onNextHandReadyUpdated);
    const onQueueStatus = (data: { queued: boolean }) => setSpectatorWantsToRejoin(data.queued);
    socket.on("SPECTATOR_QUEUE_STATUS", onQueueStatus);
    return () => {
      socket.off("GAME_UPDATE", onGameUpdateMain);
      socket.off("GAME_STATE_UPDATED", onGameStateUpdated);
      socket.off("GAME_ENDED", onGameEnded);
      socket.off("CASH_WAITING_PLAYERS", onCashWaiting);
      socket.off("CASH_NEXT_HAND_READY_UPDATED", onNextHandReadyUpdated);
      socket.off("SPECTATOR_QUEUE_STATUS", onQueueStatus);
    };
  }, [socket, gameIdParam, userId, isSpectating, navigate, t]);

  useEffect(() => {
    if (!handResult || !gameIdParam || isBotMode || !userId) return;
    fetch(apiUrl(`/api/game/${gameIdParam}/room-info`))
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.hostId && String(data.hostId) === String(userId)) setIsRematchHost(true);
      })
      .catch(() => {});
  }, [handResult, gameIdParam, isBotMode, userId]);

  // On garde cashCountdownEndsAt uniquement pour que le state soit cohérent,
  // mais on ne l’utilise plus pour aucun affichage de countdown côté UI.

  useEffect(() => {
    if (!socket) return;
    const onRematch = (data: { newRoomId: string }) => {
      if (data?.newRoomId) navigate(`/waiting-room?roomId=${data.newRoomId}`);
    };
    socket.on("REMATCH_CREATED", onRematch);
    return () => socket.off("REMATCH_CREATED", onRematch);
  }, [socket, navigate]);

  useEffect(() => {
    if (phase !== "init" || deck.length === 0) return;
    const t = setTimeout(() => setPhase("shuffle"), 800);
    return () => clearTimeout(t);
  }, [phase, deck.length]);

  useEffect(() => {
    if (phase !== "shuffle") return;
    setShuffleCount(0);
    const shuffleInterval = setInterval(() => {
      setShuffleCount((prev) => (prev >= 8 ? prev : prev + 1));
    }, 150);
    const t = setTimeout(() => {
      clearInterval(shuffleInterval);
      setPhase("deal");
      dealCardsToPlayers(deck, playersState);
    }, 1500);
    return () => {
      clearInterval(shuffleInterval);
      clearTimeout(t);
    };
  }, [phase]);

  useEffect(() => {
    if (!socket) return;
    socket.on("TURN_TIMER", (data: { gameId: string; timeLeft: number }) => {
      if (phaseRef.current === "showdown") return;
      if (typeof data.timeLeft === "number" && data.timeLeft > 0) {
        turnTimeLimitSecRef.current = data.timeLeft;
      }
      setTimeLeft(data.timeLeft);
      setTimerActive(true);
    });
    return () => socket.off("TURN_TIMER");
  }, [socket]);

  useEffect(() => {
    if (!isMyTurn || !gameInitialized || phase === "init" || phase === "shuffle" || phase === "deal" || phase === "showdown") {
      setTimerActive(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    if (hero?.hasFolded) {
      setTimerActive(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }

    setTimerActive(true);
    setTimeLeft(gameIdParam ? turnTimeLimitSecRef.current : 30);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          setTimerActive(false);
          if (callAmount === 0) {
            handleCheck();
          } else {
            handleFold();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isMyTurn, gameInitialized, phase, callAmount]);

  useEffect(() => {
    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    const heroCards = hero?.cards ?? [];
    if (heroCards.length === 2 && phase !== "init" && phase !== "shuffle" && phase !== "deal") {
      const oppCount = playersState.filter((p) => !(p.hasFolded ?? false) && p.id !== hero?.id).length;
      updateQuantumHUD(heroCards as { suit: string; value: string }[], communityCardsState, Math.max(1, oppCount));
    }
  }, [playersState, communityCardsState, phase, userId, updateQuantumHUD]);

  useEffect(() => {
    if (isMyTurn && !hasFoldedFromState && !hasPlayerActed) {
      setIsLoading(false);
      setTimerActive(true);
    }
  }, [isMyTurn, hasFoldedFromState, hasPlayerActed]);

  useEffect(() => {
    if (!isBotMode || playersState.length < 2) return;
    if (phase !== "preflop" && phase !== "flop" && phase !== "turn" && phase !== "river") return;
    const activeIdx = playersState.findIndex((p) => p.isActive);
    if (activeIdx === -1) return;
    if (!roundPlayersActed.has(activeIdx)) return;
    const activeInHand = playersState.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false));
    if (roundPlayersActed.size >= activeInHand.length) return;
    let nextIdx = (activeIdx + 1) % playersState.length;
    for (let i = 0; i < playersState.length; i++) {
      const p = playersState[nextIdx];
      if (p.isConnected !== false && !(p.hasFolded ?? false) && (p.chips ?? 0) > 0 && !roundPlayersActed.has(nextIdx)) {
        setPlayersState((prev) =>
          prev.map((pl, j) => ({ ...pl, isActive: j === nextIdx }))
        );
        setHasPlayerActed(false);
        setIsLoading(false);
        return;
      }
      nextIdx = (nextIdx + 1) % playersState.length;
    }
  }, [isBotMode, playersState, phase, roundPlayersActed]);

  useEffect(() => {
    if (!isBotMode || !isBotThinking) return;
    const stuck = setTimeout(() => {
      if (botIsFetchingRef.current || isBotThinking) {
        console.warn("[QB] Bot stuck detected, forcing action");
        const activePlayer = playersState.find((p) => p.isActive && "isBot" in p && p.isBot);
        if (activePlayer) {
          if (callAmount === 0) handleCheck(activePlayer.id);
          else handleFold(activePlayer.id);
        }
        setIsBotThinking(false);
        botIsFetchingRef.current = false;
      }
    }, 15000);
    return () => clearTimeout(stuck);
  }, [isBotThinking, isBotMode]);

  const nextTurn = (justActedIndex?: number) => {
    const idx =
      justActedIndex !== undefined
        ? justActedIndex
        : playersStateRef.current.findIndex((p) => p.isActive);

    if (idx === -1) return;

      const activeInHandCount = playersStateRef.current.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false)).length;

    setRoundPlayersActed((prev) => {
      const next = new Set(prev).add(idx);
        if (!gameIdParam && next.size >= activeInHandCount) bothActedNoTurnRef.current = true;
        if (!gameIdParam && next.size >= activeInHandCount) {
        const currentPhase = phase;
        setTimeout(() => {
          const latestPlayers = playersStateRef.current;
          const latestActive = latestPlayers.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false));
          if (latestActive.length < 2) return;
          const maxBet = Math.max(0, ...latestActive.map((p) => p.bet ?? 0));
          const bettingComplete = latestActive.every((p) => (p.bet ?? 0) === maxBet || (p.chips ?? 0) === 0);
          const hasAllIn = latestActive.some((p) => (p.chips ?? 0) === 0);
          if (bettingComplete && !hasAllIn && streetTransitionScheduledRef.current !== currentPhase) {
            streetTransitionScheduledRef.current = currentPhase;
            if (streetTransitionTimeoutRef.current) {
              clearTimeout(streetTransitionTimeoutRef.current);
              streetTransitionTimeoutRef.current = null;
            }
            streetTransitionTimeoutRef.current = setTimeout(() => {
              streetTransitionTimeoutRef.current = null;
              doStreetTransitionRef.current?.();
            }, 1000);
          }
        }, 200);
      }
      return next;
    });

    setPlayersState((prev) => {
      const newPlayers = prev.map((p) => ({ ...p }));
      newPlayers[idx] = { ...newPlayers[idx], isActive: false };

      if (bothActedNoTurnRef.current) {
        bothActedNoTurnRef.current = false;
        return newPlayers;
      }

      const nextPlayerWithChips = (startIndex: number): number => {
        let nextIndex = startIndex;
        let loopCount = 0;
        while (loopCount < newPlayers.length) {
          const p = newPlayers[nextIndex];
          if (
            p.isConnected !== false &&
            !(p.hasFolded ?? false) &&
            (p.chips ?? 0) > 0
          ) {
            return nextIndex;
          }
          nextIndex = (nextIndex + 1) % newPlayers.length;
          loopCount++;
        }
        return -1;
      };

        const nextIndex = nextPlayerWithChips((idx + 1) % newPlayers.length);
        if (nextIndex !== -1) {
          newPlayers[nextIndex] = { ...newPlayers[nextIndex], isActive: true };
        }

      return newPlayers;
    });

    setHasPlayerActed(false);
    setIsLoading(false);
  };

  useEffect(() => {
    if (gameIdParam && !isBotMode) {
      return;
    }
    if (phase === "preflop" || phase === "flop" || phase === "turn" || phase === "river") {
      const players = playersState;
      const activeInHand = players.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false));
      if (activeInHand.length === 0) return;
      const activeIdx = players.findIndex((p) => p.isActive);
      const humanIndex = players.findIndex((p) => String(p.id) === String(userId) || p.id === "human");
      const humanInHand = humanIndex >= 0 && !(players[humanIndex]?.hasFolded ?? false);

      if (humanInHand && !roundPlayersActed.has(humanIndex)) return;
      if (gameIdParam && activeIdx >= 0 && !("isBot" in players[activeIdx] && players[activeIdx].isBot) && !roundPlayersActed.has(activeIdx)) return;

      if (activeInHand.length === 1) {
        const t = setTimeout(() => setPhase("showdown"), 1500);
        return () => clearTimeout(t);
      }

      const maxBet = Math.max(0, ...activeInHand.map((p) => p.bet ?? 0));
      const bettingComplete = activeInHand.every((p) => (p.bet ?? 0) === maxBet || (p.chips ?? 0) === 0);
      const hasAllIn = activeInHand.some((p) => (p.chips ?? 0) === 0);

      if (roundPlayersActed.size >= activeInHand.length && bettingComplete) {
        if (hasAllIn && runOutPhase === null && !gameIdParam) {
          setPlayersState((prev) => prev.map((p) => ({ ...p, isActive: false })));
          setRunOutPhase(phase);
        } else if (!hasAllIn && gameIdParam) {
          // Local (!gameIdParam): nextTurn + bot action path already schedule transitions; doing it here too
          // stacks orphan timeouts on streetTransitionTimeoutRef (overwrite without clear) → double dealTurn/dealRiver.
          if (streetTransitionScheduledRef.current === phase) return;
          streetTransitionScheduledRef.current = phase;
          if (streetTransitionTimeoutRef.current) {
            clearTimeout(streetTransitionTimeoutRef.current);
            streetTransitionTimeoutRef.current = null;
          }
          streetTransitionTimeoutRef.current = setTimeout(() => {
            streetTransitionTimeoutRef.current = null;
            doStreetTransitionRef.current?.();
          }, 1000);
        }
      }
    }
  }, [roundPlayersActed, phase, gameIdParam, userId, runOutPhase, playersState]);

  useEffect(() => {
    if (phase !== "preflop" || !gameInitialized || hasSetStartOfHandThisHandRef.current) return;
    const humanRow = playersState.find((p) => String(p.id) === String(userId) || p.id === "human");
    const humanChips = humanRow?.chips ?? playerChips;
    startOfHandChipsRef.current = humanChips;
    hasSetStartOfHandThisHandRef.current = true;
  }, [phase, gameInitialized, playerChips, playersState, userId]);

  useEffect(() => {
    deckRef.current = deck;
    communityCardsStateRef.current = communityCardsState;
  }, [deck, communityCardsState]);

  useEffect(() => {
    doStreetTransitionRef.current = () => {
      const p = phaseRef.current;
      if (p === "preflop") dealFlop();
      else if (p === "flop") dealTurn();
      else if (p === "turn") dealRiver();
      else if (p === "river") setPhase("showdown");
    };
  }, [dealFlop, dealTurn, dealRiver, gameIdParam, isBotMode]);

  useEffect(() => {
    if (phase === "init" || phase === "shuffle" || phase === "deal") {
      setRunOutPhase(null);
      hasSetStartOfHandThisHandRef.current = false;
      setGameOverReason(null);
      streetTransitionScheduledRef.current = null;
    } else if (phase === "flop" || phase === "turn" || phase === "river") {
      streetPhaseEnteredRef.current = Date.now();
    }
  }, [phase]);

  useEffect(() => {
    if (streetTransitionTimeoutRef.current) {
      clearTimeout(streetTransitionTimeoutRef.current);
      streetTransitionTimeoutRef.current = null;
    }
    streetTransitionScheduledRef.current = null;
  }, [phase]);

  useEffect(() => {
    if (!isBotMode || gameIdParam) return; 
    if (phase !== "flop" && phase !== "turn" && phase !== "river") return;
    const interval = setInterval(() => {
      const players = playersStateRef.current;
      const activeInHand = players.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false));
      if (activeInHand.length < 2) return;
      const maxBet = Math.max(0, ...activeInHand.map((p) => p.bet ?? 0));
      const bettingComplete = activeInHand.every((p) => (p.bet ?? 0) === maxBet || (p.chips ?? 0) === 0);
      const hasAllIn = activeInHand.some((p) => (p.chips ?? 0) === 0);
      if (!bettingComplete || hasAllIn) return;
      const acted = roundPlayersActedRef.current;
      if (acted.size < activeInHand.length) return;
      if (Date.now() - streetPhaseEnteredRef.current < 20000) return;
      console.warn("[QB] Street stuck >20s, forcing transition");
      doStreetTransitionRef.current?.();
    }, 5000);
    return () => clearInterval(interval);
  }, [isBotMode, gameIdParam, phase]);

  useEffect(() => {
    if (runOutPhase === null) return;
    const t = setTimeout(() => {
      const currentDeck = [...deckRef.current];
      const currentCommunity = [...communityCardsStateRef.current].slice(0, 5) as (Card | null)[];
      while (currentCommunity.length < 5) currentCommunity.push(null);

      if (runOutPhase === "preflop") {
        setPhase("flop");
        resetBetsAndSetFirstToAct(getPostflopFirstActIndex());
        currentDeck.shift(); 
        for (let i = 0; i < 3; i++) {
          const card = currentDeck.shift();
          if (card) currentCommunity[i] = card;
        }
        setDeck(currentDeck);
        setCommunityCardsState([...currentCommunity]);
        setRunOutPhase("flop");
      } else if (runOutPhase === "flop") {
        currentDeck.shift(); 
        const turnCard = currentDeck.shift();
        if (turnCard) currentCommunity[3] = turnCard;
        setDeck(currentDeck);
        setCommunityCardsState([...currentCommunity]);
        setPhase("turn");
        setRunOutPhase("turn");
      } else if (runOutPhase === "turn") {
        currentDeck.shift(); 
        const riverCard = currentDeck.shift();
        if (riverCard) currentCommunity[4] = riverCard;
        setDeck(currentDeck);
        setCommunityCardsState([...currentCommunity]);
        setPhase("river");
        setRunOutPhase("river");
      } else if (runOutPhase === "river") {
        setPhase("showdown");
        setRunOutPhase(null);
      }
    }, runOutPhase === "preflop" ? 800 : 1400);
    return () => clearTimeout(t);
  }, [runOutPhase]);

  useEffect(() => {
    if (phase === "init" || phase === "shuffle") {
      showdownStartedRef.current = false;
      setShowdownReveal(false);
      setShowdownWinnerCards([]);
      setPendingShowdownData(null);
      setHandResult(null);
      setHandResultData(null);
      // Ne pas reset la fenêtre inter-main ici :
      // entre les mains, la phase côté UI peut repasser en "init"/"shuffle" tout en attendant le système "ready".
    }
  }, [phase]);

  // Affichage du panneau inter-mains : seulement après 3s d’abattage, puis attente des ready.
  useEffect(() => {
    if (!cashWaitingPlayers) {
      setShowInterHandPanel(false);
      setHasClickedReadyThisInterHand(false);
      return;
    }
    // On laisse 3s d’abattage “pur” avant de montrer les résultats + boutons ready.
    const id = window.setTimeout(() => {
      setShowInterHandPanel(true);
    }, SHOWDOWN_REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [cashWaitingPlayers, SHOWDOWN_REVEAL_MS]);


  useEffect(() => {
    if (!cashWaitingPlayers) return;
    setInterHandResultsVisible(false);
  }, [cashWaitingPlayers]);

  useEffect(() => {
    if (!cashWaitingPlayers) return;
    if (showInterHandPanel) setInterHandResultsVisible(true);
  }, [cashWaitingPlayers, showInterHandPanel]);

  useEffect(() => {
    if (phase !== "showdown" || showdownResult !== null || handResult !== null || !isBotMode || playersState.length < 2) return;
    if (showdownStartedRef.current) return;
    const activeInHand = playersState.filter((p) => !(p.hasFolded ?? false) && p.cards?.length === 2);
    if (activeInHand.length < 2) return;
    const validCommunity = communityCardsState.filter((c): c is Card => c !== null);
    const fromRef = communityCardsStateRef.current.filter((c): c is Card => c !== null);
    const community = validCommunity.length >= 5 ? validCommunity : fromRef.length >= 5 ? fromRef : validCommunity;
    if (community.length < 5) return;

    if (activeInHand.length === 1) {
      const sole = activeInHand[0];
      showdownStartedRef.current = true;
      const applySoleWinner = async () => {
        let handName = "Haute carte";
        try {
          const res = await fetch(apiUrl("/api/bot/evaluate-winner"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              players: [{ id: String(sole.id), name: sole.name, cards: sole.cards }],
              communityCards: validCommunity,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            handName = data.handName ?? "Haute carte";
          }
        } catch { /* ignore */ }
        setPlayersState((prev) => prev.map((p) => (p.id === sole.id ? { ...p, chips: (p.chips ?? 0) + pot } : p)));
        if (sole.id === userId || sole.id === "human") setPlayerChips((prev) => prev + pot);
        setPot(0);
        setShowdownResult({ winnerId: String(sole.id), winnerName: sole.name, hand: handName, handRank: 0, pot });
      };
      applySoleWinner();
      return;
    }

    showdownStartedRef.current = true;
    let pots: { amount: number; eligibleIds: string[] }[];
    try {
      pots = calculateSidePots(playersState, handContributionsRef.current);
    } catch {
      pots = [{ amount: pot, eligibleIds: activeInHand.map((p) => String(p.id)) }];
    }
    if (pots.length > 1) setSidePots(pots);

    const currentPot = pot;
    const humanId = String(playersState.find((p) => p.id === userId || p.id === "human")?.id ?? "human");
    let mainWinnerName = "";
    let mainHandName = "Haute carte";
    let mainWinnerId = "";
    let mainIsSplit = false;
    const FETCH_TIMEOUT_MS = 8000;

    const applyFallback = (handNameOverride?: string) => {
      const fallbackWinner = activeInHand.find((p) => String(p.id) !== humanId) ?? activeInHand[0];
      setPot(0);
      setShowdownResult({
        winnerId: String(fallbackWinner?.id ?? ""),
        winnerName: fallbackWinner?.name ?? "Inconnu",
        hand: handNameOverride ?? "Haute carte",
        handRank: 0,
        pot: currentPot,
      });
      if (fallbackWinner) {
        setPlayersState((prev) => prev.map((p) => (p.id === fallbackWinner.id ? { ...p, chips: (p.chips ?? 0) + currentPot } : p)));
        if (fallbackWinner.id === userId || fallbackWinner.id === "human") setPlayerChips((prev) => prev + currentPot);
        const hero = playersState.find((p) => p.id === userId || p.id === "human");
        const startChips = startOfHandChipsRef.current;
        const stackBefore = hero?.chips ?? playerChips;
        const humanWonFb = fallbackWinner.id === userId || fallbackWinner.id === "human";
        const endChips = humanWonFb ? stackBefore + currentPot : stackBefore;
        const balanceChange = endChips - startChips;
        const toAddFb = isBotMode ? (balanceChange > 0 ? Math.round(balanceChange * winMultiplier) : balanceChange) : balanceChange;
        addToUserBalance(toAddFb);
        toAddLastRef.current = toAddFb;
      }
    };

    const runComplete = async () => {
      try {
        const effectivePots = pots.length > 0 ? pots : [{ amount: currentPot, eligibleIds: activeInHand.map((p) => String(p.id)) }];
        const awards: Record<string, number> = {};

        for (let pi = 0; pi < effectivePots.length; pi++) {
          const sp = effectivePots[pi];
          const eligible = activeInHand.filter((p) => sp.eligibleIds.includes(String(p.id)));
          if (eligible.length === 0) continue;
          if (eligible.length === 1) {
            awards[String(eligible[0].id)] = (awards[String(eligible[0].id)] ?? 0) + sp.amount;
            if (pi === 0) { mainWinnerId = String(eligible[0].id); mainWinnerName = eligible[0].name; }
            continue;
          }
          const url = apiUrl("/api/bot/evaluate-winner");
          const controller = new AbortController();
          const to = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              players: eligible.map((p) => ({ id: String(p.id), name: p.name, cards: p.cards })),
              communityCards: validCommunity,
            }),
            signal: controller.signal,
          });
          clearTimeout(to);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data: { winnerId?: string; winnerIds?: string[]; winnerName?: string; isSplit?: boolean; handName?: string; handRank?: number } = await res.json();
          const winnerIds = data.winnerIds ?? (data.winnerId ? [data.winnerId] : []);
          if (winnerIds.length === 0) continue;

          if (pi === 0) {
            mainWinnerId = winnerIds[0];
            mainWinnerName = data.isSplit ? t('game.tie') : (data.winnerName ?? winnerIds[0]);
            mainHandName = data.handName ?? "Haute carte";
            mainIsSplit = data.isSplit === true && winnerIds.length > 1;
            const winner = activeInHand.find((p) => String(p.id) === winnerIds[0]);
            if (winner?.cards) setShowdownWinnerCards(winner.cards);
          }

          const share = Math.floor(sp.amount / winnerIds.length);
          const remainder = sp.amount - share * winnerIds.length;
          winnerIds.forEach((wid, wi) => {
            awards[wid] = (awards[wid] ?? 0) + share + (wi === 0 ? remainder : 0);
          });
        }

        setPlayersState((prev) =>
          prev.map((p) => {
            const award = awards[String(p.id)] ?? 0;
            return award > 0 ? { ...p, chips: p.chips + award } : p;
          })
        );
        const humanShare = awards[humanId] ?? 0;
        if (humanShare > 0) setPlayerChips((prev) => prev + humanShare);

        const startChips = startOfHandChipsRef.current;
        const heroRow = playersState.find((p) => String(p.id) === humanId || p.id === "human");
        const stackBeforePotAward = heroRow?.chips ?? playerChips;
        const endChips = stackBeforePotAward + humanShare;
        const balanceChange = endChips - startChips;
        const toAdd = isBotMode ? (balanceChange > 0 ? Math.round(balanceChange * winMultiplier) : balanceChange) : balanceChange;
        addToUserBalance(toAdd);
        toAddLastRef.current = toAdd;
        setPot(0);
        setShowdownResult({
          winnerId: mainIsSplit ? "" : mainWinnerId,
          winnerName: mainWinnerName,
          hand: mainHandName,
          handRank: 0,
          pot: currentPot,
          isSplit: mainIsSplit,
        });
      } catch {
        let fallbackHand = "Haute carte";
        try {
          const fw = activeInHand.find((p) => String(p.id) !== humanId) ?? activeInHand[0];
          if (fw?.cards?.length === 2) {
            const r = await fetch(apiUrl("/api/bot/evaluate-winner"), {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ players: [{ id: String(fw.id), name: fw.name, cards: fw.cards }], communityCards: validCommunity }),
            });
            if (r.ok) { const d = await r.json(); fallbackHand = d.handName ?? fallbackHand; }
          }
        } catch { /* ignore */ }
        applyFallback(fallbackHand);
      }
    };
    runComplete();
  }, [phase, showdownResult, handResult, isBotMode, playersState, communityCardsState, pot, winMultiplier, userId]);

  showdownResultRef.current = showdownResult;
  useEffect(() => {
    if (!isBotMode || phase !== "showdown" || showdownResult !== null || handResult !== null) return;
    const safety = setTimeout(async () => {
      if (showdownResultRef.current !== null) return;
      console.warn("[QB] Showdown safety: forcing completion after 12s");
      const active = playersState.filter((p) => !(p.hasFolded ?? false) && p.cards?.length === 2);
      const winner = active[0] ?? playersState.find((p) => !(p.hasFolded ?? false)) ?? playersState[0];
      const currentPot = pot;
      let safetyHand = "Haute carte";
      const validComm = communityCardsState.filter((c): c is Card => c !== null);
      if (winner && (winner as BasePlayer | BotPlayer).cards?.length === 2 && validComm.length >= 5) {
        try {
          const r = await fetch(apiUrl("/api/bot/evaluate-winner"), {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ players: [{ id: String(winner.id), name: winner.name, cards: (winner as BasePlayer | BotPlayer).cards }], communityCards: validComm }),
          });
          if (r.ok) { const d = await r.json(); safetyHand = d.handName ?? safetyHand; }
        } catch { /* ignore */ }
      }
      setPot(0);
      showdownStartedRef.current = true;
      if (winner) {
        setPlayersState((prev) => prev.map((p) => (p.id === winner.id ? { ...p, chips: (p.chips ?? 0) + currentPot } : p)));
        if (winner.id === userId || winner.id === "human") setPlayerChips((prev) => prev + currentPot);
        setShowdownWinnerCards((winner as BasePlayer | BotPlayer).cards ?? []);
      }
      setShowdownResult({
        winnerId: String(winner?.id ?? ""),
        winnerName: (winner?.name as string) ?? "—",
        hand: safetyHand,
        handRank: 0,
        pot: currentPot,
      });
      const heroSafety = playersState.find((p) => p.id === userId || p.id === "human");
      const startChipsSafety = startOfHandChipsRef.current;
      const humanWonSafety = winner && (winner.id === userId || winner.id === "human");
      const stackBeforeSafety = heroSafety?.chips ?? playerChips;
      const endChipsSafety = humanWonSafety ? stackBeforeSafety + currentPot : stackBeforeSafety;
      const balanceChangeSafety = endChipsSafety - startChipsSafety;
      const toAddSafety = isBotMode
        ? balanceChangeSafety > 0
          ? Math.round(balanceChangeSafety * winMultiplier)
          : balanceChangeSafety
        : balanceChangeSafety;
      addToUserBalance(toAddSafety);
      toAddLastRef.current = toAddSafety;
    }, 12000);
    return () => clearTimeout(safety);
  }, [phase, showdownResult, handResult, isBotMode, playersState, pot, userId, winMultiplier]);

  useEffect(() => {
    if (!isBotMode || !showdownResult || gameOverReason) return;
    const human = playersState.find((p) => p.id === userId || p.id === "human");
    const stack = human?.chips ?? playerChips;
    if (stack <= 0) {
      setGameOverReason("human_eliminated");
      return;
    }
    const allBotsEliminated = playersState
      .filter((p) => "isBot" in p && p.isBot)
      .every((p) => (p.chips ?? 0) <= 0);
    if (allBotsEliminated) setGameOverReason("bot_eliminated");
  }, [isBotMode, showdownResult, playerChips, playersState, userId, gameOverReason]);

  useEffect(() => {
    if (!isBotMode || playersState.length === 0) return;
    if (phase === "init" || phase === "shuffle" || phase === "deal") return;
    if (handResult !== null) return;

    const activePlayer = playersState.find((p) => p.isActive);
    if (!activePlayer) return;

    const isBotTurn = "isBot" in activePlayer && activePlayer.isBot;
    if (!isBotTurn || isBotThinking || botIsFetchingRef.current) return;

    setIsBotThinking(true);
    botIsFetchingRef.current = true;

    const fetchBotDecision = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const url = apiUrl("/api/bot/action");
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            playerCards: activePlayer.cards,
            communityCards: communityCardsState.filter((c): c is Card => c !== null),
            difficulty: "isBot" in activePlayer ? activePlayer.difficulty : "medium",
            currentBet: currentBet,
            playerChips: activePlayer.chips,
            callAmount,
            minRaise: BOT_TABLE_DEFAULTS.MIN_RAISE_FOR_BOT_API,
            potSize: pot,
            position: activePlayer.position,
            playersCount: playersState.filter((p) => p.isConnected !== false).length,
          }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          await response.text();
          addToast(`Erreur bot (${response.status})`, "error");
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
          return;
        }

        const decision = await response.json();
        const botCurrentBet = activePlayer.bet ?? 0;
        const amountFromServer = intChips(decision.amount ?? 0);
        const amountToPut =
          decision.action === "RAISE"
            ? intChips(Math.max(0, amountFromServer - botCurrentBet))
            : decision.action === "CALL"
              ? intChips(Math.min(decision.amount ?? callAmount, activePlayer.chips ?? 0))
              : 0;

        const botActionLabel =
          decision.action === "FOLD"
            ? t('game.actionFolded')
            : decision.action === "CHECK" || (decision.action === "RAISE" && amountToPut <= 0)
              ? t('game.actionChecked')
              : decision.action === "CALL" || (decision.action === "RAISE" && amountToPut <= callAmount)
                ? t('game.actionCalled')
                : t('game.actionRaised');
        if (clearBotActionRef.current) clearTimeout(clearBotActionRef.current);
        setLastBotAction({ name: activePlayer.name, action: botActionLabel });
        clearBotActionRef.current = setTimeout(() => {
          setLastBotAction(null);
          clearBotActionRef.current = null;
        }, 5000);

        setTimeout(() => {
          switch (decision.action) {
            case "FOLD":
              handleFold(activePlayer.id);
              break;
            case "CALL": {
              const effectiveCall = intChips(
                Math.min(decision.amount ?? callAmount, callAmount, activePlayer.chips ?? 0)
              );
              handleCall(effectiveCall, activePlayer.id);
              break;
            }
            case "CHECK":
              handleCheck(activePlayer.id);
              break;
            case "RAISE": {
              if (amountToPut <= 0) {
                handleCheck(activePlayer.id);
              } else if (amountToPut <= callAmount) {
                handleCall(amountToPut, activePlayer.id);
              } else {
                handleRaise(amountToPut - callAmount, activePlayer.id);
              }
              break;
            }
          }
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
        }, 3000);
      } catch (error) {
        console.error("Erreur API bot:", error);
        clearTimeout(timeoutId);
        setTimeout(() => {
          if (callAmount === 0) handleCheck(activePlayer.id);
          else handleFold(activePlayer.id);
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
        }, 500);
      }
    };

    fetchBotDecision();
  }, [isBotMode, playersState, isBotThinking, phase, communityCardsState, pot, callAmount, addToast, handResult]);

  useEffect(() => {
    if (handResult === null || !isBotMode) return;
    const token = localStorage.getItem("token");
    const recordUrl = apiUrl("/api/game/record-result");
    
    if (token) {
      fetch(recordUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ won: handResult === "win", delta: toAddLastRef.current }),
      })
        .then((r) => r.json().catch(() => ({})))
        .then((data) => {
          if (data && typeof data === "object") {
            mergeGamificationFromServerResponse(data as Record<string, unknown>);
          }
        })
        .catch((err) => console.error("Erreur de sauvegarde d'argent :", err));
    }
  }, [handResult, isBotMode]);

  const handleFold = (playerId?: number | string) => {
    if (handResult !== null) return;
    const heroId = playersState.find((p) => p.id === userId || p.id === "human")?.id;
    const isHuman = playerId === undefined || playerId === heroId;
    if (gameIdParam && isHuman && !socket) return;
    if (gameIdParam && socket && isHuman) {
      actionSeqRef.current += 1;
      socket.emit("PLAYER_ACTION", {
        gameId: gameIdParam,
        playerId: String(userId),
        action: "FOLD",
        handId: handIdRef.current,
        expectedStreet: String(phase).toUpperCase(),
        actionId: `act-${Date.now()}-${actionSeqRef.current}`,
      });
      setHasPlayerActed(true);
      setIsLoading(true);
      return;
    }
    const foldingIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (foldingIndex === -1) return;

    if (!gameIdParam) {
      appendLocalHandAction(playersState[foldingIndex], "fold");
    }

    setRoundPlayersActed((prev) => new Set(prev).add(foldingIndex));
    setPlayersState((prev) => {
      const newPlayers = prev.map((p, i) =>
        i === foldingIndex ? { ...p, hasFolded: true, isActive: false } : { ...p }
      );
      const activeInHand = newPlayers.filter(
        (p) => p.isConnected !== false && !(p.hasFolded ?? false)
      );

      if (gameIdParam) {
        return newPlayers;
      }

      if (activeInHand.length === 1) {
        const winner = activeInHand[0];
        const winnerId = winner.id;
        const currentPot = pot;
        return newPlayers.map((p) =>
          p.id === winnerId
            ? { ...p, chips: p.chips + currentPot, isActive: true }
            : { ...p, isActive: false }
        );
      }

      let nextIndex = (foldingIndex + 1) % newPlayers.length;
      let loopCount = 0;
      while (loopCount < newPlayers.length) {
        const p = newPlayers[nextIndex];
        if (p.isConnected !== false && !(p.hasFolded ?? false)) {
          newPlayers[nextIndex] = { ...newPlayers[nextIndex], isActive: true };
          break;
        }
        nextIndex = (nextIndex + 1) % newPlayers.length;
        loopCount++;
      }
      return newPlayers;
    });

    if (gameIdParam) return;

    const activeInHandCount = playersState.filter(
      (p, i) => i !== foldingIndex && p.isConnected !== false && !(p.hasFolded ?? false)
    ).length;
    if (activeInHandCount === 1) {
      const winnerIndex = playersState.findIndex(
        (p, i) => i !== foldingIndex && p.isConnected !== false && !(p.hasFolded ?? false)
      );
      const humanIndex = playersState.findIndex((p) => p.id === userId || p.id === "human");
      const humanWon = winnerIndex !== -1 && winnerIndex === humanIndex;
      const winner = winnerIndex !== -1 ? playersState[winnerIndex] : null;
      if (winner) {
        setPhase("showdown");
        setShowdownResult({
          winnerId: String(winner.id),
          winnerName: winner.name,
          hand: "Abandon adverse",
          handRank: 0,
          pot,
        });
      }
      if (humanWon) setPlayerChips((prev) => prev + pot);
      const startChips = startOfHandChipsRef.current;
      const winnerChipsBefore = winner?.chips ?? 0;
      const heroRowFold = playersState.find((p) => p.id === userId || p.id === "human");
      const endChips = humanWon ? winnerChipsBefore + pot : (heroRowFold?.chips ?? playerChips);
      const balanceChange = endChips - startChips;
      const toAdd = isBotMode ? (balanceChange > 0 ? Math.round(balanceChange * winMultiplier) : balanceChange) : balanceChange;
      addToUserBalance(toAdd);
      setPot(0);
    }
  };

  const handleCheck = (playerId?: number | string) => {
    if (handResult !== null) return;
    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    const isHumanActing = playerId === undefined || playerId === hero?.id;
    if (callAmount > 0 && isHumanActing) return;
    if (gameIdParam && isHumanActing && !socket) return;
    if (gameIdParam && socket && isHumanActing) {
      actionSeqRef.current += 1;
      socket.emit("PLAYER_ACTION", {
        gameId: gameIdParam,
        playerId: String(userId),
        action: "CHECK",
        handId: handIdRef.current,
        expectedStreet: String(phase).toUpperCase(),
        actionId: `act-${Date.now()}-${actionSeqRef.current}`,
      });
      setHasPlayerActed(true);
      setIsLoading(true);
      return;
    }
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (isHumanActing) {
      setHasPlayerActed(true);
      setIsLoading(true);
    }
    if (!gameIdParam) {
      appendLocalHandAction(justActedIndex >= 0 ? playersState[justActedIndex] : undefined, "check");
      nextTurn(justActedIndex);
    }
  };

  const handleCall = (amount: number, playerId?: number | string) => {
    amount = intChips(amount);
    if (handResult !== null) return;
    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    const isHumanActing = playerId === undefined || playerId === hero?.id;
    if (gameIdParam && isHumanActing && !socket) return;
    if (gameIdParam && socket && isHumanActing) {
      actionSeqRef.current += 1;
      socket.emit("PLAYER_ACTION", {
        gameId: gameIdParam,
        playerId: String(userId),
        action: "CALL",
        amount,
        handId: handIdRef.current,
        expectedStreet: String(phase).toUpperCase(),
        actionId: `act-${Date.now()}-${actionSeqRef.current}`,
      });
      setHasPlayerActed(true);
      setIsLoading(true);
      return;
    }
    if (playerId !== undefined && !isHumanActing) {
      const highestBet = Math.max(0, ...playersState.map((p) => p.bet ?? 0));
      const actorBet = playersState.find((p) => p.id === playerId)?.bet ?? 0;
      const neededToCall = Math.max(0, highestBet - actorBet);
      const actorChips = playersState.find((p) => p.id === playerId)?.chips ?? 0;
      amount = Math.min(amount, neededToCall, actorChips);
    }
    if (playerId !== undefined && !isHumanActing) {
      const botIndex = playersState.findIndex((p) => p.id === playerId);
      const actorChipsBefore = playersState.find((p) => p.id === playerId)?.chips ?? 0;
      const actorBetBefore = playersState.find((p) => p.id === playerId)?.bet ?? 0;
      const highestBet = Math.max(0, ...playersState.map((p) => p.bet ?? 0));
      const neededToCall = Math.max(0, highestBet - actorBetBefore);
      const isBotAllInCall = amount < neededToCall;
      const botTotalBetAfter = actorBetBefore + amount;
      
      const totalRefund = playersState
        .filter((p) => p.id !== playerId && (p.bet ?? 0) > botTotalBetAfter)
        .reduce((sum, p) => sum + ((p.bet ?? 0) - botTotalBetAfter), 0);
        
      const humanRefund = hero && hero.id !== playerId && (hero.bet ?? 0) > botTotalBetAfter ? (hero.bet ?? 0) - botTotalBetAfter : 0;
      
      setPlayersState((prev) => {
        const nextList = prev.map((p) => {
          let next = p;
          if (p.id !== playerId) {
            if ((p.bet ?? 0) > botTotalBetAfter) {
              const refund = (p.bet ?? 0) - botTotalBetAfter;
              next = { ...p, chips: p.chips + refund, bet: botTotalBetAfter };
            }
          } else {
            next = { ...p, chips: Math.max(0, actorChipsBefore - amount), bet: botTotalBetAfter, isActive: false };
          }
          if (isBotAllInCall) {
            next = { ...next, isActive: false };
          }
          return next;
        });
        return nextList;
      });
      setPot((prev) => Math.max(0, prev + amount - totalRefund));
      setRoundPlayersActed((prev) => {
        const next = new Set(prev).add(botIndex);
          const activeInHandCount = playersStateRef.current.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false)).length;
          if (next.size >= activeInHandCount && !isBotAllInCall) {
          bothActedNoTurnRef.current = true;
          const currentPhase = phase;
          if (streetTransitionScheduledRef.current !== currentPhase) {
            streetTransitionScheduledRef.current = currentPhase;
            if (streetTransitionTimeoutRef.current) {
              clearTimeout(streetTransitionTimeoutRef.current);
              streetTransitionTimeoutRef.current = null;
            }
            const transitionFn =
              currentPhase === "preflop"
                ? dealFlop
                : currentPhase === "flop"
                  ? dealTurn
                  : currentPhase === "turn"
                    ? dealRiver
                    : () => setPhase("showdown");
            streetTransitionTimeoutRef.current = setTimeout(() => {
              streetTransitionTimeoutRef.current = null;
              transitionFn();
            }, 1000);
          }
          } else if (next.size < activeInHandCount && !isBotAllInCall) {
          setTimeout(() => {
            setPlayersState((prev) => {
                const newPlayers = prev.map(p => ({ ...p, isActive: false }));
                let nextIdx = (botIndex + 1) % newPlayers.length;
                let loopCount = 0;
                while (loopCount < newPlayers.length) {
                  const p = newPlayers[nextIdx];
                  if (p.isConnected !== false && !(p.hasFolded ?? false) && (p.chips ?? 0) > 0) {
                    newPlayers[nextIdx].isActive = true;
                    break;
                  }
                  nextIdx = (nextIdx + 1) % newPlayers.length;
                  loopCount++;
                }
                return newPlayers;
            });
          }, 50);
        }
        return next;
      });
      if (humanRefund > 0) {
        setPlayerChips((prev) => prev + humanRefund);
      }
      if (isBotAllInCall) setTimeout(() => setRunOutPhase(phase), 50);
      appendLocalHandAction(playersState.find((p) => p.id === playerId), "call", { amount });
      setHasPlayerActed(false);
      setIsLoading(false);
      return;
    } else {
      const heroChips = hero?.chips ?? playerChips;
      const effectiveAmount = Math.min(amount, heroChips);
      setPlayerChips((prev) => Math.max(0, prev - effectiveAmount));
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === userId || p.id === "human"
            ? { ...p, chips: Math.max(0, (p.chips ?? 0) - effectiveAmount), bet: (p.bet ?? 0) + effectiveAmount }
            : p
        )
      );
      amount = effectiveAmount;
    }
    setPot((prev) => prev + amount);
    addContribution(playerId ?? userId ?? "human", amount);
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (isHumanActing) {
      setHasPlayerActed(true);
      setIsLoading(true);
    }
    if (!gameIdParam) {
      appendLocalHandAction(justActedIndex >= 0 ? playersState[justActedIndex] : undefined, "call", { amount });
      nextTurn(justActedIndex);
    }
  };

  const handleRaise = (raiseAmount: number, playerId?: number | string) => {
    raiseAmount = intChips(raiseAmount);
    if (handResult !== null) return;
    const totalToPut = intChips(callAmount + raiseAmount);
    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    const isHumanActing = playerId === undefined || playerId === hero?.id;
    if (gameIdParam && isHumanActing && !socket) return;
    if (gameIdParam && socket && isHumanActing) {
      actionSeqRef.current += 1;
      socket.emit("PLAYER_ACTION", {
        gameId: gameIdParam,
        playerId: String(userId),
        action: "RAISE",
        amount: raiseAmount,
        handId: handIdRef.current,
        expectedStreet: String(phase).toUpperCase(),
        actionId: `act-${Date.now()}-${actionSeqRef.current}`,
      });
      setHasPlayerActed(true);
      setIsLoading(true);
      return;
    }
    const currentIndex = playersState.findIndex((p) => p.isActive);
    setRoundPlayersActed(new Set(currentIndex !== -1 ? [currentIndex] : []));
    if (playerId !== undefined && playerId !== hero?.id) {
      setPlayersState((prev) => {
        const acting = prev.find((p) => p.id === playerId);
        const effectiveTotalToPut = acting
          ? Math.min(totalToPut, Math.max(0, acting.chips ?? 0))
          : totalToPut;
        return prev.map((p) =>
          p.id === playerId
            ? { ...p, chips: Math.max(0, (p.chips ?? 0) - effectiveTotalToPut), bet: (p.bet ?? 0) + effectiveTotalToPut }
            : p
        );
      });
      const actingPlayer = playersState.find((p) => p.id === playerId);
      const effectiveTotalToPut = actingPlayer
        ? Math.min(totalToPut, Math.max(0, actingPlayer.chips ?? 0))
        : totalToPut;
      setPot((prev) => prev + effectiveTotalToPut);
      addContribution(playerId, effectiveTotalToPut);
    } else {
      setPlayerChips((prev) => Math.max(0, prev - totalToPut));
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === userId || p.id === "human"
            ? { ...p, chips: Math.max(0, (p.chips ?? 0) - totalToPut), bet: (p.bet ?? 0) + totalToPut }
            : p
        )
      );
      setPot((prev) => prev + totalToPut);
      addContribution(userId ?? "human", totalToPut);
    }
    if (isHumanActing) {
      setHasPlayerActed(true);
      setIsLoading(true);
    }
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (!gameIdParam) {
      appendLocalHandAction(justActedIndex >= 0 ? playersState[justActedIndex] : undefined, "raise", { amount: raiseAmount });
      nextTurn(justActedIndex);
    }
  };

  const handleSendMessage = (content: string, type: "emoji" | "text") => {
    const id = Date.now();
    const myName = playersState.find((p) => p.id === userId || p.id === "human")?.name ?? "Vous";
    const newMessage: ChatMessage = {
      id: id,
      player: "Vous",
      content: content,
      type: type,
      timestamp: id,
      isLeaving: false,
    };

    setChatMessages((prev) => [...prev, newMessage]);

    if (gameIdParam && socket) {
      socket.emit("GAME_CHAT", {
        gameId: gameIdParam,
        playerId: String(userId),
        playerName: myName,
        content,
        type,
      });
    }

    setTimeout(() => {
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, isLeaving: true } : msg
        )
      );

      setTimeout(() => {
        setChatMessages((prev) => prev.filter((msg) => msg.id !== id));
      }, 500);
    }, 4000);

    if (mode === "bot" && Math.random() > 0.5) {
      setTimeout(() => {
        const botId = Date.now();
        const botEmojis = ["🔥", "😎", "💰", "🎯", "👑", "💪", "🎲"];
        const botMessages = ["Bien joué !", "Intéressant", "On verra", "GG WP"];
        const isEmoji = Math.random() > 0.5;

        const botResponse: ChatMessage = {
          id: botId,
          player: "Bot Alpha",
          content: isEmoji
            ? botEmojis[Math.floor(Math.random() * botEmojis.length)]
            : botMessages[Math.floor(Math.random() * botMessages.length)],
          type: isEmoji ? "emoji" : "text",
          timestamp: botId,
          isLeaving: false,
        };

        setChatMessages((prev) => [...prev, botResponse]);

        setTimeout(() => {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === botId ? { ...msg, isLeaving: true } : msg
            )
          );
          setTimeout(() => {
            setChatMessages((prev) => prev.filter((msg) => msg.id !== botId));
          }, 500);
        }, 4000);
      }, 2000);
    }
  };

  useEffect(() => {
    const currentPath = `/game${window.location.search}`;
    sessionStorage.setItem("currentGame", currentPath);

    return () => {
      const isNavigatingToProfile = window.location.pathname === "/profile";
      const isNavigatingToFriends = window.location.pathname === "/friends";
      
      if (!isNavigatingToProfile && !isNavigatingToFriends) {
        sessionStorage.removeItem("currentGame");
      }
    };
  }, [searchParams]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-500/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800)],
              x: [null, Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000)],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <AnimatePresence>
        {phase === "shuffle" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="relative flex flex-col items-center gap-8"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-80 bg-amber-500/15 rounded-full blur-[60px] -z-10 pointer-events-none" />
              <div className="relative w-36 h-52" style={{ perspective: "1000px" }}>
                {[...Array(12)].map((_, i) => {
                  const isLeft = i % 2 === 0;
                  const spread = shuffleCount % 2 === 0 ? 1 : -1;
                  const angle = spread * (isLeft ? 12 : -12);
                  const offsetX = spread * (isLeft ? -18 : 18);
                  const offsetY = spread * (isLeft ? -8 : 8);
                  const z = i * 2;
                  return (
                    <motion.div
                      key={i}
                      className="absolute inset-0 rounded-xl border-2 border-amber-400/60 shadow-2xl"
                      style={{
                        background: "linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e3a5f 100%)",
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(234,179,8,0.08) 8px, rgba(234,179,8,0.08) 16px), repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(234,179,8,0.06) 8px, rgba(234,179,8,0.06) 16px)",
                        boxShadow: "0 0 0 1px rgba(234,179,8,0.2), 0 10px 40px -10px rgba(0,0,0,0.5)",
                        left: `${i * 2}px`,
                        top: `${i * 1.5}px`,
                        zIndex: z,
                      }}
                      animate={{
                        rotate: angle,
                        x: offsetX,
                        y: offsetY,
                        rotateY: shuffleCount % 2 === 0 ? 0 : (i % 2) * 10,
                      }}
                      transition={{
                        type: "spring",
                        damping: 18,
                        stiffness: 200,
                        delay: i * 0.02,
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden">
                        <div className="w-12 h-16 rounded border border-amber-400/30 flex items-center justify-center">
                          <span className="text-amber-400/40 text-2xl font-bold">♠</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                className="flex flex-col items-center gap-1"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <p className="text-amber-300 font-bold text-2xl tracking-[0.3em] uppercase drop-shadow-[0_0_20px_rgba(251,191,36,0.5)]">
                  {t('startScreen.shuffling')}
                </p>
                <div className="h-1 w-28 rounded-full bg-slate-700/80 overflow-hidden mt-2">
                  <motion.div
                    className="h-full bg-amber-400 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: ["0%", "100%"] }}
                    transition={{ duration: 1.4, ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }}
                  />
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {isBotThinking && mode === "bot" && (
        <div className={`absolute z-50 left-1/2 transform -translate-x-1/2 ${
          isMobile ? 'bottom-32' : isTablet ? 'bottom-36' : 'bottom-40'
        }`}>
          <div className={`bg-slate-800/95 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-4' : 'p-6'} border-2 border-blue-500 shadow-2xl`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <Loader2 className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-blue-400 animate-spin`} />
              <div>
                <div className={`text-white font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>{t('botConfig.botThinking')}</div>
                <div className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>{t('botConfig.analyzingProbabilities')}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TA NOUVELLE TRANSITION FIGMA UNIQUE */}
      <AnimatePresence>
        {showTransition && !(gameIdParam && !isBotMode && cashWaitingPlayers) && (
          <RoundTransition 
            roundNumber={roundCount} 
            winner={lastWinnerData} 
            duration={3}
            onComplete={() => {
              setShowTransition(false);
              setRoundCount(prev => prev + 1);
              
              setHandResultData(null);
              setPhase("init");
              
              if (isBotMode) {
                navigate(location.pathname + location.search, { state: { replay: true } });
              }
            }}
            onLeaveToLobby={() => {
              setShowTransition(false);
              if (gameIdParam && socket && !isBotMode && !isSpectating) {
                socket.emit("CASH_LEAVE", { gameId: gameIdParam });
              }
              navigate("/lobby");
            }}
          />
        )}
      </AnimatePresence>

      <div ref={tourRefHeader} className={`absolute ${isMobile ? 'top-2 left-2 right-2' : 'top-4 left-8 right-8'} z-50 flex items-center justify-between`}>
        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-3'}`}>
          <QuantumBluffLogo className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} drop-shadow-2xl`} />

          {!isMobile && phase !== "init" && phase !== "shuffle" && phase !== "deal" && (
            <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/40 rounded-lg px-3 py-1.5 shadow-lg">
              <p className="text-yellow-400 font-bold text-sm tracking-wide uppercase">
                {phase === "preflop" ||
                phase === "flop" ||
                phase === "turn" ||
                phase === "river" ||
                phase === "showdown"
                  ? t(`game.phaseBadge.${phase}`)
                  : null}
              </p>
            </div>
          )}

          <div className="relative" ref={menuContainerRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className={`bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm text-white ${isMobile ? 'p-2' : 'p-3'} rounded-lg border border-slate-700 transition-all shadow-lg`}
              title={t("game.menuTitle")}
              aria-expanded={showMenu}
              aria-haspopup="true"
            >
              <Menu className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>

            {showMenu && (
              <div
                className={`absolute ${isMobile ? 'top-12' : 'top-14'} left-0 bg-slate-900/98 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-600/80 overflow-hidden ${isMobile ? 'min-w-[min(92vw,280px)]' : 'min-w-[280px]'} z-[60] py-1`}
                role="menu"
              >
                <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t("game.menuSectionGame")}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={startGameTour}
                  className={`w-full flex items-start ${isMobile ? 'gap-3 px-4 py-3' : 'gap-3 px-4 py-3'} text-left text-cyan-300 hover:bg-cyan-500/15 transition-all border-b border-slate-700/80`}
                >
                  <Sparkles className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5'} shrink-0 mt-0.5 text-cyan-400`} />
                  <span className="flex flex-col gap-0.5">
                    <span className={`${isMobile ? 'text-sm' : 'text-sm'} font-bold text-white`}>{t("game.menuGuidedTour")}</span>
                    <span className="text-xs text-slate-400 font-normal leading-snug">{t("game.menuGuidedTourHint")}</span>
                  </span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsQuantumOpen((o) => {
                      const next = !o;
                      setQuantumPinned(next);
                      return next;
                    });
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-3 px-4 py-3' : 'gap-3 px-4 py-3'} ${isQuantumOpen ? 'text-amber-400 bg-amber-500/15' : 'text-white hover:bg-slate-700/80'} transition-all`}
                >
                  <Activity className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
                  <span className={`${isMobile ? 'text-sm' : 'text-sm'} font-semibold`}>{t("game.menuQuantum")}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setIsPanelOpen((o) => !o);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-3 px-4 py-3' : 'gap-3 px-4 py-3'} ${isPanelOpen ? 'text-yellow-400 bg-yellow-500/15' : 'text-white hover:bg-slate-700/80'} transition-all`}
                >
                  <Trophy className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
                  <span className={`${isMobile ? 'text-sm' : 'text-sm'} font-semibold`}>{t("hiddenBets.title")}</span>
                </button>

                <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t("game.menuSectionAccount")}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    navigate("/profile");
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-3 px-4 py-3' : 'gap-3 px-4 py-3'} text-white hover:bg-slate-700/80 transition-all`}
                >
                  <User className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
                  <span className={`${isMobile ? 'text-sm' : 'text-sm'} font-semibold`}>{t("lobby.profile")}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    navigate("/friends");
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-3 px-4 py-3' : 'gap-3 px-4 py-3'} text-white hover:bg-slate-700/80 transition-all`}
                >
                  <Users className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
                  <span className={`${isMobile ? 'text-sm' : 'text-sm'} font-semibold`}>{t("lobby.friends")}</span>
                </button>

                <p className="px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t("game.menuSectionDanger")}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowQuitConfirm(true);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-3 px-4 py-3' : 'gap-3 px-4 py-3'} text-red-400 hover:bg-red-950/40 transition-all`}
                >
                  <LogOut className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} shrink-0`} />
                  <span className={`${isMobile ? 'text-sm' : 'text-sm'} font-semibold`}>{t("nav.quitGame")}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-4'}`}>
          {!isMobile && (
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl border-2 border-white">
              {getPlayerAvatar(heroPlayer?.name ?? "Vous", heroPlayer?.id, isBotMode ? "human" : userId) ? (
                <ImageWithFallback
                  src={getPlayerAvatar(heroPlayer?.name ?? "Vous", heroPlayer?.id, isBotMode ? "human" : userId)}
                  alt="Avatar du joueur"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">{heroDisplayName.charAt(0)}</span>
              )}
            </div>
          )}

          {!isMobile && (
            <div className="flex flex-col">
              <div className="text-white font-bold text-lg leading-tight">{heroDisplayName}</div>
              <div className="text-gray-400 text-xs font-medium">{userId ? `ID ${userId.slice(0, 8)}` : "—"}</div>
            </div>
          )}

          {!isMobile && <div className="w-px h-10 bg-slate-700"></div>}

          <div className="flex items-center bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full pl-3 pr-1 py-1 shadow-lg gap-3">
            <div className={`text-white font-bold flex items-center gap-1.5 ${isMobile ? 'text-sm' : 'text-base'}`}>
              <ChipIcon size="sm" />
              <span>{displayedHeroChips.toLocaleString()}</span>
            </div>

            <button
              onClick={openAddMoney}
              className={`bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white ${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-full flex items-center justify-center shadow-md transition-all transform hover:scale-105 border border-green-400`}
              title={t("lobby.addMoney")}
            >
              <Plus className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>
          </div>

          {!isMobile && <div className="w-px h-10 bg-slate-700"></div>}

          {!isMobile && (
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="p-2 rounded-full transition-all duration-300 hover:bg-slate-700/50 group"
              title={t('game.openChat')}
            >
              <MessageCircle className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${isChatOpen ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" : "text-gray-200 hover:text-white"}`} />
            </button>
          )}

          {!isMobile && (
            <button
              type="button"
              onClick={startGameTour}
              className="p-2 rounded-full transition-all duration-300 hover:bg-slate-700/50 group"
              title={t("game.menuGuidedTour")}
            >
              <Sparkles className="w-6 h-6 transition-all duration-300 group-hover:scale-110 text-cyan-400 hover:text-cyan-300" />
            </button>
          )}
        </div>
      </div>

      {showAddMoney && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeAddMoney}>
          <div className="bg-slate-800 border border-yellow-500/50 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{t("lobby.addMoneyTitle")}</h3>
              <button type="button" onClick={closeAddMoney} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            {addSuccess ? (
              <p className="text-green-400 font-medium text-center py-4">{t("lobby.captchaSuccess")}</p>
            ) : (
              <>
                <p className="text-slate-300 text-sm mb-3">{t("lobby.chooseAmount")}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ADD_MONEY_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setAddMoneyAmount(amount)}
                      className={`px-4 py-2 rounded-lg font-bold transition ${addMoneyAmount === amount ? "bg-yellow-500 text-slate-900" : "bg-slate-700 text-slate-200 hover:bg-slate-600"}`}
                    >
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>
                {addMoneyAmount != null && (
                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm block">{t("lobby.devValidation") || 'Tapez "dev" pour valider'}</label>
                    <input
                      type="text"
                      value={devValidation}
                      onChange={(e) => setDevValidation(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitAddMoney()}
                      placeholder="dev"
                      className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={submitAddMoney}
                      disabled={devValidation.trim().toLowerCase() !== "dev"}
                      className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold transition"
                    >
                      {t("lobby.validate")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <QuitGameConfirmDialog
        open={showQuitConfirm}
        onCancel={() => setShowQuitConfirm(false)}
        onConfirm={() => {
          setShowQuitConfirm(false);
          if (gameIdParam && socket) {
            socket.emit("CASH_LEAVE", { gameId: gameIdParam });
          }
          navigate("/lobby");
        }}
      />

      {gameIdParam && !isBotMode && cashWaitingPlayers && showInterHandPanel && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          <div className="bg-slate-800/95 border border-emerald-500/50 rounded-xl px-6 py-4 shadow-lg max-w-[min(100vw-1rem,520px)] w-full">
            <div className="space-y-4">
                  <div className="text-center">
                <p className="text-emerald-300 font-semibold">
                  {t("game.waitingForReady", "En attente : cliquez « Prêt » pour la prochaine main")}
                </p>
                  {!interHandResultsVisible ? (
                    <p className="text-slate-300 text-xs mt-2">
                      {t("game.revealInProgress", "Abattage en cours…")}
                    </p>
                  ) : (
                    <>
                      {showdownResult && (
                  <div className="mt-2">
                    <div className="text-sm text-amber-200 font-semibold">{t("game.winnerLabel", "Gagnant")}</div>
                    <div className="text-2xl font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.25)]">
                      {showdownResult.winnerName}
                    </div>
                    <div className="text-sm text-slate-200">
                      {t("game.winningHandLabel", "Combinaison gagnante")}:{" "}
                      <span className="text-amber-200 font-semibold">{showdownResult.hand}</span>
                    </div>
                    <div className="text-sm text-slate-200">
                      +{(showdownResult.pot ?? 0).toLocaleString()} {t("game.jets", "jetons")}
                    </div>
                  </div>
                      )}
                    </>
                  )}
              </div>

              {interHandResultsVisible && (
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{t("hiddenBets.tableResolvedTitle", "Tickets résolus (paris cachés)")}</span>
                    {interHandTableTicketsLoading && <span>{t("hiddenBets.loading", "Chargement…")}</span>}
                  </div>

                  {interHandTableTicketsError && (
                    <p className="text-red-400 text-xs mb-2">{interHandTableTicketsError}</p>
                  )}

                  {!interHandTableTicketsLoading && interHandTableTickets.length === 0 && (
                    <p className="text-slate-400 text-xs">
                      {t("hiddenBets.noTableTickets", "Aucun ticket résolu pour le moment.")}
                    </p>
                  )}

                  {!interHandTableTicketsLoading && interHandTableTickets.length > 0 && (
                    <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                      {interHandTableTickets.slice(0, 20).map((tk) => {
                        const uname =
                          (tk.user?.username ?? tk.userId ?? "").toString() || t("game.unknown", "Inconnu");
                        const whoLabel =
                          userId && tk.userId != null && String(tk.userId) === String(userId)
                            ? t("game.you", "Vous")
                            : uname;
                        const odds = typeof tk.quotedOdds === "number" ? tk.quotedOdds : null;
                        const status =
                          tk.status === "WON" ? "GAGNÉ" : tk.status === "VOID" ? "ANNULÉ" : "PERDU";

                        const statusClass =
                          tk.status === "WON"
                            ? "border-green-500/50 bg-green-900/20"
                            : tk.status === "VOID"
                              ? "border-slate-600 bg-slate-700/20"
                              : "border-red-500/40 bg-red-900/15";

                        return (
                          <div
                            key={tk.id}
                            className={`rounded-lg border px-3 py-2 ${statusClass}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="text-xs text-white font-semibold truncate">
                                {whoLabel}
                              </div>
                              <div className="text-[10px] text-slate-200">{status}</div>
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
                                    const parsed = tk.stateSnapshotJson ? JSON.parse(tk.stateSnapshotJson) : null;
                                    setPricingInfo({
                                      ticketId: tk.id,
                                      pricingBreakdown: parsed?.pricingBreakdown ?? null,
                                      pricingInputs: parsed?.pricingInputs ?? null,
                                    });
                                  } catch {
                                    setPricingInfo({
                                      ticketId: tk.id,
                                      pricingBreakdown: null,
                                      pricingInputs: null,
                                    });
                                  }
                                }}
                              >
                                <Info className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {interHandResultsVisible && (
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{t("game.nextHandReadyTitle", "Joueurs prêts")}</span>
                    <span>
                      {allNextHandReady
                        ? t("game.allReady", "Tout le monde est prêt")
                        : t("game.waiting", "En attente…")}
                    </span>
                  </div>

                  <div className="flex flex-col gap-2">
                    {cashSeats
                      .filter((s) => !!s.userId)
                      .sort((a, b) => a.seatIndex - b.seatIndex)
                      .map((seat) => {
                        const seatUserId = seat.userId!;
                        const isReady = nextHandReadyUserIds.some((u) => String(u) === String(seatUserId));
                        const isMe = userId && String(userId) === String(seatUserId);

                        return (
                          <div
                            key={seat.seatIndex}
                            className="flex items-center justify-between gap-3 bg-slate-900/20 border border-slate-700/70 rounded-lg px-3 py-2"
                          >
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white truncate">
                                {seat.username ?? t("game.unknown", "Inconnu")}
                                {isMe ? ` (${t("game.you", "Vous")})` : ""}
                              </div>
                              <div className={`text-[11px] ${isReady ? "text-emerald-200" : "text-slate-400"}`}>
                                {isReady ? t("game.ready", "Prêt") : t("game.notReady", "Pas prêt")}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={!isMe || allNextHandReady}
                              onClick={() => {
                                if (!isMe) return;
                                socket?.emit("CASH_NEXT_HAND_READY", { gameId: gameIdParam, ready: !myNextHandReady });
                              }}
                              className={`text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition ${
                                isMe
                                  ? isReady
                                    ? "bg-emerald-700 hover:bg-emerald-600"
                                    : "bg-emerald-600 hover:bg-emerald-500"
                                  : "bg-slate-700 text-slate-300 cursor-not-allowed"
                              } ${!isMe ? "opacity-70" : ""}`}
                            >
                              {isReady
                                ? t("game.ready", "✅ Prêt")
                                : isMe
                                  ? t("game.notReady", "Prêt ?")
                                  : t("game.notReady", "Pas prêt")}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-wrap justify-center max-w-[min(100vw-1rem,520px)] w-full px-2">
            {!cashSeats.some((s) => s.userId != null && userId != null && String(s.userId) === String(userId)) ? (
              cashSeats.some((s) => !s.userId) && (
                <button
                  type="button"
                  onClick={() => {
                    const free = cashSeats.findIndex((s) => !s.userId);
                    if (free >= 0 && socket) socket.emit("CASH_SIT", { gameId: gameIdParam, seatIndex: free, buyIn: 100, avatarUrl: getUserAvatar() });
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                >
                  {t("game.cashSitBuyIn", { amount: 100 })}
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => socket?.emit("CASH_LEAVE", { gameId: gameIdParam })}
                  className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                >
                  {t("game.cashStandUp")}
                </button>
                <button
                  type="button"
                  onClick={() => socket?.emit("CASH_REBUY", { gameId: gameIdParam, amount: 100 })}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                >
                  {t("game.cashRebuy", { amount: 100 })}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => setShowQuitConfirm(true)}
              className="border border-slate-500 bg-slate-800/90 hover:bg-red-950/60 hover:border-red-500/50 text-slate-200 hover:text-red-200 text-sm font-semibold px-3 py-1.5 rounded-lg transition"
            >
              {t("nav.quitGame")}
            </button>
          </div>
        </div>
      )}

      {pricingInfo && (
        <div
          className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
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
            <div className="p-4 text-xs text-slate-200 space-y-4">
              <div className="text-slate-400">
                Ticket: <span className="text-slate-100 font-mono">{pricingInfo.ticketId}</span>
              </div>

              <div>
                <div className="text-slate-400 mb-2">{t("hiddenBets.pricingBreakdown", "Détail pricing")}</div>
                <pre className="bg-slate-950/40 border border-slate-700 rounded p-3 whitespace-pre-wrap break-words">
                  {pricingInfo.pricingBreakdown != null
                    ? JSON.stringify(pricingInfo.pricingBreakdown, null, 2)
                    : t("hiddenBets.noPricingInfo", "Détail non disponible pour ce ticket.")}
                </pre>
              </div>

              <div>
                <div className="text-slate-400 mb-2">{t("hiddenBets.pricingInputs", "Inputs pricing")}</div>
                <pre className="bg-slate-950/40 border border-slate-700 rounded p-3 whitespace-pre-wrap break-words">
                  {pricingInfo.pricingInputs != null
                    ? JSON.stringify(pricingInfo.pricingInputs, null, 2)
                    : t("hiddenBets.noPricingInfo", "Détail non disponible pour ce ticket.")}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      <div ref={tourRefTable} className={`flex-1 flex items-center justify-center relative ${isMobile ? 'px-2 pt-14' : 'px-6 pt-24'}`}>
        <PokerTable
          players={tablePlayers}
          communitySafeZone={230}
          phase={phase}
          burnedCardsCount={displayBurnedCardsCount}
          colorblindMode={colorblindMode}
          heroSeatId={isBotMode ? "human" : (userId ?? undefined)}
        >
          <CommunityCards
            cards={communityCards}
            pot={pot}
            sidePots={sidePots.length > 1 ? sidePots : undefined}
            colorblindMode={colorblindMode}
            potRef={tourRefPot}
            boardRef={tourRefBoard}
          />
        </PokerTable>
      </div>

      <HandActionLogPanel entries={handActionLog} />
      <QuantumHUD
        isOpen={isQuantumOpen}
        onToggle={closeQuantumPanel}
        onPanelPointerEnter={onQuantumPanelEnter}
        onPanelPointerLeave={onQuantumPanelLeave}
      />
      <HiddenBetsPanel
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
        players={activePlayers}
        gameId={gameIdParam}
        hiddenBetNextHandId={hiddenBetNextHandId}
        hiddenBetWindowOpen={hiddenBetWindowOpen}
        hiddenBetState={hiddenBetState}
      />
      <PokerChat isOpen={isChatOpen} onToggle={() => setIsChatOpen(!isChatOpen)} onSendMessage={handleSendMessage} />
      <MessageFeed messages={chatMessages} />

      {isSpectating && gameIdParam && !isBotMode && cashSeats.length > 0 && (
        <div ref={tourRefActions} className="fixed bottom-6 left-1/2 z-30 flex min-h-[48px] min-w-[200px] -translate-x-1/2 items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (spectatorWantsToRejoin) {
                socket?.emit("SPECTATOR_QUEUE_LEAVE", { gameId: gameIdParam });
              } else {
                socket?.emit("SPECTATOR_QUEUE_JOIN", { gameId: gameIdParam });
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${spectatorWantsToRejoin ? "bg-amber-600 hover:bg-amber-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
          >
            {spectatorWantsToRejoin ? t("game.cancelRejoinNextHand") : t("game.rejoinNextHand")}
          </button>
        </div>
      )}

      {!isSpectating && (
        <PlayerDashboard
          ref={tourRefActions}
          name={heroDisplayName}
          chips={displayedHeroChips}
          cards={heroCards}
          colorblindMode={colorblindMode}
          onFold={() => handleFold()}
          onCall={(amount) => handleCall(amount)}
          onRaise={(amount) => handleRaise(amount)}
          onCheck={() => handleCheck()}
          callAmount={callAmount}
          minRaise={50}
          maxRaise={Math.max(0, displayedHeroChips - callAmount)}
          isMyTurn={handResult === null && isMyTurn}
          isLoading={isLoading}
          hasFolded={hasFoldedFromState}
          hasActed={hasPlayerActed}
          actionsDisabled={Boolean(gameIdParam && !socket)}
          waitingForPlayer={!isMyTurn && !hasFoldedFromState ? (activePlayer?.name === "Vous" || activePlayer?.name === "you" ? t('game.you') : activePlayer?.name) : undefined}
          timeLeft={timeLeft ?? 30}
          onToggleQuantum={onQuantumToggleClick}
          onQuantumHoverEnter={onQuantumProbasEnter}
          onQuantumHoverLeave={onQuantumProbasLeave}
          onToggleHiddenBets={() => setIsPanelOpen(!isPanelOpen)}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          isHiddenBetsOpen={isPanelOpen}
          isChatOpen={isChatOpen}
        />
      )}

      {isSpectating && !(gameIdParam && !isBotMode && cashSeats.length > 0) && (
        <div
          ref={tourRefActions}
          className="fixed bottom-8 left-1/2 z-30 flex min-h-[40px] w-[min(90vw,320px)] -translate-x-1/2 items-center justify-center rounded-xl border border-dashed border-slate-600/40 bg-slate-900/30 px-3 py-2 text-center text-xs text-slate-500"
          aria-hidden
        >
          {t("game.help.spectatorPlaceholder")}
        </div>
      )}

      <GameInteractiveTour
        open={gameTourOpen}
        onClose={() => setGameTourOpen(false)}
        step={gameTourStep}
        onStepChange={setGameTourStep}
        refs={gameTourRefs}
        isSpectating={isSpectating}
      />
    </div>
  );
}