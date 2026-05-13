import { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
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
import {
  Activity,
  Banknote,
  CircleX,
  DoorOpen,
  Info,
  Loader2,
  Menu,
  PauseCircle,
  Skull,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useDeviceType } from "../components/ui/use-mobile";
import { useUser } from "../hooks/useUser";
import { useAccessibility } from "../contexts/AccessibilityContext";
import {
  addToUserBalance,
  addDevMoney,
  getUserBalance,
  getUserAvatar,
  fetchBalanceFromServer,
  POKER_WALLET_DISPLAY_EVENT,
} from "../utils/userProfile";
import { RoundTransition } from "../components/RoundTransition";
import { GameInteractiveTour } from "../components/GameInteractiveTour";
import { QuitGameConfirmDialog } from "../components/QuitGameConfirmDialog";
import { HandActionLogPanel } from "../components/HandActionLogPanel";
import { PlayerGameMenuModal } from "../components/PlayerGameMenuModal";

import { fetchHiddenBetTableHistory } from "../api/hiddenBetsApi";

import type { ClientCard } from "../utils/cards";
import { normalizeServerCard, cardHighlightKey } from "../utils/cards";
import { intChips } from "../utils/chips";
import { getWinMultiplierFromDifficultyParam } from "../utils/botModeReward";
import { BOT_TABLE_DEFAULTS } from "../config/botTableDefaults";
import { DeckShuffleOverlay } from "../components/game/DeckShuffleOverlay";
import {
  FakeCardTopUpFields,
  isFakeCardComplete,
  type PromoDiscountInfo,
  simulatedEurFromChips,
} from "../components/FakeCardTopUpForm";
import { validateGiftCode, validateTopUpPromo } from "../utils/wallet";
import { mergeGamificationFromServerResponse } from "../utils/gamificationStorage";
import { apiUrl } from "../utils/apiBase";
import { getPokerTableAvatar } from "../utils/avatars";
import { getAuthItem } from "../utils/authStorage";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import {
  shouldBotTauntAfterAction,
  pickBotTauntAfterAction,
} from "../utils/botTableChat";
import { censorChatLinks, isChatContentEffectivelyEmpty } from "../utils/chatLinkCensor";
import {
  OPEN_RATE_GAME_EVENT,
  STORAGE_MATCHES_PLAYED_COUNT,
  STORAGE_MATCHES_COUNTED_IDS,
} from "../constants/storageKeys";

/** Toutes les `RATE_GAME_PROMPT_EVERY` parties terminées, on propose la notation. */
const RATE_GAME_PROMPT_EVERY = 5;
/** Garde la liste des derniers gameId comptés sous une taille raisonnable. */
const MATCHES_COUNTED_IDS_MAX = 100;

/** Incrémente le compteur local de matchs joués pour le user courant et déclenche
 * le prompt de notation tous les {@link RATE_GAME_PROMPT_EVERY} matchs.
 *
 * Anti-doublon : un même `gameId` n'est compté qu'une fois (sessions multi-onglets,
 * réémissions `GAME_ENDED`, etc.). En cas d'indisponibilité du `localStorage`,
 * on no-op silencieusement pour ne pas casser la navigation post-partie. */
function recordCompletedMatchAndMaybePromptRating(gameId: string | null | undefined): void {
  if (typeof window === "undefined") return;
  const gid = (gameId ?? "").toString().trim();
  if (!gid) return;
  try {
    const rawIds = localStorage.getItem(STORAGE_MATCHES_COUNTED_IDS);
    let seen: string[] = [];
    if (rawIds) {
      try {
        const parsed = JSON.parse(rawIds);
        if (Array.isArray(parsed)) seen = parsed.filter((v): v is string => typeof v === "string");
      } catch {
        seen = [];
      }
    }
    if (seen.includes(gid)) return;
    seen.push(gid);
    if (seen.length > MATCHES_COUNTED_IDS_MAX) {
      seen = seen.slice(seen.length - MATCHES_COUNTED_IDS_MAX);
    }
    localStorage.setItem(STORAGE_MATCHES_COUNTED_IDS, JSON.stringify(seen));
    const prevRaw = localStorage.getItem(STORAGE_MATCHES_PLAYED_COUNT);
    const prev = Number.parseInt(prevRaw ?? "0", 10);
    const next = (Number.isFinite(prev) ? Math.max(0, prev) : 0) + 1;
    localStorage.setItem(STORAGE_MATCHES_PLAYED_COUNT, String(next));
    if (next > 0 && next % RATE_GAME_PROMPT_EVERY === 0) {
      window.dispatchEvent(new CustomEvent(OPEN_RATE_GAME_EVENT));
    }
  } catch {
    /* localStorage indisponible (mode privé Safari, etc.) — silencieux. */
  }
}

/** Aligné sur `server/src/shared/practiceBotGames.ts` — parties bots via `/api/game/bot/start`. */
const PRACTICE_BOT_GAME_ID_PREFIX = "practice-bot-";

/** Aligné sur `server/src/tournament/tournament.constants.ts` — tables bracket tournoi (wallet off). */
const TOURNAMENT_GAME_ID_PREFIX = "game_tournament_";

type TournamentTableTransitionOverlay =
  | null
  | { variant: "eliminated"; tournamentId: string }
  | { variant: "won_waiting"; tournamentId: string }
  | { variant: "won_next_table"; tournamentId: string }
  | { variant: "champion"; tournamentId: string };

type Card = ClientCard;

const ADD_MONEY_PRESETS = [100, 1000, 2000, 3000, 5000];

interface ChatMessage {
  id: number | string;
  player: string;
  content: string;
  type: "emoji" | "text";
  timestamp: number;
  isLeaving?: boolean;
}

type GamePhase = "init" | "shuffle" | "deal" | "preflop" | "flop" | "turn" | "river" | "showdown";

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

function mapServerRoleToTableRole(serverRole: string | undefined): NonNullable<BasePlayer["role"]> {
  if (serverRole === "SMALL_BLIND") return "SB";
  if (serverRole === "BIG_BLIND") return "BB";
  return "PLAYER";
}

/** Libellé affiché sur la table — dérivé d’un identifiant pour suivre les changements de langue. */
type BotTableActionKind = "fold" | "check" | "call" | "raise";

function labelForBotTableAction(kind: BotTableActionKind, tr: (key: string) => string): string {
  switch (kind) {
    case "fold":
      return tr("game.actionFolded");
    case "check":
      return tr("game.actionChecked");
    case "call":
      return tr("game.actionCalled");
    default:
      return tr("game.actionRaised");
  }
}

/** Vraies cartes connues (pas les dos « hidden / ? » du brouillard multijoueur). */
function isRealHoleForExpertOracle(cards: Card[]): boolean {
  if (!Array.isArray(cards) || cards.length < 2) return false;
  return !cards.some((x) => String(x.suit) === "hidden" || x.value === "?");
}

/** Joueurs encore en main (non couchés), cohérent avec nextTurn / IA. */
function countLocalPlayersInHand(ps: (BasePlayer | BotPlayer)[]): number {
  return ps.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false)).length;
}

/** Mises égalisées ou tapis sans jetons : fin du round d’enchères courant. */
function localBetsEqualizedForStreet(ps: (BasePlayer | BotPlayer)[]): boolean {
  const active = ps.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false));
  if (active.length < 2) return true;
  const maxBet = Math.max(0, ...active.map((p) => p.bet ?? 0));
  return active.every((p) => (p.bet ?? 0) === maxBet || (p.chips ?? 0) === 0);
}

/** Données « oracle » pour l’IA expert : adversaires encore en main + leurs cartes (table locale). */
function buildExpertOraclePayload(
  playersState: (BasePlayer | BotPlayer)[],
  activePlayerId: string | number,
): { opponentHoleCards?: { suit: string; rank: string }[][]; opponentStack: number } {
  const opps = playersState.filter((p) => {
    if (p.id === activePlayerId) return false;
    if (p.isConnected === false) return false;
    if (p.hasFolded === true) return false;
    return true;
  });
  const opponentStack = opps.length > 0 ? Math.max(0, ...opps.map((p) => p.chips ?? 0)) : 0;
  const opponentHoleCards = opps
    .map((p) => (Array.isArray(p.cards) ? p.cards : []))
    .filter(isRealHoleForExpertOracle)
    .map((c) =>
      c.slice(0, 2).map((card) => ({
        suit: card.suit,
        rank: card.value,
      })),
    );
  const out: { opponentHoleCards?: { suit: string; rank: string }[][]; opponentStack: number } = {
    opponentStack,
  };
  if (opponentHoleCards.length > 0) {
    out.opponentHoleCards = opponentHoleCards;
  }
  return out;
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
  avatar?: string;
}

/** `hasFoldedThisHand` côté serveur ; sans champ, repli hors showdown uniquement (vieux API). */
function serverPlayerHasFolded(
  p: { isActive?: boolean; hasFoldedThisHand?: boolean },
  opts: { phaseLower: GamePhase; serverPhaseUpper?: string },
): boolean {
  if (opts.serverPhaseUpper === "WAITING") return false;
  if (p.hasFoldedThisHand === true) return true;
  if (p.hasFoldedThisHand === false) return false;
  if (opts.phaseLower === "showdown") return false;
  return p.isActive === false;
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
  const difficultyParam = (searchParams.get("difficulty") || "moyen").toLowerCase();
  // Mode bot : le solde compte (header / DB) ne bouge pas sauf difficulté « expert » (URL: difficulty=expert).
  const isExpertPracticeBot = isBotMode && difficultyParam === "expert";
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
  const [quantumPinned, setQuantumPinned] = useState(false);
  const quantumPinnedRef = useRef(quantumPinned);

  useEffect(() => {
    quantumPinnedRef.current = quantumPinned;
  }, [quantumPinned]);
  const quantumDragSessionRef = useRef(false);
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
  const clearMultiBustPromptTimer = useCallback(() => {
    if (multiBustPromptTimerRef.current) {
      clearTimeout(multiBustPromptTimerRef.current);
      multiBustPromptTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearQuantumHoverTimer();
      clearQuantumLeaveTimer();
      clearMultiBustPromptTimer();
    };
  }, [clearQuantumHoverTimer, clearQuantumLeaveTimer, clearMultiBustPromptTimer]);

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
    if (quantumDragSessionRef.current) return;
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
  const [playerMenuTarget, setPlayerMenuTarget] = useState<{ id: string; name: string } | null>(null);
  const [_hasFolded, _setHasFolded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pot, setPot] = useState(150);
  const [playerChips, setPlayerChips] = useState(() =>
    searchParams.get("mode") === "bot" ? getUserBalance() : 5000
  );
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const recentGameChatIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    recentGameChatIdsRef.current.clear();
  }, [gameIdParam]);
  const [handActionLog, setHandActionLog] = useState<{ id: string; line: string }[]>([]);
  const [hasPlayerActed, setHasPlayerActed] = useState(false);
  const hasPlayerActedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playersState, setPlayersState] = useState<(BasePlayer | BotPlayer)[]>([]);
  const playersStateRef = useRef<(BasePlayer | BotPlayer)[]>([]);
  useEffect(() => { playersStateRef.current = playersState; }, [playersState]);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [gameTourOpen, setGameTourOpen] = useState(false);
  const [gameTourStep, setGameTourStep] = useState(0);

  useEffect(() => {
    const handleRequestQuit = () => setShowQuitConfirm(true);
    window.addEventListener("request-game-quit", handleRequestQuit);
    return () => window.removeEventListener("request-game-quit", handleRequestQuit);
  }, []);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<PromoDiscountInfo>(null);
  const [freeCheckoutPromo, setFreeCheckoutPromo] = useState(false);
  const [promoValidating, setPromoValidating] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardDigits, setCardDigits] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
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
  const [minRaise, setMinRaise] = useState(100);
  const [tableBigBlind, setTableBigBlind] = useState<number>(BOT_TABLE_DEFAULTS.BIG_BLIND);
  /** Mode bot local : incrément de relance min (dernière taille de raise), comme GameTable.getMinRaise — pas la mise max au pot. */
  const [localMinRaiseIncrement, setLocalMinRaiseIncrement] = useState(BOT_TABLE_DEFAULTS.BIG_BLIND);
  const effectiveMinRaise = useMemo(() => {
    if (!isBotMode || gameIdParam) return minRaise;
    return Math.max(BOT_TABLE_DEFAULTS.BIG_BLIND, localMinRaiseIncrement);
  }, [isBotMode, gameIdParam, minRaise, localMinRaiseIncrement]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [showOpeningShuffle, setShowOpeningShuffle] = useState(false);
  const [, _setDealingCard] = useState<number | null>(null);
  const [roundPlayersActed, setRoundPlayersActed] = useState<Set<number>>(new Set());
  const [gameInitialized, setGameInitialized] = useState(false);
  const [handResult, setHandResult] = useState<"win" | "loss" | null>(null);
  const [_handResultData, setHandResultData] = useState<{ winnerName: string; handName: string } | null>(null);

  const [showTransition, setShowTransition] = useState(false);
  const [roundCount, setRoundCount] = useState(1);
  const [lastWinnerData, setLastWinnerData] = useState<{name: string, amount: number} | undefined>(undefined);

  const [gameOverReason, setGameOverReason] = useState<
    "human_eliminated" | "bot_eliminated" | "practice_stuck" | null
  >(null);
  const [showMultiBustPrompt, setShowMultiBustPrompt] = useState(false);
  const [cashGameClosedModal, setCashGameClosedModal] = useState<{ roomId?: string; message: string } | null>(
    null,
  );
  const [tournamentTableTransition, setTournamentTableTransition] =
    useState<TournamentTableTransitionOverlay>(null);
  const tournamentTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Incrémenté à chaque invalidation des timeouts de navigation tournoi (Zip / résultats). */
  const tournamentScheduledNavEpochRef = useRef(0);
  /** Table quittée par `TOURNAMENT_TABLE_ASSIGNED` avant réception de `GAME_ENDED` (même `gameId`). */
  const pendingTournamentEndedGameIdRef = useRef<string | null>(null);
  const multiBustGameIdRef = useRef<string | null>(null);
  const multiBustPromptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameOverReasonRef = useRef(gameOverReason);
  gameOverReasonRef.current = gameOverReason;
  /** Practice réseau : snapshot reçu pendant l’écran de fin de main — appliqué au clic « Manche suivante ». */
  const pendingBotHandSocketStateRef = useRef<Record<string, unknown> | null>(null);
  const applySocketGameUpdateRef = useRef<(state: Record<string, unknown>) => void>(() => {});
  const [serverHandRuntimePhase, setServerHandRuntimePhase] = useState<string | undefined>(undefined);
  const [showdownResult, setShowdownResult] = useState<{
    winnerId: string;
    winnerIds?: string[];
    winnerName: string;
    hand: string;
    handRank: number;
    pot: number;
    isSplit?: boolean;
    skipRevealDelay?: boolean;
  } | null>(null);
  const [showBotHandEndPanel, setShowBotHandEndPanel] = useState(false);
  /** Multijoueur cash : panneau plein écran « comme le bot » après la révélation des cartes gagnantes. */
  const [showCashHandEndOverlay, setShowCashHandEndOverlay] = useState(false);
  /** Après ~5 s (ou « Passer ») : on peut afficher gagnant / avatar ; avant ça, uniquement la surbrillance des 5 cartes. */
  const [cashShowdownWinnerRevealUnlocked, setCashShowdownWinnerRevealUnlocked] = useState(false);
  const cashHandWinnerModalDismissedRef = useRef(false);
  const [lastBotAction, setLastBotAction] = useState<{ name: string; kind: BotTableActionKind } | null>(null);
  const [runOutPhase, setRunOutPhase] = useState<GamePhase | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  /** Incrémenté à chaque reset / « manche suivante » — invalide les timeouts et fetch showdown retardés. */
  const localHandGenerationRef = useRef(0);
  const gameStateFromSocketRef = useRef(false);
  const clearBotActionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundPlayersActedRef = useRef<Set<number>>(new Set());
  roundPlayersActedRef.current = roundPlayersActed;
  const deckRef = useRef<Card[]>([]);
  const autoTimerActionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dealerIndexRef = useRef<number>(-1);
  const communityCardsStateRef = useRef<(Card | null)[]>([]);
  const startOfHandChipsRef = useRef(0);
  const hasSetStartOfHandThisHandRef = useRef(false);
  const streetTransitionScheduledRef = useRef<string | null>(null);
  const streetTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doStreetTransitionRef = useRef<(() => void) | null>(null);
  const streetPhaseEnteredRef = useRef<number>(0);
  const bothActedNoTurnRef = useRef(false);
  const botIsFetchingRef = useRef(false);
  const handleCheckForBotStuckRef = useRef<(playerId?: number | string) => void>(() => {});
  const handleCallForBotStuckRef = useRef<(amount: number, playerId?: number | string) => void>(() => {});
  const handleFoldForBotStuckRef = useRef<(playerId?: number | string) => void>(() => {});
  /** Une seule synchro `/record-result` par manche (mode expert local sans gameId réseau). */
  const expertRecordSentForGenRef = useRef<number | null>(null);
  /** Dedupe solde + record-result pour une main practice-bot servie par le socket (gameId practice-bot-*). */
  const expertPracticeSocketHandIdSyncedRef = useRef<string | null>(null);
  const [_showdownReveal, setShowdownReveal] = useState(false);
  const showdownStartedRef = useRef(false);
  const showdownResultRef = useRef<typeof showdownResult>(null);
  showdownResultRef.current = showdownResult;
  const [showdownWinningHighlightCards, setShowdownWinningHighlightCards] = useState<Card[]>([]);
  const showdownHighlightKeys = useMemo(() => {
    const s = new Set<string>();
    for (const c of showdownWinningHighlightCards) {
      if (c?.suit && c.suit !== "hidden") s.add(cardHighlightKey(c));
    }
    return s;
  }, [showdownWinningHighlightCards]);
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
  /** Deadline absolue (epoch ms) du ready-check inter-mains tournoi (auto-ready). */
  const [nextHandReadyDeadline, setNextHandReadyDeadline] = useState<number | null>(null);
  const [nextHandReadySecondsLeft, setNextHandReadySecondsLeft] = useState<number | null>(null);
  const myNextHandReady =
    userId && nextHandReadyUserIds.some((u) => String(u) === String(userId));
  const [spectatorWantsToRejoin, setSpectatorWantsToRejoin] = useState(false);

  /** Solde hors table (API) pour l’affichage header en cash ; pas de fetch à chaque GAME_UPDATE. */
  const cashLiquidOffTableRef = useRef<number | null>(null);
  const cashSeatsRef = useRef(cashSeats);
  useEffect(() => {
    cashSeatsRef.current = cashSeats;
  }, [cashSeats]);
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const emitPokerWalletDisplay = useCallback(() => {
    const isCashMulti =
      Boolean(gameIdParam) && !isBotMode && !isSpectating && Boolean(userIdRef.current);
    if (!isCashMulti) {
      window.dispatchEvent(
        new CustomEvent(POKER_WALLET_DISPLAY_EVENT, { detail: { total: null } }),
      );
      return;
    }
    const liq = cashLiquidOffTableRef.current;
    if (liq == null) return;
    const uid = String(userIdRef.current);
    const ps = playersStateRef.current;
    const cs = cashSeatsRef.current;
    const inHand = ps.find((p) => String(p.id) === uid);
    const seated = cs.find((s) => s.userId && String(s.userId) === uid);
    const stack = inHand ? intChips(inHand.chips) : seated ? intChips(seated.chips) : 0;
    window.dispatchEvent(
      new CustomEvent(POKER_WALLET_DISPLAY_EVENT, { detail: { total: liq + stack } }),
    );
  }, [gameIdParam, isBotMode, isSpectating]);

  const cashBalanceSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cashBalanceFetchInFlightRef = useRef(false);
  /** Reconnexion table tournoi : la partie peut ne pas être dans activeGames au premier JOIN_GAME (course création / réseau). */
  const emitTournamentJoinRef = useRef<(() => void) | null>(null);
  const tournamentJoinNotFoundAttemptsRef = useRef(0);

  const scheduleCashBalanceServerSync = useCallback(() => {
    if (!gameIdParam || isBotMode || isSpectating) return;
    if (cashBalanceSyncTimerRef.current) clearTimeout(cashBalanceSyncTimerRef.current);
    cashBalanceSyncTimerRef.current = window.setTimeout(() => {
      cashBalanceSyncTimerRef.current = null;
      if (cashBalanceFetchInFlightRef.current) return;
      cashBalanceFetchInFlightRef.current = true;
      void fetchBalanceFromServer({ authoritative: true })
        .then((v) => {
          cashLiquidOffTableRef.current = v;
          emitPokerWalletDisplay();
        })
        .finally(() => {
          cashBalanceFetchInFlightRef.current = false;
        });
    }, 2200);
  }, [gameIdParam, isBotMode, isSpectating, emitPokerWalletDisplay]);

  useEffect(() => {
    const isCashMulti =
      Boolean(gameIdParam) && !isBotMode && !isSpectating && Boolean(userId);
    if (!isCashMulti) {
      cashLiquidOffTableRef.current = null;
      if (cashBalanceSyncTimerRef.current) clearTimeout(cashBalanceSyncTimerRef.current);
      window.dispatchEvent(
        new CustomEvent(POKER_WALLET_DISPLAY_EVENT, { detail: { total: null } }),
      );
      return;
    }
    let cancelled = false;
    cashBalanceFetchInFlightRef.current = true;
    void fetchBalanceFromServer({ authoritative: true })
      .then((v) => {
        if (cancelled) return;
        cashLiquidOffTableRef.current = v;
        emitPokerWalletDisplay();
      })
      .finally(() => {
        if (!cancelled) cashBalanceFetchInFlightRef.current = false;
      });
    return () => {
      cancelled = true;
      if (cashBalanceSyncTimerRef.current) clearTimeout(cashBalanceSyncTimerRef.current);
    };
  }, [gameIdParam, isBotMode, isSpectating, userId, emitPokerWalletDisplay]);

  useEffect(() => {
    emitPokerWalletDisplay();
  }, [playersState, cashSeats, emitPokerWalletDisplay]);

  useEffect(() => {
    if (!socket || !gameIdParam || isBotMode || isSpectating) return;
    const onBurst = () => scheduleCashBalanceServerSync();
    socket.on("GAME_UPDATE", onBurst);
    socket.on("GAME_STATE_UPDATED", onBurst);
    socket.on("POT_DISTRIBUTED", onBurst);
    return () => {
      socket.off("GAME_UPDATE", onBurst);
      socket.off("GAME_STATE_UPDATED", onBurst);
      socket.off("POT_DISTRIBUTED", onBurst);
    };
  }, [socket, gameIdParam, isBotMode, isSpectating, scheduleCashBalanceServerSync]);

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

  const pushFadingChatLine = useCallback(
    (
      player: string,
      content: string,
      msgType: "emoji" | "text",
      opts?: { delayMs?: number; generation?: number },
    ) => {
      const delayMs = opts?.delayMs ?? 0;
      const gen = opts?.generation ?? localHandGenerationRef.current;
      window.setTimeout(() => {
        if (gen !== localHandGenerationRef.current) return;
        const id = Date.now() + Math.floor(Math.random() * 1000);
        const newMessage: ChatMessage = {
          id,
          player,
          content,
          type: msgType,
          timestamp: id,
          isLeaving: false,
        };
        setChatMessages((prev) => [...prev, newMessage]);
        window.setTimeout(() => {
          if (gen !== localHandGenerationRef.current) return;
          setChatMessages((prev) => prev.map((msg) => (msg.id === id ? { ...msg, isLeaving: true } : msg)));
          window.setTimeout(() => {
            if (gen !== localHandGenerationRef.current) return;
            setChatMessages((prev) => prev.filter((msg) => msg.id !== id));
          }, 500);
        }, 4000);
      }, delayMs);
    },
    [],
  );

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


  useEffect(() => {
  console.log('[FRONT][RENDER] playersState_changed', {
    phase,
    pot,
    gameId: gameIdParam,
    handId: handIdRef.current,
    currentActivePlayer: playersState.find((p) => p.isActive)?.id ?? null,
    communityCards: communityCardsState.map((c) => (c ? `${c.value}-${c.suit}` : null)),
    players: playersState.map((p) => ({
      id: p.id,
      name: p.name,
      chips: p.chips,
      bet: p.bet,
      isActive: p.isActive,
      hasFolded: p.hasFolded,
      isConnected: p.isConnected,
    })),
  });
}, [playersState, phase, pot, communityCardsState, gameIdParam]);

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
  const [gameMenuSlot, setGameMenuSlot] = useState<HTMLElement | null>(null);

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
    const handleRequestTour = () => startGameTour();
    window.addEventListener("request-game-tour", handleRequestTour);
    return () => window.removeEventListener("request-game-tour", handleRequestTour);
  }, [startGameTour]);

  useEffect(() => {
    if (!showMenu) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = menuContainerRef.current;
      if (el && !el.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [showMenu]);

  useLayoutEffect(() => {
    setGameMenuSlot(document.getElementById("game-top-menu-slot"));
  }, []);

  const { colorblindMode } = useAccessibility();
  const { addToast } = useToast();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  const SB = BOT_TABLE_DEFAULTS.SMALL_BLIND;
  const BB = BOT_TABLE_DEFAULTS.BIG_BLIND;

  const SHOWDOWN_REVEAL_MS = 5000;

  const lastScheduledShowdownTransitionSigRef = useRef<string>("");
  const [showdownRevealSkipped, setShowdownRevealSkipped] = useState(false);

  useEffect(() => {
    setShowdownRevealSkipped(false);
    setCashShowdownWinnerRevealUnlocked(false);
    cashHandWinnerModalDismissedRef.current = false;
  }, [showdownResult?.winnerId, showdownResult?.hand, showdownResult?.pot, showdownResult?.isSplit]);

  useEffect(() => {
    if (!showdownResult || showTransition || isBotMode) return;
    const sig = `${showdownResult.winnerId}:${showdownResult.winnerName}:${showdownResult.hand}:${showdownResult.pot}:${showdownResult.isSplit ? 1 : 0}:${showdownResult.skipRevealDelay ? 1 : 0}:${showdownRevealSkipped ? 1 : 0}`;
    if (lastScheduledShowdownTransitionSigRef.current === sig) return;
    lastScheduledShowdownTransitionSigRef.current = sig;
    const delayMs =
      showdownResult.skipRevealDelay || showdownRevealSkipped ? 0 : SHOWDOWN_REVEAL_MS;
    const id = window.setTimeout(() => {
      setLastWinnerData({
        name: showdownResult.winnerName,
        amount: showdownResult.pot,
      });
      const isCashMultiplayer = Boolean(gameIdParam) && !isBotMode;
      if (!isCashMultiplayer) {
        setShowTransition(true);
      }
    }, delayMs);
    return () => clearTimeout(id);
  }, [showdownResult, showTransition, gameIdParam, isBotMode, showdownRevealSkipped, SHOWDOWN_REVEAL_MS]);

  useEffect(() => {
    if (!isBotMode || !showdownResult || gameOverReason) {
      setShowBotHandEndPanel(false);
      return;
    }
    const delayMs =
      showdownResult.skipRevealDelay || showdownRevealSkipped ? 0 : SHOWDOWN_REVEAL_MS;
    const id = window.setTimeout(() => {
      setShowBotHandEndPanel(true);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [isBotMode, showdownResult, gameOverReason, showdownRevealSkipped, SHOWDOWN_REVEAL_MS]);

  useEffect(() => {
    if (!gameIdParam || isBotMode || !showdownResult) {
      setShowCashHandEndOverlay(false);
      return;
    }
    if (cashHandWinnerModalDismissedRef.current) {
      return;
    }
    setShowCashHandEndOverlay(false);
    const delayMs =
      showdownResult.skipRevealDelay || showdownRevealSkipped ? 0 : SHOWDOWN_REVEAL_MS;
    const id = window.setTimeout(() => {
      setCashShowdownWinnerRevealUnlocked(true);
      setShowCashHandEndOverlay(true);
    }, delayMs);
    return () => clearTimeout(id);
  }, [gameIdParam, isBotMode, showdownResult, showdownRevealSkipped, SHOWDOWN_REVEAL_MS]);

  // Note: gardé au cas où la modale "add money" serait réouverte via un handler futur.
  // Pour éviter une erreur lint "unused", on préfixe par "_" tant que non utilisé.
  const _openAddMoney = () => {
    setShowAddMoney(true);
    setAddMoneyAmount(null);
    setPromoCode("");
    setPromoDiscount(null);
    setFreeCheckoutPromo(false);
    setCardName("");
    setCardDigits("");
    setCardExpiry("");
    setCardCvv("");
    setAddSuccess(false);
  };

  const closeAddMoney = () => {
    setShowAddMoney(false);
    setAddMoneyAmount(null);
    setPromoCode("");
    setPromoDiscount(null);
    setFreeCheckoutPromo(false);
    setCardName("");
    setCardDigits("");
    setCardExpiry("");
    setCardCvv("");
    setAddSuccess(false);
  };

  const validatePaymentPromo = useCallback(async (code: string) => {
    if (!code.trim()) {
      setPromoDiscount(null);
      setFreeCheckoutPromo(false);
      return;
    }
    setPromoValidating(true);
    try {
      const top = await validateTopUpPromo(code);
      if (top?.valid && top.freeCheckout) {
        setFreeCheckoutPromo(true);
        setPromoDiscount(null);
        return;
      }
      setFreeCheckoutPromo(false);
      const result = await validateGiftCode(code);
      if (result && result.success && result.discountType) {
        // C'est un code de réduction
        setPromoDiscount({
          discountType: result.discountType as "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT",
          discountValue: result.discountValue || 0,
        });
      } else {
        setPromoDiscount(null);
      }
    } catch (error) {
      console.error("[payment] Promo validation error:", error);
      setPromoDiscount(null);
      setFreeCheckoutPromo(false);
    } finally {
      setPromoValidating(false);
    }
  }, []);

  const submitAddMoney = async () => {
    if (addMoneyAmount == null || addMoneyAmount <= 0) return;
    // Vérifier si c'est un paiement gratuit (réduction 100% ou code solde)
    const finalPrice = simulatedEurFromChips(addMoneyAmount, promoDiscount);
    const isFreePayment = freeCheckoutPromo || finalPrice === 0;
    if (!isFreePayment && !isFakeCardComplete(cardDigits, cardExpiry, cardCvv, cardName)) return;
    let newBalance: number;
    if (mode === "bot") {
      newBalance = addToUserBalance(addMoneyAmount);
    } else {
      newBalance = await addDevMoney(addMoneyAmount, {
        promoCode: freeCheckoutPromo ? promoCode : undefined,
      });
    }
    if (mode === "bot") {
      setPlayerChips(newBalance);
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === "human" || String(p.id) === String(userId) ? { ...p, chips: newBalance } : p,
        ),
      );
    } else {
      // Cash multi : le header affiche `pokerDisplayTotal = cashLiquidOffTableRef + stack`.
      // `addDevMoney` met à jour le solde serveur + localStorage, mais sans rafraîchir
      // la part hors-table le header reste figé sur l’ancien total.
      if (Boolean(gameIdParam) && !isSpectating) {
        cashLiquidOffTableRef.current = newBalance;
        emitPokerWalletDisplay();
      }
    }
    setAddSuccess(true);
    setTimeout(() => closeAddMoney(), 800);
  };

  const isFreePaymentTopUpGame =
    freeCheckoutPromo ||
    Boolean(promoDiscount && simulatedEurFromChips(addMoneyAmount || 0, promoDiscount) === 0);
  const canSubmitTopUpGame =
    addMoneyAmount != null &&
    addMoneyAmount > 0 &&
    (isFreePaymentTopUpGame || isFakeCardComplete(cardDigits, cardExpiry, cardCvv, cardName));

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
      if (gameIdParam) return [];
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

      const dealerIndex = isBotMode
        ? dealerIndexRef.current === -1
          ? Math.floor(Math.random() * totalPlayers)
          : (dealerIndexRef.current + 1) % totalPlayers
        : Math.floor(Math.random() * totalPlayers);
      if (isBotMode) dealerIndexRef.current = dealerIndex;
      allPlayers[dealerIndex].isDealer = true;

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
  const isRoundInteractable =
    gameInitialized &&
    phase !== "init" &&
    phase !== "shuffle" &&
    phase !== "deal" &&
    phase !== "showdown" &&
    !showOpeningShuffle;
  const tablePlayers = activePlayers.map((player) => {
    if (isSpectating && gameIdParam) {
      const pos = activePlayers.indexOf(player) + 1;
      return {
        ...player,
        position: pos,
        cards: player.cards || [],
        isActive: isRoundInteractable && player.isActive,
        hasFolded: player.hasFolded ?? false,
        lastAction:
          lastBotAction?.name === player.name ? labelForBotTableAction(lastBotAction.kind, t) : undefined,
      };
    }
    const base = isHero(player)
      ? { ...player, position: 0, cards: player.cards || [] }
      : { ...player, position: activePlayers.filter((p) => !isHero(p)).indexOf(player) + 1 };
    return {
      ...base,
      isActive: isRoundInteractable && base.isActive && !(isHero(player) && (hasPlayerActed || isLoading)),
      hasFolded: player.hasFolded ?? false,
      lastAction:
        lastBotAction?.name === player.name ? labelForBotTableAction(lastBotAction.kind, t) : undefined,
    };
  });
  const layoutSeatCount =
    isSpectating && gameIdParam ? Math.max(2, activePlayers.length + 1) : undefined;

  const multiplayerShowdownWinnerSlots = useMemo(() => {
    if (!showdownResult || !gameIdParam || isBotMode) return [];
    const ids =
      showdownResult.winnerIds && showdownResult.winnerIds.length > 0
        ? showdownResult.winnerIds
        : [showdownResult.winnerId];
    return ids.map((id) => {
      const p = activePlayers.find((x) => String(x.id) === String(id));
      const name =
        p?.name ??
        (String(id) === String(userId) ? t("game.you") : String(showdownResult.winnerName));
      const avatarUrl = getPokerTableAvatar(name, id, userId ?? null, p?.avatar ?? null);
      return { id, name, avatarUrl };
    });
  }, [showdownResult, gameIdParam, isBotMode, activePlayers, userId, t]);

  const isMyTurn = Boolean(
    activePlayer &&
      (String(activePlayer.id) === String(userId) ||
        activePlayer.name === "Vous" ||
        activePlayer.id === "human")
  );
  const heroPlayer = activePlayers.find((p) => isHero(p));
  const heroDisplayName = heroPlayer?.name === "Vous" || heroPlayer?.name === "you" ? t('game.you') : (heroPlayer?.name ?? t('game.you'));
  const hasFoldedFromState = heroPlayer?.hasFolded ?? false;
  const displayedHeroChips =
    heroPlayer != null && typeof heroPlayer.chips === "number" ? heroPlayer.chips : playerChips;

  const hiddenBetsBetweenHands = Boolean(
    gameIdParam &&
      !isBotMode &&
      (cashWaitingPlayers ||
        (hiddenBetState?.windowType === "PRE_HAND" && !hiddenBetState?.currentHandId)),
  );
  const hiddenBetsStreetLive =
    phase === "flop" || phase === "turn" || phase === "river" || phase === "showdown";
  const hiddenBetsUiEnabled = Boolean(
    gameIdParam && !isBotMode && (hiddenBetsBetweenHands || hiddenBetsStreetLive),
  );
  /** Bandeau d’actions + Paris cachés : aussi entre les mains / showdown, pas seulement quand on peut miser au poker. */
  const showPlayerActionBar = Boolean(
    !isSpectating &&
      (isRoundInteractable || (gameIdParam && !isBotMode && hiddenBetsUiEnabled)),
  );

  /** Surbrillance des 5 cartes gagnantes : au showdown et pendant la pause cash avant la main suivante. */
  const winningCardsHighlightActive = useMemo(() => {
    if (showdownHighlightKeys.size === 0) return false;
    if (phase === "showdown") return true;
    if (gameIdParam && !isBotMode && showdownResult) return true;
    return Boolean(gameIdParam && !isBotMode && cashWaitingPlayers);
  }, [showdownHighlightKeys, phase, gameIdParam, isBotMode, cashWaitingPlayers, showdownResult]);

  useEffect(() => {
    if (!hiddenBetsUiEnabled) setIsPanelOpen(false);
  }, [hiddenBetsUiEnabled]);

  const handleToggleBluff = useCallback(() => {
    if (isBotMode || !hiddenBetsUiEnabled) return;
    setIsPanelOpen((prev) => !prev);
  }, [isBotMode, hiddenBetsUiEnabled]);

  playersStateRef.current = activePlayers;

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

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("game-hud-state", {
        detail: { game: "poker", phase, isMyTurn },
      })
    );
  }, [phase, isMyTurn]);

  useEffect(() => {
    return () => window.dispatchEvent(new Event("game-hud-reset"));
  }, []);

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
    if (!gameIdParam && isBotMode) {
      setLocalMinRaiseIncrement(BOT_TABLE_DEFAULTS.BIG_BLIND);
    }
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

  // ========== useCallback ile sarılmış deal fonksiyonları ==========
  const dealFlop = useCallback((runOutOnly?: boolean) => {
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
  }, []);

  const dealTurn = useCallback((runOutOnly?: boolean) => {
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
  }, []);

  const dealRiver = useCallback((runOutOnly?: boolean) => {
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
  }, []);

  // ========== calculateSidePots fonksiyonu ==========
  const calculateSidePots = (players: (BasePlayer | BotPlayer)[], contributions: Record<string, number>): { amount: number; eligibleIds: string[] }[] => {
    const allInPlayers = players.filter(p => (p.chips ?? 0) === 0 && !(p.hasFolded ?? false));
    if (allInPlayers.length === 0) {
      return [{ amount: pot, eligibleIds: players.filter(p => !(p.hasFolded ?? false)).map(p => String(p.id)) }];
    }
    
    const pots: { amount: number; eligibleIds: string[] }[] = [];
    let remainingPot = pot;
    const sortedAllIn = [...allInPlayers].sort((a, b) => (contributions[String(a.id)] || 0) - (contributions[String(b.id)] || 0));
    
    for (const allIn of sortedAllIn) {
      const allInContribution = contributions[String(allIn.id)] || 0;
      const sidePotAmount = Math.min(remainingPot, allInContribution * players.filter(p => !(p.hasFolded ?? false)).length);
      if (sidePotAmount > 0) {
        pots.push({
          amount: sidePotAmount,
          eligibleIds: players.filter(p => !(p.hasFolded ?? false) && (contributions[String(p.id)] || 0) >= allInContribution).map(p => String(p.id))
        });
        remainingPot -= sidePotAmount;
      }
    }
    
    if (remainingPot > 0) {
      pots.push({
        amount: remainingPot,
        eligibleIds: players.filter(p => !(p.hasFolded ?? false)).map(p => String(p.id))
      });
    }
    
    return pots;
  };

  const postExpertPracticeRecordResult = useCallback((delta: number) => {
    const token = getAuthItem("token");
    if (!token) return;
    void fetch(apiUrl("/api/game/record-result"), {
      method: "POST",
      headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        won: delta >= 0,
        delta,
        persistChips: true,
      }),
    })
      .then((r) => r.json().catch(() => ({})))
      .then((data) => {
        if (data && typeof data === "object") {
          mergeGamificationFromServerResponse(data as Record<string, unknown>);
        }
      })
      .catch((err) => console.error("Erreur record-result:", err));
  }, []);

  /** Solde compte + persistance serveur — practice bot « expert » uniquement (local sans gameId, ou gameId practice-bot-* géré ailleurs). */
  const applyLocalExpertWalletDelta = useCallback(
    (delta: number) => {
      // Partie cash : le serveur porte le wallet ; pas de double comptage client.
      if (gameIdParam && !String(gameIdParam).startsWith(PRACTICE_BOT_GAME_ID_PREFIX)) return;
      if (!isBotMode || !isExpertPracticeBot) return;
      if (delta !== 0) {
        addToUserBalance(delta);
      }
      const g = localHandGenerationRef.current;
      if (expertRecordSentForGenRef.current === g) return;
      expertRecordSentForGenRef.current = g;
      postExpertPracticeRecordResult(delta);
    },
    [gameIdParam, isBotMode, isExpertPracticeBot, postExpertPracticeRecordResult],
  );

  useEffect(() => {
    if (isBotMode) setIsPanelOpen(false);
  }, [isBotMode]);

  // ========== Devam eden useEffect'ler ==========
  useEffect(() => {
    const runInit = () => {
      let initial: (BasePlayer | BotPlayer)[] = [];
      // Avec `gameId`, l’état vient du serveur (fetch + socket) — pas de stub localStorage au refresh.
      if (initial.length === 0) initial = getPlayers();
      initial.forEach((p) => {
        p.cards = [];
      });
      setPlayersState(initial);
      if (!gameIdParam) {
        setDeck(generateDeck());
      }
      if (mode === "bot" && !gameIdParam) {
        setPot(SB + BB);
        setPlayerChips(getUserBalance());
        setPhase("init");
        setGameInitialized(false);
        setLocalMinRaiseIncrement(BOT_TABLE_DEFAULTS.BIG_BLIND);
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
    localHandGenerationRef.current += 1;
    setLocalMinRaiseIncrement(BOT_TABLE_DEFAULTS.BIG_BLIND);
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
    setShowdownWinningHighlightCards([]);
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
    setIsLoading(false);
    hasPlayerActedRef.current = false;
    setHasPlayerActed(false);
    setShowBotHandEndPanel(false);
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.state, isBotMode, navigate, location.pathname, location.search]);

  useEffect(() => {
    if (!gameIdParam || isSpectating || !userId) return;
    const url = `${apiUrl(`/api/game/${encodeURIComponent(gameIdParam)}`)}?playerId=${encodeURIComponent(userId)}`;
    let cancelled = false;
    fetch(url, {
      headers: { Authorization: `Bearer ${getAuthItem("token") ?? ""}` },
    })
      .then((res) => {
        if (cancelled) return null;
        if (res.status === 404) {
          const tid = searchParams.get("tournamentId");
          if (gameIdParam?.startsWith(TOURNAMENT_GAME_ID_PREFIX) && tid) {
            navigate(`/tournaments/${encodeURIComponent(tid)}`, { replace: true });
            return null;
          }
          navigate("/lobby", { state: { message: "Partie terminée (adversaire parti ou partie supprimée)." } });
          return null;
        }
        if (!res.ok) throw new Error(String(res.status));
        return res.json();
      })
      .then((gameState: { players?: { id: string; name: string; chips: number; currentBet?: number; position?: number; isActive?: boolean; isDealer?: boolean; isConnected?: boolean; hasFoldedThisHand?: boolean; role?: string; cards?: { suit: string; value: string }[] }[]; pot?: number; phase?: string; communityCards?: (Card | null)[]; currentTurn?: string; turnTimeLimitSec?: number; handId?: string } | null) => {
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
          const inHandForFog =
            !serverPlayerHasFolded(p, { phaseLower: phase, serverPhaseUpper: gameState.phase }) &&
            p.isActive !== false;
          const hiddenOpponentCards: Card[] =
            !isMe && phase !== "showdown" && inHandForFog
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
            hasFolded: serverPlayerHasFolded(p, { phaseLower: phase, serverPhaseUpper: gameState.phase }),
            isBot: String(p.id).startsWith("qb-bot-"),
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
        setMinRaise((gameState as { minRaise?: number }).minRaise ?? 100);
        setTableBigBlind((prev) => {
          const bb = (gameState as { bigBlind?: number }).bigBlind;
          return typeof bb === "number" && bb > 0 ? bb : prev;
        });
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
  }, [gameIdParam, userId, navigate, isSpectating, searchParams]);

  useEffect(() => {
  if (!socket || !gameIdParam) return;

    const onChatMessage = (data: {
      id?: string;
      gameId?: string;
      playerId: string;
      playerName: string;
      content: string;
      type: "emoji" | "text";
    }) => {
      if (data.gameId != null && data.gameId !== gameIdParam) return;

      const dedupKey =
        data.id && data.id.length > 0
          ? data.id
          : `legacy:${data.playerId}:${data.content}:${data.type}`;
      if (recentGameChatIdsRef.current.has(dedupKey)) return;
      recentGameChatIdsRef.current.add(dedupKey);
      while (recentGameChatIdsRef.current.size > 50) {
        const first = recentGameChatIdsRef.current.values().next().value;
        if (first != null) recentGameChatIdsRef.current.delete(first);
      }

      const id: number | string =
        data.id && data.id.length > 0 ? data.id : `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const isMe = String(data.playerId) === String(userId);
      const newMessage: ChatMessage = {
        id,
        player: isMe ? "Vous" : data.playerName,
        content: data.content,
        type: data.type,
        timestamp: typeof id === "number" ? id : Date.now(),
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
        if (
          gameIdParam?.startsWith(TOURNAMENT_GAME_ID_PREFIX) &&
          (userId || isSpectating) &&
          tournamentJoinNotFoundAttemptsRef.current < 10
        ) {
          tournamentJoinNotFoundAttemptsRef.current += 1;
          const n = tournamentJoinNotFoundAttemptsRef.current;
          const delay = Math.min(4000, 100 + n * n * 55);
          window.setTimeout(() => emitTournamentJoinRef.current?.(), delay);
          return;
        }
        const tid = searchParams.get("tournamentId");
        if (gameIdParam?.startsWith(TOURNAMENT_GAME_ID_PREFIX) && tid) {
          navigate(`/tournaments/${encodeURIComponent(tid)}`, { replace: true });
          return;
        }
        navigate("/lobby", { state: { message: "Partie terminée (adversaire parti ou partie supprimée)." } });
      }
        else if (payload?.code === "ACTION_ERROR" || payload?.code === "INVALID_RAISE" || payload?.code === "TOO_MANY_ACTIONS") {
          addToast(payload?.message || t('common.error'), "error");
          setIsLoading(false);
          setHasPlayerActed(false);
          hasPlayerActedRef.current = false;
        }
    };
    socket.on("ERROR", onError);
    return () => {
      socket.off("GAME_CHAT", onChatMessage);
      socket.off("ERROR", onError);
    };
  }, [socket, gameIdParam, userId, navigate, addToast, t, isSpectating, searchParams]);

  useEffect(() => {
    /* Toujours annuler le timer de fin de table : sans ça, un passage demi-finale → finale
     * (deux `game_tournament_*`) laissait actif le timeout « secours » 12s / 3.8s programmé sur l’ancienne
     * table → navigation forcée vers /waiting (Zip) pendant la finale.
     * Important : ne jamais `return` avant de définir le cleanup — sinon pas de cleanup au démontage
     * quand `gameIdParam` reste en `game_tournament_*` (Zip puis finale : timer orphelin). */
    pendingTournamentEndedGameIdRef.current = null;
    if (tournamentTransitionTimerRef.current) {
      clearTimeout(tournamentTransitionTimerRef.current);
      tournamentTransitionTimerRef.current = null;
      tournamentScheduledNavEpochRef.current += 1;
    }
    if (!gameIdParam?.startsWith(TOURNAMENT_GAME_ID_PREFIX)) {
      setTournamentTableTransition(null);
    }

    return () => {
      if (tournamentTransitionTimerRef.current) {
        clearTimeout(tournamentTransitionTimerRef.current);
        tournamentTransitionTimerRef.current = null;
        tournamentScheduledNavEpochRef.current += 1;
      }
    };
  }, [gameIdParam]);

  useEffect(() => {
    tournamentJoinNotFoundAttemptsRef.current = 0;
  }, [gameIdParam]);

  useEffect(() => {
    if (!socket || !gameIdParam || !gameIdParam.startsWith(TOURNAMENT_GAME_ID_PREFIX)) return;
    const tidFromUrl = searchParams.get("tournamentId");
    const onTournamentTableAssigned = (payload: {
      tournamentId?: string;
      gameId?: string;
      roundNumber?: number;
      isFinalTable?: boolean;
    }) => {
      if (!payload?.gameId) return;
      if (String(payload.gameId) === String(gameIdParam)) return;
      if (tournamentTransitionTimerRef.current) {
        clearTimeout(tournamentTransitionTimerRef.current);
        tournamentTransitionTimerRef.current = null;
        tournamentScheduledNavEpochRef.current += 1;
      }
      pendingTournamentEndedGameIdRef.current = String(gameIdParam);
      const tid = payload.tournamentId ?? tidFromUrl;
      const gid = String(payload.gameId);
      if (tid) {
        if (payload.isFinalTable === true) {
          const w = new URLSearchParams();
          w.set("nextGameId", gid);
          w.set("finalZip", "1");
          navigate(`/tournaments/${encodeURIComponent(tid)}/waiting?${w.toString()}`, {
            replace: true,
          });
        } else {
          const q = new URLSearchParams();
          q.set("gameId", gid);
          q.set("tournamentId", tid);
          navigate(`/game?${q.toString()}`, { replace: true });
        }
        return;
      }
      const q = new URLSearchParams();
      q.set("gameId", gid);
      navigate(`/game?${q.toString()}`, { replace: true });
    };
    socket.on("TOURNAMENT_TABLE_ASSIGNED", onTournamentTableAssigned);
    return () => {
      socket.off("TOURNAMENT_TABLE_ASSIGNED", onTournamentTableAssigned);
    };
  }, [socket, gameIdParam, navigate, searchParams]);

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
    const onGameUpdate = (_source: "GAME_UPDATE" | "GAME_STATE_UPDATED", gameState: { players?: { id: string; name: string; chips: number; currentBet?: number; position?: number; isActive?: boolean; isDealer?: boolean; isConnected?: boolean; hasFoldedThisHand?: boolean; role?: string; cards?: { suit: string; value: string }[] }[]; pot?: number; phase?: string; communityCards?: (Card | null)[]; currentTurn?: string; showdownWinnerId?: string; showdownWinnerIds?: string[]; showdownIsSplit?: boolean; showdownHandName?: string; showdownPot?: number; cashCountdownEndsAt?: number; cashCountdownRemainingSec?: number; cashSeats?: { seatIndex: number; userId: string | null; username: string | null; chips: number }[]; spectatorRejoinQueue?: string[]; turnTimeLimitSec?: number; handId?: string; actionVersion?: number; streetVersion?: number; updatedAt?: string; hiddenBetNextHandId?: string; hiddenBetWindowOpen?: boolean; hiddenBetState?: { currentHandId: string | null; nextHandId: string | null; windowOpen: boolean; windowType: "PRE_HAND" | "LIVE_FLOP" | "LIVE_TURN" | "LIVE_RIVER" | null; closesAt?: number } | null }) => {
      console.log('[FRONT][GAME] socket_update_received', {
  source: _source,
  gameId: gameState?.id,
  handId: gameState?.handId,
  phase: gameState?.phase,
  currentTurn: gameState?.currentTurn,
  actionVersion: gameState?.actionVersion,
  streetVersion: gameState?.streetVersion,
  pot: gameState?.pot,
  showdownWinnerId: gameState?.showdownWinnerId,
  communityCount: Array.isArray(gameState?.communityCards)
    ? gameState.communityCards.filter((c) => c != null).length
    : 0,
  playersCount: Array.isArray(gameState?.players) ? gameState.players.length : 0,
  socketId: socket?.id,
})
      setHiddenBetNextHandId(gameState.hiddenBetNextHandId ?? null);
      setHiddenBetWindowOpen(Boolean(gameState.hiddenBetWindowOpen));
      setHiddenBetState(gameState.hiddenBetState ?? null);
      const stMeta = gameState as {
        updatedAt?: string;
        streetVersion?: number;
        pot?: number;
        handRuntimePhase?: string;
        id?: string;
        snapshotSeq?: number;
      };
      /* Signature de déduplication : ne jamais se limiter à id+updatedAt — deux états distincts
       * peuvent partager le même ISO ms, ou currentTurn peut changer sans nouveau timestamp côté moteur.
       * Omettre phase/tour/pot/version provoquait des socket_update_ignored_same_snapshot et un UI bloqué
       * (ex. preflop, currentTurn vide jusqu’au refresh). */
      const snapSeq =
        typeof stMeta.snapshotSeq === "number" && Number.isFinite(stMeta.snapshotSeq)
          ? stMeta.snapshotSeq
          : "no-seq";
      const updatedAtKey =
        typeof stMeta.updatedAt === "string" && stMeta.updatedAt.length > 0
          ? stMeta.updatedAt
          : "no-ts";
      const socketSnapshotSig = `${stMeta.id ?? gameState.handId ?? "no-id"}:${updatedAtKey}:${gameState.handId ?? "no-hand"}:${gameState.phase ?? "no-phase"}:${typeof gameState.actionVersion === "number" ? gameState.actionVersion : "no-ver"}:${gameState.currentTurn ?? "no-turn"}:${(gameState.communityCards ?? []).filter((c) => c != null).length}:${gameState.showdownWinnerId ?? "no-winner"}:${typeof stMeta.streetVersion === "number" ? stMeta.streetVersion : "no-sv"}:${typeof stMeta.pot === "number" ? stMeta.pot : "no-pot"}:${stMeta.handRuntimePhase ?? "no-hrp"}:seq:${snapSeq}`;
      if (socketSnapshotSig === lastAppliedSocketSnapshotSigRef.current) {
  console.log('[FRONT][GAME] socket_update_ignored_same_snapshot', {
    socketSnapshotSig,
    handId: gameState?.handId,
    phase: gameState?.phase,
  });
  return;
}
      const incomingHandIdEarly = gameState.handId ?? undefined;
      const previousHandIdEarly = handIdRef.current;
      const handChangedEarly =
        Boolean(incomingHandIdEarly && previousHandIdEarly && incomingHandIdEarly !== previousHandIdEarly);
      if (
        handChangedEarly &&
        isBotMode &&
        gameIdParam &&
        showdownResultRef.current &&
        !gameOverReasonRef.current
      ) {
        pendingBotHandSocketStateRef.current = gameState as Record<string, unknown>;
        lastAppliedSocketSnapshotSigRef.current = socketSnapshotSig;
        /* La nouvelle main attend le bouton « Manche suivante » / Rejouer — pas d’application auto. */
        return;
      }
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
  console.log('[FRONT][GAME] socket_update_ignored_older_version', {
    incomingVersion,
    lastKnownVersion: lastServerActionVersionRef.current,
    incomingHandId,
    trackedHandId: lastServerActionVersionHandRef.current,
  });
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
      /** Nouvelle main « en jeu » : hors pause / showdown / attente lobby. */
      const activePlayPhase =
        incomingPhase === "preflop" ||
        incomingPhase === "flop" ||
        incomingPhase === "turn" ||
        incomingPhase === "river";
      if (activePlayPhase) {
        setCashWaitingPlayers(false);
        setCashCountdownEndsAt(null);
      }
      if (gameState.phase === "WAITING") {
        /* Cash multijoueur : garder le dernier résultat pour le panneau paris cachés entre deux mains. */
        if (!gameIdParam || isBotMode) {
          setShowdownResult(null);
          showdownResultRef.current = null;
        }
        setShowTransition(false);
        lastScheduledShowdownTransitionSigRef.current = "";
      }
      /** Garde AVANT toute mutation : évite d'appliquer WAITING (tous isActive false) juste après SHOWDOWN.
       * Tournoi (virtual) : ne pas bloquer — sinon la main suivante peut ne jamais s’afficher sans refresh. */
      const previousHandIdBeforeUpdate = handIdRef.current;
      if (
        incomingPhase === "init" &&
        gameState.phase === "WAITING" &&
        previousHandIdBeforeUpdate &&
        Date.now() - lastShowdownSnapshotAtRef.current < 3000 &&
        !gameIdParam?.startsWith(TOURNAMENT_GAME_ID_PREFIX)
      ) {
        return;
      }
      lastAppliedSocketSnapshotSigRef.current = socketSnapshotSig;
      if (typeof gameState.turnTimeLimitSec === "number" && gameState.turnTimeLimitSec > 0) {
        turnTimeLimitSecRef.current = gameState.turnTimeLimitSec;
      }
      handIdRef.current = gameState.handId;
      if (
        incomingHandId &&
        previousHandIdBeforeUpdate &&
        incomingHandId !== previousHandIdBeforeUpdate
      ) {
        expertPracticeSocketHandIdSyncedRef.current = null;
        setShowdownResult(null);
        showdownResultRef.current = null;
        setHandResult(null);
        setShowTransition(false);
        lastScheduledShowdownTransitionSigRef.current = "";
        showdownStartedRef.current = false;
        setShowdownWinningHighlightCards([]);
      }
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
      if (players.length > 0) {
        gameStateFromSocketRef.current = true;
      }
      setPlayersState((prev) => {
        const myCardsFromPrev = isSpectating ? [] : (prev.find((p) => String(p.id) === String(userId))?.cards ?? []);
        const currentTurnId = gameState.currentTurn != null ? String(gameState.currentTurn) : "";
        const mapped = players.map((p, index) => {
          const isMe = !isSpectating && String(p.id) === String(userId);
          const serverCardsRaw = Array.isArray(p.cards) ? p.cards : [];
          const serverCards = serverCardsRaw.map((c) => normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0])).filter((c): c is Card => c !== null);
          const foldedByServer = serverPlayerHasFolded(p, {
            phaseLower: incomingPhase,
            serverPhaseUpper: gameState.phase,
          });
          const inHandForFog = !foldedByServer && p.isActive !== false;
          const hiddenOpponentCards: Card[] =
            !isMe && incomingPhase !== "showdown" && inHandForFog
              ? [{ suit: "hidden", value: "?" }, { suit: "hidden", value: "?" }]
              : [];
          const myCards = isMe
            ? (serverCards.length > 0 ? serverCards : myCardsFromPrev)
            : (serverCards.length > 0 ? serverCards : hiddenOpponentCards);
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
            hasFolded: foldedByServer,
            isBot: String(p.id).startsWith("qb-bot-"),
            role: mapServerRoleToTableRole(p.role),
            avatar: (p as { avatar?: string }).avatar,
          };
        });
        return mapped;
      });
      setPot(gameState.pot ?? 0);
      setMinRaise((gameState as { minRaise?: number }).minRaise ?? 100);
      setTableBigBlind((prev) => {
        const bb = (gameState as { bigBlind?: number }).bigBlind;
        return typeof bb === "number" && bb > 0 ? bb : prev;
      });
      setServerHandRuntimePhase(
        typeof (gameState as { handRuntimePhase?: string }).handRuntimePhase === "string"
          ? (gameState as { handRuntimePhase?: string }).handRuntimePhase
          : undefined,
      );
      const phase = incomingPhase;
      const hrpRaw =
        typeof (gameState as { handRuntimePhase?: string }).handRuntimePhase === "string"
          ? (gameState as { handRuntimePhase?: string }).handRuntimePhase!
          : "";
      const hasShowdownWinnerEarly = Boolean(
        gameState.showdownWinnerId ||
          (gameState.showdownWinnerIds && gameState.showdownWinnerIds.length > 0),
      );
      const multiplayerEndOfHandShowdown =
        Boolean(gameIdParam) &&
        !isBotMode &&
        hasShowdownWinnerEarly &&
        (hrpRaw === "HAND_COMPLETE" ||
          hrpRaw === "SHOWDOWN_REVEAL" ||
          hrpRaw === "SHOWDOWN_PENDING");
      const treatAsShowdownForUi = phase === "showdown" || multiplayerEndOfHandShowdown;
      if (treatAsShowdownForUi) {
        lastShowdownSnapshotAtRef.current = Date.now();
      }
      setPhase(phase as GamePhase);
      setBurnedCardsCount((gameState as { burnedCardsCount?: number }).burnedCardsCount ?? 0);
      const swc = (
        gameState as {
          showdownWinningCards?: { suit?: string; rank?: string; value?: number | string }[];
        }
      ).showdownWinningCards;
      if (treatAsShowdownForUi && Array.isArray(swc) && swc.length > 0) {
        const norm = swc
          .map((c) => normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]))
          .filter((c): c is Card => Boolean(c));
        setShowdownWinningHighlightCards(norm);
      } else if (!treatAsShowdownForUi) {
        setShowdownWinningHighlightCards([]);
      }
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
      hasPlayerActedRef.current = false;
      setIsLoading(false);
      setRoundPlayersActed(new Set());

      const humanServerChips = !isSpectating ? players.find((p) => String(p.id) === String(userId))?.chips : undefined;
      if (humanServerChips != null) {
        setPlayerChips(humanServerChips);
      }

      const currentTurnId = gameState.currentTurn != null ? String(gameState.currentTurn) : "";
      if (treatAsShowdownForUi && !isSpectating) {
        setTimerActive(false);
      } else if (currentTurnId && currentTurnId === String(userId)) {
        setTimerActive(true);
        setTimeLeft(turnTimeLimitSecRef.current);
      } else {
        setTimerActive(false);
      }
      const hasShowdownWinner = hasShowdownWinnerEarly;
      if (treatAsShowdownForUi && hasShowdownWinner) {
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
        const isPracticeBotServerGame = Boolean(
          gameIdParam?.startsWith(PRACTICE_BOT_GAME_ID_PREFIX),
        );
        if (balanceChange !== 0) {
          if (isPracticeBotServerGame) {
            // Practice-bot via serveur : solde compte + DB seulement en expert.
            if (isBotMode && isExpertPracticeBot) {
              const hid =
                typeof gameState.handId === "string" ? gameState.handId : "";
              if (
                hid &&
                expertPracticeSocketHandIdSyncedRef.current !== hid
              ) {
                expertPracticeSocketHandIdSyncedRef.current = hid;
                addToUserBalance(balanceChange);
                postExpertPracticeRecordResult(balanceChange);
              }
            }
          } else if (!gameIdParam && (!isBotMode || isExpertPracticeBot)) {
            // Table locale sans gameId (legacy) : pas de double comptage avec une partie cash.
            addToUserBalance(balanceChange);
          }
        }

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
    applySocketGameUpdateRef.current = (st) => {
      onGameUpdate("GAME_UPDATE", st as Parameters<typeof onGameUpdate>[1]);
    };
    const onGameUpdateMain = (state: Parameters<typeof onGameUpdate>[1]) => onGameUpdate("GAME_UPDATE", state);
    const onGameStateUpdated = (state: Parameters<typeof onGameUpdate>[1]) => onGameUpdate("GAME_STATE_UPDATED", state);
    const onHandStateChanged = (payload: { gameId?: string }) => {
      if (!gameIdParam) return;
      const gid = String(payload?.gameId ?? "");
      if (
        gid !== String(gameIdParam) &&
        gid !== String(pendingTournamentEndedGameIdRef.current)
      ) {
        return;
      }
      /* Si un snapshot a été mal dédupliqué, le prochain GAME_UPDATE doit passer ; débloque aussi isLoading. */
      lastAppliedSocketSnapshotSigRef.current = "";
      setIsLoading(false);
    };
    socket.on("GAME_UPDATE", onGameUpdateMain);
    socket.on("GAME_STATE_UPDATED", onGameStateUpdated);
    socket.on("HAND_STATE_CHANGED", onHandStateChanged);
    const onGameEnded = (data: {
      gameId: string;
      winnerId?: string;
      reason: string;
      pot?: number;
      roomId?: string;
      tournamentId?: string;
      winnerUserId?: string;
      /** Aligné sur `TournamentTableFinishAdvance` côté serveur. */
      tournamentAdvance?:
        | "pending_other_tables"
        | "next_round_spawned"
        | "tournament_complete";
    }) => {
      /* Compteur "matchs joués" : seul un participant (non-spectateur) le voit
       * augmenter. Anti-doublon par gameId, et prompt de notation tous les 5. */
      if (!isSpectating) {
        recordCompletedMatchAndMaybePromptRating(data.gameId);
      }
      if (data.reason === "TOURNAMENT_TABLE_COMPLETE" && data.tournamentId) {
        const endedGid = String(data.gameId);
        const matchesTable =
          endedGid === String(gameIdParam) ||
          endedGid === String(pendingTournamentEndedGameIdRef.current);
        if (!matchesTable) return;
        pendingTournamentEndedGameIdRef.current = null;
        const tid = String(data.tournamentId);
        const winner =
          data.winnerUserId != null
            ? String(data.winnerUserId)
            : data.winnerId != null
              ? String(data.winnerId)
              : "";
        const advance = data.tournamentAdvance ?? "pending_other_tables";
        const clearTournamentTransitionTimer = () => {
          if (tournamentTransitionTimerRef.current) {
            clearTimeout(tournamentTransitionTimerRef.current);
            tournamentTransitionTimerRef.current = null;
          }
          tournamentScheduledNavEpochRef.current += 1;
        };

        if (isSpectating) {
          navigate(`/tournaments/${encodeURIComponent(tid)}`, { replace: true });
          return;
        }

        const amIWinner = Boolean(userId && winner && winner === String(userId));

        if (!amIWinner) {
          clearTournamentTransitionTimer();
          setTournamentTableTransition({ variant: "eliminated", tournamentId: tid });
          const navTicket = tournamentScheduledNavEpochRef.current;
          tournamentTransitionTimerRef.current = setTimeout(() => {
            if (tournamentScheduledNavEpochRef.current !== navTicket) return;
            tournamentTransitionTimerRef.current = null;
            setTournamentTableTransition(null);
            navigate(`/tournaments/${encodeURIComponent(tid)}`, { replace: true });
          }, 3800);
          return;
        }

        clearTournamentTransitionTimer();
        void fetchBalanceFromServer({ authoritative: true });
        window.setTimeout(() => void fetchBalanceFromServer({ authoritative: true }), 700);
        window.setTimeout(() => void fetchBalanceFromServer({ authoritative: true }), 2200);

        if (advance === "tournament_complete") {
          setTournamentTableTransition({ variant: "champion", tournamentId: tid });
          const navTicket = tournamentScheduledNavEpochRef.current;
          tournamentTransitionTimerRef.current = setTimeout(() => {
            if (tournamentScheduledNavEpochRef.current !== navTicket) return;
            tournamentTransitionTimerRef.current = null;
            setTournamentTableTransition(null);
            navigate(`/tournaments/${encodeURIComponent(tid)}/results`, { replace: true });
          }, 4200);
          return;
        }

        if (advance === "pending_other_tables") {
          /* Premier joueur à finir sa table : on l'envoie sur la page d'attente
           * (ZipRush mini-game) le temps que les autres tables finissent. Sans
           * navigation explicite ici, le joueur reste bloqué sur /game vu que
           * le ready-check inter-rounds qui s'en chargeait avant a été supprimé. */
          setTournamentTableTransition({ variant: "won_waiting", tournamentId: tid });
          const navTicketW = tournamentScheduledNavEpochRef.current;
          tournamentTransitionTimerRef.current = setTimeout(() => {
            if (tournamentScheduledNavEpochRef.current !== navTicketW) return;
            tournamentTransitionTimerRef.current = null;
            setTournamentTableTransition(null);
            navigate(`/tournaments/${encodeURIComponent(tid)}/waiting`, {
              replace: true,
            });
          }, 5000);
          return;
        }

        if (advance === "next_round_spawned") {
          /* Table suivante : assignation directe sauf finale (Zip + finalZip) ; secours → salle d’attente sans délai Zip forcé. */
          setTournamentTableTransition({ variant: "won_next_table", tournamentId: tid });
          const navTicketN = tournamentScheduledNavEpochRef.current;
          tournamentTransitionTimerRef.current = setTimeout(() => {
            if (tournamentScheduledNavEpochRef.current !== navTicketN) return;
            tournamentTransitionTimerRef.current = null;
            setTournamentTableTransition(null);
            navigate(`/tournaments/${encodeURIComponent(tid)}/waiting`, { replace: true });
          }, 12000);
          return;
        }

        return;
      }
      if (data.reason === "opponent_left" && data.winnerId != null && String(data.winnerId) === String(userId)) {
        const balanceChange = Math.round(data.pot ?? 0);
        const isPracticeBotServerGame = Boolean(
          gameIdParam?.startsWith(PRACTICE_BOT_GAME_ID_PREFIX),
        );
        if (balanceChange !== 0) {
          if (isPracticeBotServerGame) {
            if (isBotMode && isExpertPracticeBot) {
              addToUserBalance(balanceChange);
              postExpertPracticeRecordResult(balanceChange);
            }
          } else if (!gameIdParam && (!isBotMode || isExpertPracticeBot)) {
            addToUserBalance(balanceChange);
          }
        }
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
        setCashGameClosedModal({
          roomId: data.roomId,
          message: t("game.cashTableClosedReturnToWaitingRoom"),
        });
      }
    };
    socket.on("GAME_ENDED", onGameEnded);
    const onPracticeSessionEnd = (data: { gameId?: string; reason?: string }) => {
      if (String(data.gameId) !== String(gameIdParam)) return;
      if (!isBotMode) return;
      const r = data.reason;
      if (r === "human_won") setGameOverReason("bot_eliminated");
      else if (r === "human_busted") setGameOverReason("human_eliminated");
      else setGameOverReason("practice_stuck");
    };
    socket.on("PRACTICE_SESSION_END", onPracticeSessionEnd);
    const onPlayerBusted = (data: {
      gameId?: string;
      userId?: string;
      reason?: string;
      mode?: string;
    }) => {
      if (!data || String(data.userId) !== String(userId)) return;
      if (!gameIdParam || String(data.gameId) !== String(gameIdParam)) return;
      if (isBotMode || isSpectating) return;
      multiBustGameIdRef.current = String(gameIdParam);
      setShowMultiBustPrompt(false);
      clearMultiBustPromptTimer();
      multiBustPromptTimerRef.current = window.setTimeout(() => {
        setShowMultiBustPrompt(true);
        multiBustPromptTimerRef.current = null;
      }, 3000);
    };
    socket.on("PLAYER_BUSTED", onPlayerBusted);
    const onCashWaiting = (state: { cashCountdownEndsAt?: number; cashSeats?: { seatIndex: number; userId: string | null; username: string | null; chips: number }[] }) => {
      setCashWaitingPlayers(true);
      setShowTransition(false); // jamais l’overlay jaune « prochaine manche » entre deux mains cash
      setShowInterHandPanel(false); // on attend d’abord la phase d’abattage
      setHasClickedReadyThisInterHand(false);
      setCashCountdownEndsAt(null);
      setNextHandReadyUserIds([]);
      setAllNextHandReady(false);
      setNextHandReadyDeadline(null);
      setNextHandReadySecondsLeft(null);
      if (state.cashSeats) setCashSeats(state.cashSeats);
    };
    socket.on("CASH_WAITING_PLAYERS", onCashWaiting);

    const onNextHandReadyUpdated = (data: {
      readyUserIds?: string[];
      allReady?: boolean;
      readyDeadline?: number | null;
    }) => {
      setNextHandReadyUserIds(Array.isArray(data.readyUserIds) ? data.readyUserIds : []);
      setAllNextHandReady(Boolean(data.allReady));
      const dl =
        typeof data.readyDeadline === "number" && Number.isFinite(data.readyDeadline)
          ? data.readyDeadline
          : null;
      setNextHandReadyDeadline(dl);
    };
    socket.on("CASH_NEXT_HAND_READY_UPDATED", onNextHandReadyUpdated);
    const onQueueStatus = (data: { queued: boolean }) => setSpectatorWantsToRejoin(data.queued);
    socket.on("SPECTATOR_QUEUE_STATUS", onQueueStatus);

    const emitJoinRoom = () => {
      if (!socket.connected || !gameIdParam) return;
      lastAppliedSocketSnapshotSigRef.current = "";
      console.log("[FRONT][GAME] emit_join_room", {
        gameId: gameIdParam,
        isSpectating,
        socketId: socket.id,
      });
      if (isSpectating) {
        socket.emit("JOIN_SPECTATE", { gameId: gameIdParam });
      } else if (userId) {
        socket.emit("JOIN_GAME", {
          gameId: gameIdParam,
          playerId: userId,
          avatarUrl: getUserAvatar(),
        });
        if (gameIdParam) {
          fetch(apiUrl(`/api/game/${gameIdParam}/action-log`), {
            headers: { Authorization: `Bearer ${getAuthItem("token") ?? ""}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { entries: string[]; handId: string | null } | null) => {
              if (data?.entries?.length) {
                const restored = data.entries.map((line, i) => {
                  const [street, name, action, amount] = line.split("|");
                  const amt = Number(amount);
                  const detail =
                    action === "CHECK"
                      ? `${name} check`
                      : action === "FOLD"
                      ? `${name} se couche`
                      : action === "CALL"
                      ? `${name} suit ${amt}`
                      : `${name} relance ${amt}`;
                  return { id: `restored-${i}`, line: `[${street}] ${detail}` };
                });
                setHandActionLog(restored);
              }
            })
            .catch(() => {});
        }
      }
    };
    emitTournamentJoinRef.current = emitJoinRoom;
    socket.on("connect", emitJoinRoom);
    emitJoinRoom();

    return () => {
      if (tournamentTransitionTimerRef.current) {
        clearTimeout(tournamentTransitionTimerRef.current);
        tournamentTransitionTimerRef.current = null;
        tournamentScheduledNavEpochRef.current += 1;
      }
      emitTournamentJoinRef.current = null;
      socket.off("connect", emitJoinRoom);
      socket.off("GAME_UPDATE", onGameUpdateMain);
      socket.off("GAME_STATE_UPDATED", onGameStateUpdated);
      socket.off("HAND_STATE_CHANGED", onHandStateChanged);
      socket.off("GAME_ENDED", onGameEnded);
      socket.off("PRACTICE_SESSION_END", onPracticeSessionEnd);
      socket.off("PLAYER_BUSTED", onPlayerBusted);
      socket.off("CASH_WAITING_PLAYERS", onCashWaiting);
      socket.off("CASH_NEXT_HAND_READY_UPDATED", onNextHandReadyUpdated);
      socket.off("SPECTATOR_QUEUE_STATUS", onQueueStatus);
    };
  }, [
    socket,
    gameIdParam,
    userId,
    isSpectating,
    navigate,
    t,
    isBotMode,
    isExpertPracticeBot,
    postExpertPracticeRecordResult,
    clearMultiBustPromptTimer,
    searchParams,
    fetchBalanceFromServer,
  ]);

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
    if (!gameIdParam || !isBotMode) return;
    setShowOpeningShuffle(true);
    setShuffleCount(0);
    const shuffleInterval = setInterval(() => {
      setShuffleCount((prev) => (prev >= 8 ? prev : prev + 1));
    }, 150);
    const t = setTimeout(() => {
      clearInterval(shuffleInterval);
      setShowOpeningShuffle(false);
    }, 1500);
    return () => {
      clearInterval(shuffleInterval);
      clearTimeout(t);
    };
  }, [gameIdParam, isBotMode]);

  useEffect(() => {
    if (!socket) return;
    socket.on("TURN_TIMER", (data: { gameId: string; timeLeft: number }) => {
      if (phaseRef.current === "showdown") return;
      if (typeof data.timeLeft === "number" && data.timeLeft > turnTimeLimitSecRef.current) {
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
      if (autoTimerActionTimeoutRef.current) {
        clearTimeout(autoTimerActionTimeoutRef.current);
        autoTimerActionTimeoutRef.current = null;
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
      if (autoTimerActionTimeoutRef.current) {
        clearTimeout(autoTimerActionTimeoutRef.current);
        autoTimerActionTimeoutRef.current = null;
      }
      return;
    }

    setTimerActive(true);
    setTimeLeft(gameIdParam ? turnTimeLimitSecRef.current : 30);

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 2) {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
          }
          if (!gameIdParam && !autoTimerActionTimeoutRef.current) {
            autoTimerActionTimeoutRef.current = setTimeout(() => {
              autoTimerActionTimeoutRef.current = null;
              setTimerActive(false);
              if (!hasPlayerActedRef.current) {
                if (callAmount === 0) {
                  handleCheck();
                } else {
                  handleFold();
                }
              }
            }, 1000);
          } else if (gameIdParam) {
            setTimerActive(false);
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
      if (autoTimerActionTimeoutRef.current) {
        clearTimeout(autoTimerActionTimeoutRef.current);
        autoTimerActionTimeoutRef.current = null;
      }
    };
  }, [isMyTurn, gameInitialized, phase, callAmount, hasPlayerActed, gameIdParam]);

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
    const ps = playersStateRef.current;
    if (!isBotMode || gameIdParam || ps.length < 2) return;
    if (phase !== "preflop" && phase !== "flop" && phase !== "turn" && phase !== "river") return;
    const activeIdx = ps.findIndex((p) => p.isActive);
    if (activeIdx === -1) return;
    if (!roundPlayersActed.has(activeIdx)) return;
    const activeInHand = ps.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false));
    if (roundPlayersActed.size >= activeInHand.length) return;
    let nextIdx = (activeIdx + 1) % ps.length;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[nextIdx];
      if (p.isConnected !== false && !(p.hasFolded ?? false) && (p.chips ?? 0) > 0 && !roundPlayersActed.has(nextIdx)) {
        setPlayersState((prev) =>
          prev.map((pl, j) => ({ ...pl, isActive: j === nextIdx }))
        );
        setHasPlayerActed(false);
        hasPlayerActedRef.current = false;
        setIsLoading(false);
        return;
      }
      nextIdx = (nextIdx + 1) % ps.length;
    }
  }, [isBotMode, gameIdParam, phase, roundPlayersActed]);

  /** Bot 100 % local : réattribuer le tour si aucun siège n’est actif alors qu’il reste des joueurs en main. */
  useEffect(() => {
    if (!isBotMode || gameIdParam) return;
    if (phase !== "preflop" && phase !== "flop" && phase !== "turn" && phase !== "river") return;
    const ps = playersStateRef.current;
    if (ps.length < 2) return;
    if (ps.some((p) => p.isActive)) return;
    if (streetTransitionScheduledRef.current === phase || streetTransitionTimeoutRef.current != null) {
      return;
    }
    if (localBetsEqualizedForStreet(ps)) {
      return;
    }
    const eligible = ps.filter(
      (p) => p.isConnected !== false && !(p.hasFolded ?? false) && (p.chips ?? 0) > 0,
    );
    if (eligible.length === 0) return;

    let start = 0;
    const dealerIdx = ps.findIndex((p) => p.isDealer);
    if (phase === "preflop") {
      const bbIdx = ps.findIndex((p) => p.role === "BB");
      start =
        bbIdx >= 0 ? (bbIdx + 1) % ps.length : dealerIdx >= 0 ? (dealerIdx + 3) % ps.length : 0;
    } else {
      start = dealerIdx >= 0 ? (dealerIdx + 1) % ps.length : 0;
    }
    for (let i = 0; i < ps.length; i++) {
      const idx = (start + i) % ps.length;
      const p = ps[idx];
      if (p.isConnected !== false && !(p.hasFolded ?? false) && (p.chips ?? 0) > 0) {
        setPlayersState((prev) => prev.map((pl, j) => ({ ...pl, isActive: j === idx })));
        return;
      }
    }
  }, [isBotMode, gameIdParam, phase, playersState]);

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
    hasPlayerActedRef.current = false;
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
        const g = localHandGenerationRef.current;
        const t = setTimeout(() => {
          if (g !== localHandGenerationRef.current) return;
          setPhase("showdown");
        }, 1500);
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
  }, [roundPlayersActed, phase, gameIdParam, userId, runOutPhase]);

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
    const g = localHandGenerationRef.current;
    const t = setTimeout(() => {
      if (g !== localHandGenerationRef.current) return;
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
      /* Entre deux mains cash, phase « init » (WAITING) : garder la surbrillance des 5 cartes
       * jusqu’à la main suivante (reset au changement de handId). */
      if (!(gameIdParam && !isBotMode && cashWaitingPlayers)) {
        setShowdownWinningHighlightCards([]);
      }
      setPendingShowdownData(null);
      setHandResult(null);
      setHandResultData(null);
      // Ne pas reset la fenêtre inter-main ici :
      // entre les mains, la phase côté UI peut repasser en "init"/"shuffle" tout en attendant le système "ready".
    }
  }, [phase, gameIdParam, isBotMode, cashWaitingPlayers]);

  // Panneau inter-mains : affiché tout de suite ; détail gagnant + tickets après 5s ou « Passer ».
  useEffect(() => {
    if (!cashWaitingPlayers) {
      setShowInterHandPanel(false);
      setHasClickedReadyThisInterHand(false);
      setInterHandResultsVisible(false);
      return;
    }
    setShowInterHandPanel(true);
  }, [cashWaitingPlayers]);

  useEffect(() => {
    if (!cashWaitingPlayers) return;
    setInterHandResultsVisible(false);
    const delayMs = showdownRevealSkipped ? 0 : SHOWDOWN_REVEAL_MS;
    const id = window.setTimeout(() => {
      setInterHandResultsVisible(true);
    }, delayMs);
    return () => window.clearTimeout(id);
  }, [cashWaitingPlayers, SHOWDOWN_REVEAL_MS, showdownRevealSkipped]);

  /** Tournoi inter-mains : tick 1s sur le compte à rebours d'auto-ready, en parallèle de
   * `nextHandReadyDeadline` (deadline absolue serveur). On nettoie dès qu'on sort
   * de l'inter-mains ou que la deadline disparaît (tous prêts / auto-ready). */
  useEffect(() => {
    if (!nextHandReadyDeadline) {
      setNextHandReadySecondsLeft(null);
      return;
    }
    const compute = () => {
      const ms = nextHandReadyDeadline - Date.now();
      setNextHandReadySecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    };
    compute();
    const id = window.setInterval(compute, 500);
    return () => window.clearInterval(id);
  }, [nextHandReadyDeadline]);

  useEffect(() => {
    if (gameIdParam) return;
    if (phase !== "showdown" || showdownResult !== null || handResult !== null || !isBotMode || playersState.length < 2) return;
    if (showdownStartedRef.current) return;
    const activeInHand = playersState.filter((p) => !(p.hasFolded ?? false) && p.cards?.length === 2);
    if (activeInHand.length < 2) return;
    const validCommunity = communityCardsState.filter((c): c is Card => c !== null);
    const fromRef = communityCardsStateRef.current.filter((c): c is Card => c !== null);
    const community = validCommunity.length >= 5 ? validCommunity : fromRef.length >= 5 ? fromRef : validCommunity;
    if (community.length < 5) return;

    const runGen = localHandGenerationRef.current;

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
        if (runGen !== localHandGenerationRef.current) return;
        setPlayersState((prev) => prev.map((p) => (p.id === sole.id ? { ...p, chips: (p.chips ?? 0) + pot } : p)));
        if (sole.id === userId || sole.id === "human") setPlayerChips((prev) => prev + pot);
        const heroSole = playersState.find((p) => p.id === userId || p.id === "human");
        const stackBeforeSole = heroSole?.chips ?? playerChips;
        const humanWonSole = sole.id === userId || sole.id === "human";
        const endSole = humanWonSole ? stackBeforeSole + pot : stackBeforeSole;
        const balSole = endSole - startOfHandChipsRef.current;
        const toAddSole = isBotMode ? (balSole > 0 ? Math.round(balSole * winMultiplier) : balSole) : balSole;
        applyLocalExpertWalletDelta(toAddSole);
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
      if (runGen !== localHandGenerationRef.current) return;
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
        applyLocalExpertWalletDelta(toAddFb);
      }
    };

    const runComplete = async () => {
      try {
        if (runGen !== localHandGenerationRef.current) return;
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
          if (runGen !== localHandGenerationRef.current) return;
          const winnerIds = data.winnerIds ?? (data.winnerId ? [data.winnerId] : []);
          if (winnerIds.length === 0) continue;

          if (pi === 0) {
            mainWinnerId = winnerIds[0];
            mainWinnerName = data.isSplit ? t('game.tie') : (data.winnerName ?? winnerIds[0]);
            mainHandName = data.handName ?? "Haute carte";
            mainIsSplit = data.isSplit === true && winnerIds.length > 1;
            const winner = activeInHand.find((p) => String(p.id) === winnerIds[0]);
            if (winner?.cards) setShowdownWinningHighlightCards(winner.cards);
          }

          const share = Math.floor(sp.amount / winnerIds.length);
          const remainder = sp.amount - share * winnerIds.length;
          winnerIds.forEach((wid, wi) => {
            awards[wid] = (awards[wid] ?? 0) + share + (wi === 0 ? remainder : 0);
          });
        }

        if (runGen !== localHandGenerationRef.current) return;
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
        applyLocalExpertWalletDelta(toAdd);
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
        if (runGen !== localHandGenerationRef.current) return;
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
  }, [
    phase,
    showdownResult,
    handResult,
    isBotMode,
    playersState,
    communityCardsState,
    pot,
    winMultiplier,
    userId,
    gameIdParam,
    playerChips,
    applyLocalExpertWalletDelta,
    t,
  ]);

  showdownResultRef.current = showdownResult;
  useEffect(() => {
    if (gameIdParam) return;
    if (!isBotMode || phase !== "showdown" || showdownResult !== null || handResult !== null) return;
    const armedGen = localHandGenerationRef.current;
    const safety = setTimeout(async () => {
      if (armedGen !== localHandGenerationRef.current) return;
      if (phaseRef.current !== "showdown") return;
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
      if (armedGen !== localHandGenerationRef.current) return;
      if (phaseRef.current !== "showdown") return;
      if (showdownResultRef.current !== null) return;
      setPot(0);
      showdownStartedRef.current = true;
      if (winner) {
        setPlayersState((prev) => prev.map((p) => (p.id === winner.id ? { ...p, chips: (p.chips ?? 0) + currentPot } : p)));
        if (winner.id === userId || winner.id === "human") setPlayerChips((prev) => prev + currentPot);
        setShowdownWinningHighlightCards((winner as BasePlayer | BotPlayer).cards ?? []);
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
      applyLocalExpertWalletDelta(toAddSafety);
    }, 12000);
    return () => clearTimeout(safety);
  }, [
    phase,
    showdownResult,
    handResult,
    isBotMode,
    playersState,
    pot,
    userId,
    winMultiplier,
    gameIdParam,
    playerChips,
    applyLocalExpertWalletDelta,
  ]);

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
    if (!gameOverReason) return;
    if (isBotMode) return;
    const timer = setTimeout(() => { navigate("/lobby"); }, 5000);
    return () => clearTimeout(timer);
  }, [gameOverReason, navigate, isBotMode]);

  useEffect(() => {
    if (!gameIdParam || !isBotMode || gameOverReason) return;
    if (serverHandRuntimePhase !== "HAND_COMPLETE") return;
    const token = getAuthItem("token");
    let cancelled = false;

    const resyncTimer = window.setTimeout(() => {
      if (cancelled || !userId || !token) return;
      void fetch(
        `${apiUrl(`/api/game/${encodeURIComponent(gameIdParam)}`)}?playerId=${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((st) => {
          if (!st || cancelled) return;
          lastAppliedSocketSnapshotSigRef.current = "";
          applySocketGameUpdateRef.current(st as Record<string, unknown>);
        })
        .catch(() => {});
    }, 12000);

    const stuckTimer = window.setTimeout(() => {
      if (cancelled) return;
      setGameOverReason((prev) => prev ?? "practice_stuck");
    }, 26000);

    return () => {
      cancelled = true;
      window.clearTimeout(resyncTimer);
      window.clearTimeout(stuckTimer);
    };
  }, [gameIdParam, isBotMode, serverHandRuntimePhase, gameOverReason, userId]);

  /** Practice réseau : si le tour reste sur un bot trop longtemps, resync HTTP (file bot serveur lente ou socket manqué). */
  const practiceBotTurnWatchId = useMemo(() => {
    if (!gameIdParam || !isBotMode) return "";
    const p = playersState.find((x) => x.isActive);
    return p && String(p.id).startsWith("qb-bot-") ? String(p.id) : "";
  }, [gameIdParam, isBotMode, playersState]);

  useEffect(() => {
    if (!gameIdParam || !isBotMode || !userId || gameOverReason) return;
    if (phase !== "preflop" && phase !== "flop" && phase !== "turn" && phase !== "river") return;
    if (!practiceBotTurnWatchId) return;
    const token = getAuthItem("token");
    if (!token) return;

    const t = window.setTimeout(() => {
      const ap = playersStateRef.current.find((p) => p.isActive);
      if (!ap || String(ap.id) !== practiceBotTurnWatchId) return;
      if (gameOverReasonRef.current) return;
      void fetch(
        `${apiUrl(`/api/game/${encodeURIComponent(gameIdParam)}`)}?playerId=${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((st) => {
          if (!st) return;
          lastAppliedSocketSnapshotSigRef.current = "";
          applySocketGameUpdateRef.current(st as Record<string, unknown>);
        })
        .catch(() => {});
    }, 14000);

    return () => window.clearTimeout(t);
  }, [gameIdParam, isBotMode, userId, practiceBotTurnWatchId, phase, gameOverReason]);

  // Safety net for non-bot multiplayer games: if HAND_COMPLETE lingers, re-join the socket room.
  useEffect(() => {
    if (!gameIdParam || isBotMode || gameOverReason) return;
    if (serverHandRuntimePhase !== "HAND_COMPLETE") return;
    const doRejoin = () => {
      if (!socket || !socket.connected || !userId) return;
      lastAppliedSocketSnapshotSigRef.current = "";
      if (isSpectating) {
        socket.emit("JOIN_SPECTATE", { gameId: gameIdParam });
      } else {
        socket.emit("JOIN_GAME", {
          gameId: gameIdParam,
          playerId: userId,
          avatarUrl: getUserAvatar(),
        });
      }
    };
    const tLate = window.setTimeout(doRejoin, 9000);
    return () => {
      window.clearTimeout(tLate);
    };
  }, [
    gameIdParam,
    isBotMode,
    serverHandRuntimePhase,
    gameOverReason,
    isSpectating,
    socket,
    userId,
  ]);

  /** Tournoi multijoueur : resync HTTP si l’état reste bloqué sur HAND_COMPLETE (évite refresh manuel). */
  useEffect(() => {
    if (!gameIdParam || isBotMode || gameOverReason) return;
    if (!gameIdParam.startsWith(TOURNAMENT_GAME_ID_PREFIX)) return;
    if (serverHandRuntimePhase !== "HAND_COMPLETE") return;
    const token = getAuthItem("token");
    if (!userId || !token || isSpectating) return;
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      void fetch(
        `${apiUrl(`/api/game/${encodeURIComponent(gameIdParam)}`)}?playerId=${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((st) => {
          if (!st || cancelled) return;
          lastAppliedSocketSnapshotSigRef.current = "";
          applySocketGameUpdateRef.current?.(st as Record<string, unknown>);
        })
        .catch(() => {});
    }, 8500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [
    gameIdParam,
    isBotMode,
    serverHandRuntimePhase,
    gameOverReason,
    userId,
    isSpectating,
  ]);

  useEffect(() => {
    if (!gameOverReason) return;
    pendingBotHandSocketStateRef.current = null;
  }, [gameOverReason]);

  /** Fin de manche (bot) : appliquer l’état serveur mis en attente ou relancer localement. */
  const handleHandEndContinue = useCallback(() => {
    localHandGenerationRef.current += 1;
    const pending = pendingBotHandSocketStateRef.current;
    pendingBotHandSocketStateRef.current = null;
    setShowdownResult(null);
    showdownResultRef.current = null;
    setShowTransition(false);
    lastScheduledShowdownTransitionSigRef.current = "";
    setRoundCount((c) => c + 1);
    setHandResultData(null);
    setHandResult(null);
    setIsLoading(false);
    setHasPlayerActed(false);
    hasPlayerActedRef.current = false;
    setIsBotThinking(false);
    botIsFetchingRef.current = false;
    showdownStartedRef.current = false;
    setShowBotHandEndPanel(false);

    const refreshPracticeFromApi = () => {
      if (!gameIdParam || !userId || isSpectating) return;
      void fetch(
        `${apiUrl(`/api/game/${encodeURIComponent(gameIdParam)}`)}?playerId=${encodeURIComponent(userId)}`,
        { headers: { Authorization: `Bearer ${getAuthItem("token") ?? ""}` } },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((st) => {
          if (st) {
            lastAppliedSocketSnapshotSigRef.current = "";
            applySocketGameUpdateRef.current(st as Record<string, unknown>);
          }
        });
    };

    if (gameIdParam && pending) {
      lastAppliedSocketSnapshotSigRef.current = "";
      applySocketGameUpdateRef.current(pending);
      /* Le serveur a pu avancer (bots) pendant le panneau : resync immédiate. */
      window.setTimeout(() => {
        refreshPracticeFromApi();
      }, 0);
      return;
    }
    if (gameIdParam && userId && !isSpectating) {
      lastAppliedSocketSnapshotSigRef.current = "";
      refreshPracticeFromApi();
      return;
    }
    if (!gameIdParam && isBotMode) {
      navigate(`${location.pathname}${location.search}`, { state: { replay: true } });
    }
  }, [gameIdParam, isBotMode, isSpectating, navigate, location.pathname, location.search, userId]);

  const handleHandEndToLobby = useCallback(() => {
    localHandGenerationRef.current += 1;
    pendingBotHandSocketStateRef.current = null;
    setShowdownResult(null);
    showdownResultRef.current = null;
    setShowTransition(false);
    lastScheduledShowdownTransitionSigRef.current = "";
    setIsLoading(false);
    setHasPlayerActed(false);
    hasPlayerActedRef.current = false;
    navigate("/lobby");
  }, [navigate]);

  const handlePracticeBackToLobby = useCallback(() => {
    navigate("/lobby");
  }, [navigate]);
  const handleStaySpectatorAfterBust = useCallback(() => {
    const targetGameId = multiBustGameIdRef.current ?? gameIdParam;
    if (!targetGameId) {
      navigate("/lobby");
      return;
    }
    setShowMultiBustPrompt(false);
    navigate(`/game?gameId=${encodeURIComponent(targetGameId)}&spectate=1`, {
      replace: true,
    });
  }, [navigate, gameIdParam]);
  const handleBackToLobbyAfterBust = useCallback(() => {
    setShowMultiBustPrompt(false);
    navigate("/lobby");
  }, [navigate]);

  const handleCashClosedGoWaitingRoom = useCallback(() => {
    if (!cashGameClosedModal?.roomId) {
      setCashGameClosedModal(null);
      navigate("/lobby", { replace: true, state: { outcome: "lost" as const, reason: "table_closed" } });
      return;
    }
    const { roomId, message } = cashGameClosedModal;
    setCashGameClosedModal(null);
    navigate(`/waiting-room?roomId=${encodeURIComponent(roomId)}`, {
      replace: true,
      state: { outcome: "lost" as const, reason: "table_closed", message },
    });
  }, [cashGameClosedModal, navigate]);

  const handleCashClosedGoLobby = useCallback(() => {
    setCashGameClosedModal(null);
    navigate("/lobby", { replace: true, state: { outcome: "lost" as const, reason: "table_closed" } });
  }, [navigate]);

  /** Bot local (sans gameId) : même flux que RoundTransition — relance la table avec les params d’URL. */
  const handleLocalBotPlayAgain = useCallback(() => {
    navigate(`${location.pathname}${location.search}`, { state: { replay: true } });
  }, [navigate, location.pathname, location.search]);

  const handlePracticePlayAgain = useCallback(async () => {
    const token = getAuthItem("token");
    if (!token) {
      navigate("/lobby");
      return;
    }
    const raw = sessionStorage.getItem("qb_last_practice_bot_config");
    if (!raw) {
      addToast(
        t("game.practiceReplayNoConfig", "Paramètres introuvables — ouvre la configuration des bots."),
        "error",
      );
      navigate("/bot-configuration");
      return;
    }
    let cfg: {
      botCount: number;
      difficulty: string;
      difficultyUi: string;
      botChips: number[];
    };
    try {
      cfg = JSON.parse(raw) as typeof cfg;
    } catch {
      addToast(t("errors.generic", "Erreur serveur"), "error");
      navigate("/bot-configuration");
      return;
    }
    try {
      const res = await fetch(apiUrl("/api/game/bot/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          botCount: cfg.botCount,
          difficulty: cfg.difficulty,
          botChips: cfg.botChips,
          humanChips: getUserBalance(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { gameId?: string; error?: string };
      if (!res.ok) {
        addToast(data.error ?? t("errors.generic", "Erreur serveur"), "error");
        return;
      }
      if (!data.gameId) {
        addToast(t("errors.generic", "Réponse invalide"), "error");
        return;
      }
      navigate(
        `/game?gameId=${encodeURIComponent(data.gameId)}&mode=bot&difficulty=${encodeURIComponent(cfg.difficultyUi)}`,
      );
    } catch (e) {
      console.error(e);
      addToast(t("errors.network", "Erreur réseau"), "error");
    }
  }, [addToast, navigate, t]);

  useEffect(() => {
    if (!isBotMode || gameIdParam || playersState.length === 0) return;
    if (phase === "init" || phase === "shuffle" || phase === "deal") return;
    if (handResult !== null) return;

    const activePlayer = playersState.find((p) => p.isActive);
    if (!activePlayer) return;

    const isBotTurn = "isBot" in activePlayer && activePlayer.isBot;
    if (!isBotTurn || isBotThinking || botIsFetchingRef.current) return;

    const botActionGen = localHandGenerationRef.current;
    setIsBotThinking(true);
    botIsFetchingRef.current = true;

    const fetchBotDecision = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        const url = apiUrl("/api/bot/action");
        const botDifficulty = "isBot" in activePlayer ? activePlayer.difficulty : "medium";
        const expertOracle =
          botDifficulty === "expert"
            ? buildExpertOraclePayload(playersState, activePlayer.id)
            : null;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            playerCards: activePlayer.cards,
            communityCards: communityCardsState.filter((c): c is Card => c !== null),
            difficulty: botDifficulty,
            currentBet: currentBet,
            playerChips: activePlayer.chips,
            callAmount,
            minRaise: effectiveMinRaise,
            potSize: pot,
            position: activePlayer.position,
            playersCount: Math.max(2, countLocalPlayersInHand(playersState)),
            ...(expertOracle ?? {}),
          }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          await response.text();
          addToast(`Erreur bot (${response.status})`, "error");
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
          const chips = activePlayer.chips ?? 0;
          if (callAmount === 0) handleCheck(activePlayer.id);
          else if (chips >= callAmount) handleCall(callAmount, activePlayer.id);
          else if (chips > 0) handleCall(chips, activePlayer.id);
          else handleFold(activePlayer.id);
          return;
        }

        const decision = await response.json() as {
          action?: string;
          amount?: number;
          style?: string;
          reasoning?: string;
        };
        const expertStyle = typeof decision.style === "string" ? decision.style : undefined;
        if (botActionGen !== localHandGenerationRef.current) {
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
          return;
        }
        const botCurrentBet = activePlayer.bet ?? 0;
        const amountFromServer = intChips(decision.amount ?? 0);
        const amountToPut =
          decision.action === "RAISE"
            ? intChips(Math.max(0, amountFromServer - botCurrentBet))
            : decision.action === "CALL"
              ? intChips(Math.min(decision.amount ?? callAmount, activePlayer.chips ?? 0))
              : 0;

        const actionKind: BotTableActionKind =
          decision.action === "FOLD"
            ? "fold"
            : decision.action === "CHECK" || (decision.action === "RAISE" && amountToPut <= 0)
              ? "check"
              : decision.action === "CALL" || (decision.action === "RAISE" && amountToPut <= callAmount)
                ? "call"
                : "raise";
        if (clearBotActionRef.current) clearTimeout(clearBotActionRef.current);
        setLastBotAction({ name: activePlayer.name, kind: actionKind });
        clearBotActionRef.current = setTimeout(() => {
          setLastBotAction(null);
          clearBotActionRef.current = null;
        }, 5000);

        setTimeout(() => {
          if (botActionGen !== localHandGenerationRef.current) return;
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
          if (shouldBotTauntAfterAction(activePlayer.difficulty)) {
            const taunt = pickBotTauntAfterAction({
              difficulty: activePlayer.difficulty,
              action: actionKind,
              style: expertStyle,
              pot,
            });
            pushFadingChatLine(activePlayer.name, taunt.content, taunt.type, {
              generation: botActionGen,
              delayMs: 380 + Math.floor(Math.random() * 520),
            });
          }
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
        }, 3000);
      } catch (error) {
        console.error("Erreur API bot:", error);
        clearTimeout(timeoutId);
        if (botActionGen !== localHandGenerationRef.current) {
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
          return;
        }
        setTimeout(() => {
          if (botActionGen !== localHandGenerationRef.current) return;
          const chips = activePlayer.chips ?? 0;
          if (callAmount === 0) handleCheck(activePlayer.id);
          else if (chips >= callAmount) handleCall(callAmount, activePlayer.id);
          else if (chips > 0) handleCall(chips, activePlayer.id);
          else handleFold(activePlayer.id);
          setIsBotThinking(false);
          botIsFetchingRef.current = false;
        }, 500);
      }
    };

    fetchBotDecision();
  }, [
    isBotMode,
    gameIdParam,
    playersState,
    isBotThinking,
    phase,
    communityCardsState,
    pot,
    callAmount,
    currentBet,
    effectiveMinRaise,
    addToast,
    handResult,
    pushFadingChatLine,
  ]);

  const handleFold = (playerId?: number | string) => {
    if (handResult !== null) return;
    const heroId = playersState.find((p) => p.id === userId || p.id === "human")?.id;
    const isHuman = playerId === undefined || playerId === heroId;
    if (gameIdParam && isHuman && !socket) return;
    if (gameIdParam && socket && isHuman) {
      actionSeqRef.current += 1;
      console.log('[FRONT][ACTION] emit_PLAYER_ACTION', {
  action: 'FOLD',
  gameId: gameIdParam,
  playerId: String(userId),
  handId: handIdRef.current,
  expectedStreet: String(phase).toUpperCase(),
  socketId: socket.id,
  connected: socket.connected,
})
      socket.emit("PLAYER_ACTION", {
        gameId: gameIdParam,
        playerId: String(userId),
        action: "FOLD",
        handId: handIdRef.current,
        expectedStreet: String(phase).toUpperCase(),
        actionId: `act-${Date.now()}-${actionSeqRef.current}`,
      });
      setHasPlayerActed(true);
      hasPlayerActedRef.current = true;
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
      applyLocalExpertWalletDelta(toAdd);
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
      console.log('[FRONT][ACTION] emit_PLAYER_ACTION', {
  action: 'CHECK',
  gameId: gameIdParam,
  playerId: String(userId),
  handId: handIdRef.current,
  expectedStreet: String(phase).toUpperCase(),
  socketId: socket.id,
  connected: socket.connected,
})
      socket.emit("PLAYER_ACTION", {
        gameId: gameIdParam,
        playerId: String(userId),
        action: "CHECK",
        handId: handIdRef.current,
        expectedStreet: String(phase).toUpperCase(),
        actionId: `act-${Date.now()}-${actionSeqRef.current}`,
      });
      setHasPlayerActed(true);
      hasPlayerActedRef.current = true;
      setIsLoading(true);
      return;
    }
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (isHumanActing) {
      setHasPlayerActed(true);
      hasPlayerActedRef.current = true;
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
      console.log('[FRONT][ACTION] emit_PLAYER_ACTION', {
  action: 'CALL',
  amount,
  gameId: gameIdParam,
  playerId: String(userId),
  handId: handIdRef.current,
  expectedStreet: String(phase).toUpperCase(),
  socketId: socket.id,
  connected: socket.connected,
})
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
      hasPlayerActedRef.current = true;
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

      const snapshotAfterCall = playersState.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            chips: Math.max(0, actorChipsBefore - amount),
            bet: botTotalBetAfter,
            isActive: false,
          };
        }
        if ((p.bet ?? 0) > botTotalBetAfter) {
          const refund = (p.bet ?? 0) - botTotalBetAfter;
          return { ...p, chips: p.chips + refund, bet: botTotalBetAfter };
        }
        return p;
      });
      const activeInHandCountAfter = countLocalPlayersInHand(snapshotAfterCall);
      
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
          if (next.size >= activeInHandCountAfter && !isBotAllInCall) {
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
          } else if (next.size < activeInHandCountAfter && !isBotAllInCall) {
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
      hasPlayerActedRef.current = false;
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
      hasPlayerActedRef.current = true;
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
      console.log('[FRONT][ACTION] emit_PLAYER_ACTION', {
  action: 'RAISE',
  amount: raiseAmount,
  gameId: gameIdParam,
  playerId: String(userId),
  handId: handIdRef.current,
  expectedStreet: String(phase).toUpperCase(),
  socketId: socket.id,
  connected: socket.connected,
})
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
      hasPlayerActedRef.current = true;
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
      hasPlayerActedRef.current = true;
      setIsLoading(true);
    }
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (!gameIdParam) {
      if (isBotMode) {
        const actingId = playerId ?? userId ?? "human";
        const actorRow = playersState.find((p) => p.id === actingId);
        const stackBefore = actorRow?.chips ?? 0;
        const betBefore = actorRow?.bet ?? 0;
        const prevHigh = Math.max(0, ...playersState.map((p) => p.bet ?? 0));
        const actualPut =
          playerId !== undefined && playerId !== hero?.id
            ? Math.min(totalToPut, Math.max(0, stackBefore))
            : totalToPut;
        const betAfter = betBefore + actualPut;
        const newHigh = Math.max(prevHigh, betAfter);
        const increment = newHigh - prevHigh;
        const isAllInRaise = stackBefore > 0 && actualPut >= stackBefore;
        const isShortAllIn = isAllInRaise && raiseAmount < localMinRaiseIncrement;
        if (increment > 0 && !isShortAllIn) {
          setLocalMinRaiseIncrement(
            Math.max(BOT_TABLE_DEFAULTS.BIG_BLIND, increment),
          );
        }
      }
      appendLocalHandAction(justActedIndex >= 0 ? playersState[justActedIndex] : undefined, "raise", { amount: raiseAmount });
      nextTurn(justActedIndex);
    }
  };

  handleCheckForBotStuckRef.current = handleCheck;
  handleCallForBotStuckRef.current = handleCall;
  handleFoldForBotStuckRef.current = handleFold;

  useEffect(() => {
    if (!isBotMode || gameIdParam || !isBotThinking) return;
    const stuck = setTimeout(() => {
      if (!botIsFetchingRef.current && !isBotThinking) return;
      console.warn("[QB] Bot stuck detected, forcing action");
      const ps = playersStateRef.current;
      const activePlayer = ps.find((p) => p.isActive && "isBot" in p && p.isBot);
      if (activePlayer) {
        const highestBet = Math.max(0, ...ps.map((p) => p.bet ?? 0));
        const callAmt = intChips(Math.max(0, highestBet - (activePlayer.bet ?? 0)));
        const chips = activePlayer.chips ?? 0;
        if (callAmt === 0) handleCheckForBotStuckRef.current(activePlayer.id);
        else if (chips >= callAmt) handleCallForBotStuckRef.current(callAmt, activePlayer.id);
        else if (chips > 0) handleCallForBotStuckRef.current(chips, activePlayer.id);
        else handleFoldForBotStuckRef.current(activePlayer.id);
      }
      setIsBotThinking(false);
      botIsFetchingRef.current = false;
    }, 15000);
    return () => clearTimeout(stuck);
  }, [isBotThinking, isBotMode, gameIdParam]);

  const handleSendMessage = (content: string, type: "emoji" | "text") => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const outgoing = censorChatLinks(content);
    if (isChatContentEffectivelyEmpty(outgoing)) {
      addToast(t("game.chatLinkBlocked", "Les liens ne sont pas autorisés dans le chat."), "error");
      return;
    }
    const id: number | string = `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const myName = playersState.find((p) => p.id === userId || p.id === "human")?.name ?? "Vous";
    const newMessage: ChatMessage = {
      id,
      player: "Vous",
      content: outgoing,
      type: type,
      timestamp: Date.now(),
      isLeaving: false,
    };

    setChatMessages((prev) => [...prev, newMessage]);

    if (gameIdParam && socket) {
      socket.emit("GAME_CHAT", {
        gameId: gameIdParam,
        playerId: String(userId),
        playerName: myName,
        content: outgoing,
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
  };

  useEffect(() => {
    const currentPath = `/game${window.location.search}`;
    sessionStorage.setItem("currentGame", currentPath);
  }, [searchParams]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col relative">
      {gameIdParam &&
        !isBotMode &&
        showdownResult &&
        !cashShowdownWinnerRevealUnlocked &&
        !gameOverReason && (
          <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[9996] flex max-w-[min(100vw-1rem,420px)] -translate-x-1/2 flex-col items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/95 px-4 py-3 shadow-xl">
            <p className="text-center text-xs text-slate-300">
              {t(
                "game.revealWaitSkippable",
                "Les cartes gagnantes restent surlignées environ 5 s — vous pouvez passer.",
              )}
            </p>
            <button
              type="button"
              onClick={() => setShowdownRevealSkipped(true)}
              className="text-sm font-semibold rounded-lg border border-amber-500/60 bg-amber-500/20 px-4 py-2 text-amber-100 hover:bg-amber-500/30 transition"
            >
              {t("game.skipReveal", "Passer")}
            </button>
          </div>
        )}
      <AnimatePresence>
      {isBotMode && showdownResult && showBotHandEndPanel && !gameOverReason && (
        <motion.div
          key="bot-hand-end"
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="flex flex-col items-center gap-5 text-center p-8 rounded-2xl bg-slate-900/95 border border-amber-500/30 shadow-2xl max-w-md w-full"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", damping: 24, stiffness: 320 }}
          >
            <div className="text-5xl" aria-hidden>
              🃏
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide text-amber-400/90">
              {t("game.handFinished", "Manche terminée")}
            </h2>
            <div className="w-full rounded-xl bg-slate-800/80 border border-slate-600/60 px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-amber-200/80 uppercase tracking-wider">
                {t("game.winnerLabel", "Gagnant")}
              </p>
              <p className="text-2xl font-bold text-yellow-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.2)]">
                {showdownResult.winnerName}
              </p>
              <p className="text-sm text-slate-300">
                {t("game.winningHandLabel", "Combinaison")}:{" "}
                <span className="text-amber-200 font-semibold">{showdownResult.hand}</span>
              </p>
              <p className="text-sm text-slate-200">
                +{(showdownResult.pot ?? 0).toLocaleString()} {t("game.jets", "jetons")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              <button
                type="button"
                onClick={handleHandEndContinue}
                className="rounded-xl px-5 py-3 font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors"
              >
                {t("game.nextRoundButton")}
              </button>
              <button
                type="button"
                onClick={handleHandEndToLobby}
                className="rounded-xl px-5 py-3 font-semibold border border-slate-500 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {t("game.backToLobby", "Lobby")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {gameIdParam &&
          !isBotMode &&
          showdownResult &&
          showCashHandEndOverlay &&
          multiplayerShowdownWinnerSlots.length > 0 && (
            <motion.div
              key="cash-hand-end"
              className="fixed inset-0 z-[9997] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="flex flex-col items-center gap-5 text-center p-8 rounded-2xl bg-slate-900/95 border border-amber-500/30 shadow-2xl max-w-md w-full"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ type: "spring", damping: 24, stiffness: 320 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-5xl" aria-hidden>
                  🃏
                </div>
                <h2 className="text-xl font-bold uppercase tracking-wide text-amber-400/90">
                  {t("game.handFinished", "Manche terminée")}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {multiplayerShowdownWinnerSlots.map((slot) => (
                    <div key={String(slot.id)} className="flex flex-col items-center gap-1">
                      <ImageWithFallback
                        src={slot.avatarUrl}
                        alt=""
                        className="w-20 h-20 rounded-full object-cover ring-2 ring-amber-400/60 shadow-lg"
                      />
                      <span className="text-sm font-semibold text-slate-200 max-w-[140px] truncate">
                        {slot.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-lg sm:text-xl font-bold text-yellow-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.2)] px-2">
                  {showdownResult.isSplit ||
                  (showdownResult.winnerIds && showdownResult.winnerIds.length > 1)
                    ? showdownResult.winnerName
                    : t("game.showdownWinnerIs", {
                        name: multiplayerShowdownWinnerSlots[0]?.name ?? showdownResult.winnerName,
                      })}
                </p>
                <div className="w-full rounded-xl bg-slate-800/80 border border-slate-600/60 px-5 py-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-200/80 uppercase tracking-wider">
                    {t("game.winningHandLabel", "Combinaison")}
                  </p>
                  <p className="text-lg font-semibold text-amber-200">
                    {showdownResult.hand && showdownResult.hand !== "—"
                      ? showdownResult.hand
                      : t("showdown.highCard")}
                  </p>
                  <p className="text-sm text-slate-200">
                    +{(showdownResult.pot ?? 0).toLocaleString()} {t("game.jets", "jetons")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    cashHandWinnerModalDismissedRef.current = true;
                    setShowCashHandEndOverlay(false);
                  }}
                  className="rounded-xl px-6 py-3 font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors w-full sm:w-auto"
                >
                  {t("game.showdownContinue", "Continuer")}
                </button>
              </motion.div>
            </motion.div>
          )}
      </AnimatePresence>

      <AnimatePresence>
      {gameOverReason && (
        <motion.div
          key="bot-game-over"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
        <motion.div
          className="flex flex-col items-center gap-6 text-center p-8 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl max-w-md w-full"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: "spring", damping: 22, stiffness: 320 }}
        >
        {gameOverReason === "bot_eliminated" ? (
          <>
            <Trophy className="h-20 w-20 text-amber-400 drop-shadow-lg" aria-hidden strokeWidth={1.25} />
            <h2 className="text-4xl font-bold text-yellow-400">{t('game.victory')}</h2>
            <p className="text-slate-300">{t('game.allBotsEliminated')}</p>
          </>
        ) : gameOverReason === "human_eliminated" ? (
          <>
            <Skull className="h-20 w-20 text-red-400 drop-shadow-lg" aria-hidden strokeWidth={1.25} />
            <h2 className="text-4xl font-bold text-red-400">{t('game.defeated')}</h2>
            <p className="text-slate-300">{t('game.outOfChips')}</p>
          </>
        ) : (
          <>
            <PauseCircle className="h-20 w-20 text-amber-300/90" aria-hidden strokeWidth={1.25} />
            <h2 className="text-2xl font-bold text-amber-300">
              {t("game.practiceStuckTitle", "Partie interrompue")}
            </h2>
            <p className="text-slate-300 text-sm">
              {t(
                "game.practiceStuckBody",
                "Reviens au lobby ou relance une table avec les mêmes réglages.",
              )}
            </p>
          </>
        )}
        {isBotMode ? (
          <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
            <button
              type="button"
              onClick={() => (gameIdParam ? void handlePracticePlayAgain() : handleLocalBotPlayAgain())}
              className="rounded-xl px-5 py-3 font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors"
            >
              {t("game.playAgainSameSettings", "Rejouer (même config)")}
            </button>
            <button
              type="button"
              onClick={handlePracticeBackToLobby}
              className="rounded-xl px-5 py-3 font-semibold border border-slate-500 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {t("game.backToLobby", "Lobby")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <p className="text-slate-500 text-sm">{t('game.returningToLobby')}</p>
            <button
              type="button"
              onClick={handlePracticeBackToLobby}
              className="rounded-xl px-5 py-3 font-semibold border border-slate-500 text-slate-200 hover:bg-slate-800 transition-colors"
            >
              {t("game.returnToLobby", "Retourner")}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )}
      </AnimatePresence>

      <AnimatePresence>
        {tournamentTableTransition && (
          <motion.div
            key="tournament-table-transition"
            className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/88 backdrop-blur-md px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <motion.div
              className="flex max-w-md flex-col items-center gap-5 rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900/98 to-slate-950/98 p-8 text-center shadow-2xl shadow-violet-950/40 ring-1 ring-violet-500/15"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.99 }}
              transition={{ type: "spring", damping: 24, stiffness: 320 }}
            >
              {tournamentTableTransition.variant === "eliminated" && (
                <>
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-red-500/15 ring-2 ring-red-400/40"
                    aria-hidden
                  >
                    <CircleX className="h-14 w-14 text-red-400" strokeWidth={2.25} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-red-100 sm:text-3xl">
                    {t("tournament.tableTransition.eliminatedTitle")}
                  </h2>
                  <p className="text-sm leading-relaxed text-white/65">
                    {t("tournament.tableTransition.eliminatedSubtitle")}
                  </p>
                  <p className="text-xs text-white/40">{t("tournament.tableTransition.pleaseWait")}</p>
                </>
              )}
              {tournamentTableTransition.variant === "won_waiting" && (
                <>
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/15 ring-2 ring-emerald-400/35"
                    aria-hidden
                  >
                    <Trophy className="h-12 w-12 text-emerald-300" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-emerald-100 sm:text-3xl">
                    {t("tournament.tableTransition.wonTableTitle")}
                  </h2>
                  <p className="text-sm leading-relaxed text-white/70">
                    {t("tournament.tableTransition.wonWaitingSubtitle")}
                  </p>
                  <p className="text-xs text-white/40">{t("tournament.tableTransition.pleaseWait")}</p>
                </>
              )}
              {tournamentTableTransition.variant === "won_next_table" && (
                <>
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-violet-500/15 ring-2 ring-violet-400/35"
                    aria-hidden
                  >
                    <Trophy className="h-12 w-12 text-violet-200" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-violet-100 sm:text-3xl">
                    {t("tournament.tableTransition.wonTableTitle")}
                  </h2>
                  <p className="text-sm leading-relaxed text-white/70">
                    {t("tournament.tableTransition.wonNextRoundSubtitle")}
                  </p>
                  <p className="text-xs text-white/40">{t("tournament.tableTransition.pleaseWait")}</p>
                </>
              )}
              {tournamentTableTransition.variant === "champion" && (
                <>
                  <div
                    className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-500/20 ring-2 ring-amber-300/45"
                    aria-hidden
                  >
                    <Trophy className="h-14 w-14 text-amber-200" strokeWidth={1.35} />
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-amber-100 sm:text-3xl">
                    {t("tournament.tableTransition.championTitle")}
                  </h2>
                  <p className="text-sm leading-relaxed text-white/70">
                    {t("tournament.tableTransition.championSubtitle")}
                  </p>
                  <p className="text-xs text-white/40">{t("tournament.tableTransition.pleaseWait")}</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMultiBustPrompt && !isBotMode && !isSpectating && (
          <motion.div
            key="multi-bust-prompt"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="flex flex-col items-center gap-5 text-center p-8 rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl max-w-md w-full"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
            >
              <Banknote className="h-20 w-20 text-rose-300 drop-shadow-lg" aria-hidden strokeWidth={1.25} />
              <h2 className="text-3xl font-bold text-rose-300">
                {t("game.defeated", "Defaite")}
              </h2>
              <p className="text-slate-200">
                {t(
                  "game.outOfChipsMultiPrompt",
                  "Vous n'avez plus de jetons sur cette table. Voulez-vous rester spectateur ou retourner au lobby ?",
                )}
              </p>
              <div className="flex w-full flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleStaySpectatorAfterBust}
                  className="flex-1 rounded-xl px-5 py-3 font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-colors"
                >
                  {t("game.staySpectator", "Rester spectateur")}
                </button>
                <button
                  type="button"
                  onClick={handleBackToLobbyAfterBust}
                  className="flex-1 rounded-xl px-5 py-3 font-semibold border border-slate-500 text-slate-200 hover:bg-slate-800 transition-colors"
                >
                  {t("game.backToLobby", "Lobby")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {cashGameClosedModal && !isBotMode && (
          <motion.div
            key="cash-game-closed"
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <motion.div
              className="flex max-w-md w-full flex-col items-center gap-5 rounded-2xl border border-slate-600 bg-slate-900/95 p-8 text-center shadow-2xl"
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
            >
              <h2 className="text-2xl font-bold text-rose-200">{t("game.tableClosedTitle")}</h2>
              <p className="text-slate-200">{cashGameClosedModal.message}</p>
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleCashClosedGoWaitingRoom}
                  className="flex-1 rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500"
                >
                  {t("game.backToWaitingRoom")}
                </button>
                <button
                  type="button"
                  onClick={handleCashClosedGoLobby}
                  className="flex-1 rounded-xl border border-slate-500 px-5 py-3 font-semibold text-slate-200 transition hover:bg-slate-800"
                >
                  {t("game.backToLobby")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
        {(phase === "shuffle" || showOpeningShuffle) && (
          <DeckShuffleOverlay key="deck-shuffle" shuffleCount={shuffleCount} title={t("startScreen.shuffling")} />
        )}
      </AnimatePresence>

      {isBotThinking && mode === "bot" && !gameIdParam && (
        <div
          className={`fixed z-50 ${
            isMobile
              ? "bottom-[320px] left-1/2 -translate-x-1/2"
              : isTablet
                ? "left-4 top-24"
                : "left-10 top-28"
          }`}
        >
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
        {showTransition && !isBotMode && !(gameIdParam && !isBotMode && cashWaitingPlayers) && (
          <RoundTransition 
            roundNumber={roundCount} 
            winner={lastWinnerData} 
            onComplete={() => {
              setShowTransition(false);
              setRoundCount((prev) => prev + 1);
              setHandResultData(null);
              setShowdownResult(null);
              lastScheduledShowdownTransitionSigRef.current = "";
              // Partie réseau : la phase vient du serveur (souvent déjà PREFLOP) — ne pas forcer « init ».
              if (!gameIdParam) {
                setPhase("init");
              }
              if (isBotMode && !gameIdParam) {
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

      <div ref={tourRefHeader} className="pointer-events-none fixed left-4 top-4 h-11 w-28 opacity-0" aria-hidden />

      {showAddMoney && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeAddMoney}>
          <div
            className="max-h-[min(90vh,40rem)] overflow-y-auto bg-slate-800 border border-yellow-500/50 rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
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
                  <div className="space-y-3">
                    <FakeCardTopUpFields
                      compact
                      addMoneyAmount={addMoneyAmount}
                      promoCode={promoCode}
                      setPromoCode={(code) => {
                        setPromoCode(code);
                        void validatePaymentPromo(code);
                      }}
                      promoDiscount={promoDiscount}
                      promoFreeCheckout={freeCheckoutPromo}
                      isPromoValidating={promoValidating}
                      cardName={cardName}
                      setCardName={setCardName}
                      cardDigits={cardDigits}
                      setCardDigits={setCardDigits}
                      cardExpiry={cardExpiry}
                      setCardExpiry={setCardExpiry}
                      cardCvv={cardCvv}
                      setCardCvv={setCardCvv}
                    />
                    <button
                      type="button"
                      onClick={() => void submitAddMoney()}
                      disabled={!canSubmitTopUpGame}
                      className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold transition"
                    >
                      {t("lobby.confirmTopUp")}
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
                  {showdownResult && cashShowdownWinnerRevealUnlocked && (
                  <div className="mt-2">
                    <div className="text-sm text-amber-200 font-semibold">{t("game.winnerLabel", "Gagnant")}</div>
                    {multiplayerShowdownWinnerSlots.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-2 my-2">
                        {multiplayerShowdownWinnerSlots.map((slot) => (
                          <ImageWithFallback
                            key={String(slot.id)}
                            src={slot.avatarUrl}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/50"
                          />
                        ))}
                      </div>
                    )}
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
                  {!interHandResultsVisible && cashShowdownWinnerRevealUnlocked && (
                    <div className="mt-3 flex flex-col items-center gap-2">
                      <p className="text-slate-400 text-xs">
                        {t(
                          "game.revealWaitSkippable",
                          "Les cartes restent visibles environ 5 s — vous pouvez passer.",
                        )}
                      </p>
                      <button
                        type="button"
                        onClick={() => setShowdownRevealSkipped(true)}
                        className="text-sm font-semibold px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white border border-slate-500/80 transition"
                      >
                        {t("game.skipReveal", "Passer")}
                      </button>
                    </div>
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
                    <span className="flex items-center gap-2">
                      {nextHandReadySecondsLeft != null && !allNextHandReady ? (
                        <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-200 tabular-nums">
                          {t("game.nextHandAutoReadyIn", "Élimination AFK dans {{seconds}}s", { seconds: nextHandReadySecondsLeft })}
                        </span>
                      ) : null}
                      <span>
                        {allNextHandReady
                          ? t("game.allReady", "Tout le monde est prêt")
                          : t("game.waiting", "En attente…")}
                      </span>
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
                                ? t("game.ready", "Prêt")
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
              <button
                type="button"
                onClick={() => socket?.emit("CASH_LEAVE", { gameId: gameIdParam })}
                className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
              >
                {t("game.cashStandUp")}
              </button>
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

      <div className={isMobile ? "relative flex-1 flex flex-col" : "pointer-events-none fixed inset-0 z-0"}>
         {/* TABLE */}
        <div
        ref={tourRefTable}
        className={`flex items-center justify-center relative ${isMobile ? 'flex-1 px-4 pt-0 pb-[9rem] w-full -mt-14 -translate-y-4' : 'pointer-events-auto h-full w-full px-6 pt-0 -translate-y-20'}`}
        >
        <PokerTable
        players={tablePlayers}
        layoutSeatCount={layoutSeatCount}
        highlightCardKeys={winningCardsHighlightActive ? showdownHighlightKeys : undefined}
        communitySafeZone={230}
        phase={phase}
        burnedCardsCount={displayBurnedCardsCount}
        colorblindMode={colorblindMode}
        heroSeatId={heroPlayer?.id ?? null}
        heroTimerActive={isRoundInteractable && handResult === null && isMyTurn && !hasFoldedFromState && !hasPlayerActed && !isLoading}
        heroTimerTimeLeft={timeLeft}
        heroTimerDuration={gameIdParam ? turnTimeLimitSecRef.current : 30}
        enableAvatarInteractions={Boolean(!isBotMode && gameIdParam && userId)}
        onOpponentAvatarClick={(p) =>
          setPlayerMenuTarget({ id: String(p.id), name: p.name })
        }
        hideHeroChipStack
        >
        <CommunityCards
        cards={communityCards}
        pot={pot}
        sidePots={sidePots.length > 1 ? sidePots : undefined}
        colorblindMode={colorblindMode}
        potRef={tourRefPot}
        boardRef={tourRefBoard}
        highlightCardKeys={winningCardsHighlightActive ? showdownHighlightKeys : undefined}
        />
        </PokerTable>
        </div>
     </div>

      <HandActionLogPanel entries={handActionLog} collapseWhen={isQuantumOpen} />
      <QuantumHUD
        isOpen={isQuantumOpen}
        onToggle={closeQuantumPanel}
        onPanelPointerEnter={onQuantumPanelEnter}
        onPanelPointerLeave={onQuantumPanelLeave}
        onDragSessionChange={(active) => {
          quantumDragSessionRef.current = active;
          if (active) clearQuantumLeaveTimer();
        }}
      />
      <HiddenBetsPanel
      isOpen={isPanelOpen && !isBotMode && hiddenBetsUiEnabled}
      onToggle={handleToggleBluff}
      players={activePlayers}
      gameId={gameIdParam}
      hiddenBetNextHandId={hiddenBetNextHandId}
      hiddenBetWindowOpen={hiddenBetWindowOpen}
      hiddenBetState={hiddenBetState}
      tablePhase={phase}
      betweenHands={Boolean(gameIdParam && !isBotMode && hiddenBetsBetweenHands)}
      interHandShowdownSummary={
        gameIdParam && !isBotMode && cashWaitingPlayers && showdownResult
          ? {
              winnerName: showdownResult.winnerName,
              winningHand: showdownResult.hand,
              pot: showdownResult.pot,
            }
          : null
      }
      />
      <PokerChat isOpen={isChatOpen} onToggle={() => setIsChatOpen(!isChatOpen)} onSendMessage={handleSendMessage} />
      <MessageFeed messages={chatMessages} />
      {userId ? (
        <PlayerGameMenuModal
          open={playerMenuTarget != null}
          onClose={() => setPlayerMenuTarget(null)}
          player={playerMenuTarget}
          gameId={gameIdParam}
          currentUserId={userId}
        />
      ) : null}

      {isSpectating && gameIdParam && !isBotMode && cashSeats.length > 0 && (
        <div ref={tourRefActions} className="fixed bottom-6 left-1/2 z-30 flex min-h-[48px] min-w-[200px] -translate-x-1/2 flex-wrap items-center justify-center gap-2">
          {userId ? (
            <button
              type="button"
              onClick={() => {
                if (hiddenBetsUiEnabled) setIsPanelOpen((o) => !o);
              }}
              disabled={!hiddenBetsUiEnabled}
              title={
                !hiddenBetsUiEnabled ? t("game.hiddenBetsUnavailablePreflop") : undefined
              }
              className={`px-5 py-2.5 rounded-xl border-2 border-violet-500/80 bg-violet-950/90 font-semibold text-sm text-violet-100 shadow-lg transition-all hover:bg-violet-900/90 ${isPanelOpen ? "ring-2 ring-violet-400" : ""} ${!hiddenBetsUiEnabled ? "cursor-not-allowed opacity-45" : ""}`}
            >
              {t("hiddenBets.title")}
            </button>
          ) : null}
          {!gameIdParam?.startsWith(TOURNAMENT_GAME_ID_PREFIX) ? (
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
          ) : null}
        </div>
      )}

      {showPlayerActionBar && (
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
          minRaise={effectiveMinRaise}
          maxRaise={Math.max(0, displayedHeroChips - callAmount)}
          raisePresetStep={isBotMode && !gameIdParam ? BOT_TABLE_DEFAULTS.BIG_BLIND : tableBigBlind}
          isMyTurn={isRoundInteractable && handResult === null && isMyTurn}
          isLoading={isLoading}
          hasFolded={hasFoldedFromState}
          hasActed={hasPlayerActed}
          actionsDisabled={!isRoundInteractable || Boolean(gameIdParam && !socket)}
          waitingForPlayer={isRoundInteractable && !isMyTurn && !hasFoldedFromState ? (activePlayer?.name === "Vous" || activePlayer?.name === "you" ? t('game.you') : activePlayer?.name) : undefined}
          timeLeft={timeLeft ?? 30}
          onToggleQuantum={onQuantumToggleClick}
          onQuantumHoverEnter={onQuantumProbasEnter}
          onQuantumHoverLeave={onQuantumProbasLeave}
          onToggleHiddenBets={() => {
            if (!isBotMode && hiddenBetsUiEnabled) setIsPanelOpen(!isPanelOpen);
          }}
          hiddenBetsDisabled={isBotMode || !hiddenBetsUiEnabled}
          hiddenBetsDisabledTitle={
            !isBotMode && !hiddenBetsUiEnabled ? t("game.hiddenBetsUnavailablePreflop") : undefined
          }
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

      {gameMenuSlot &&
        createPortal(
          <div className="relative" ref={menuContainerRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_rgba(0,0,0,0.28)] backdrop-blur-md transition hover:border-cyan-200/30 hover:bg-slate-800/80"
              title={t("game.menuTitle")}
              aria-label={t("game.menuTitle")}
              aria-expanded={showMenu}
              aria-haspopup="true"
            >
              <Menu className="h-6 w-6" />
            </button>
            {showMenu && (
              <div
                className="absolute end-0 top-full z-[260] mt-2 min-w-[min(92vw,280px)] overflow-hidden rounded-2xl border border-slate-600/80 bg-slate-900/98 py-1 shadow-2xl backdrop-blur-md sm:min-w-[280px]"
                role="menu"
              >
                <p className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t("game.menuSectionGame")}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={startGameTour}
                  className="flex w-full items-start gap-3 border-b border-slate-700/70 px-4 py-3 text-left text-cyan-300 transition-all hover:bg-cyan-500/15"
                >
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-white">{t("game.menuGuidedTour")}</span>
                    <span className="text-xs font-normal leading-snug text-slate-400">{t("game.menuGuidedTourHint")}</span>
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
                  className={`flex w-full items-center gap-3 px-4 py-3 transition-all ${isQuantumOpen ? "bg-amber-500/15 text-amber-400" : "text-white hover:bg-slate-700/80"}`}
                >
                  <Activity className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">{t("game.menuQuantum")}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  aria-disabled={isBotMode || !hiddenBetsUiEnabled}
                  title={
                    isBotMode
                      ? t("game.hiddenBetsUnavailableBotMode")
                      : !hiddenBetsUiEnabled
                        ? t("game.hiddenBetsUnavailablePreflop")
                        : undefined
                  }
                  onClick={() => {
                    if (isBotMode || !hiddenBetsUiEnabled) return;
                    setIsPanelOpen((o) => !o);
                    setShowMenu(false);
                  }}
                  className={`flex w-full items-center gap-3 px-4 py-3 transition-all ${
                    isBotMode || !hiddenBetsUiEnabled
                      ? "cursor-not-allowed opacity-45 text-slate-500"
                      : isPanelOpen
                        ? "bg-yellow-500/15 text-yellow-400"
                        : "text-white hover:bg-slate-700/80"
                  }`}
                >
                  <Trophy className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">{t("hiddenBets.title")}</span>
                </button>

                <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t("game.menuSectionSession", "Session")}
                </p>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowQuitConfirm(true);
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-red-400 transition-all hover:bg-red-950/40"
                >
                  <DoorOpen className="h-5 w-5 shrink-0" />
                  <span className="text-sm font-semibold">{t("nav.quitGame")}</span>
                </button>
              </div>
            )}
          </div>,
          gameMenuSlot
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
