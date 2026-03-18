import { useState, useEffect, useRef, useMemo } from "react";
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
import { AccessibilityMenu } from "../components/AccessibilityMenu";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useSocket } from "../contexts/SocketContext";
import { useToast } from "../contexts/ToastContext";
import { User, Users, Menu, Loader2, Eye, Plus, MessageCircle, X, LogOut, Palette, Bell, HelpCircle, Sparkles, Trophy, Frown, Activity } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { QuantumBluffLogo } from "../assets/logo";
import { useDeviceType } from "../components/ui/use-mobile";
import { ShowdownDisplay } from "../components/ShowdownDisplay";
import { ChipIcon } from "../components/ChipIcon";
import { PokerCard } from "../components/PokerCard";
import { useUser } from "../hooks/useUser";
import { addToUserBalance, getUserBalance, syncBalanceToServer } from "../utils/userProfile";

import type { ClientCard } from "../utils/cards";
import { normalizeServerCard } from "../utils/cards";

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
}

interface BotPlayer extends BasePlayer {
  isBot: true;
  difficulty: "easy" | "medium" | "hard";
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
  /** Multiplicateur de gain sur le solde : bot facile 0.3, moyen 0.6, difficile 0.9, expert 1 ; vs humain 1 */
  const difficultyParam = searchParams.get("difficulty") || "moyen";
  const winMultiplier = gameIdParam
    ? 1
    : difficultyParam === "facile"
      ? 0.3
      : difficultyParam === "moyen"
        ? 0.6
        : difficultyParam === "difficile"
          ? 0.9
          : 1;

  const { socket } = useSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isQuantumOpen, setIsQuantumOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [_hasFolded, _setHasFolded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pot, setPot] = useState(150);
  const [playerChips, setPlayerChips] = useState(() =>
    searchParams.get("mode") === "bot" ? getUserBalance() : 5000
  );
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hasPlayerActed, setHasPlayerActed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playersState, setPlayersState] = useState<(BasePlayer | BotPlayer)[]>([]);
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showGameHelp, setShowGameHelp] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | null>(null);
  const [devValidation, setDevValidation] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [_timerActive, setTimerActive] = useState(false);
  /** Mise maximale actuelle (pour l'API bot) = max des bets des joueurs */
  const currentBet = useMemo(() => Math.max(0, ...playersState.map((p) => p.bet ?? 0)), [playersState]);
  
  // Nouveaux états pour les animations de cartes
  const [phase, setPhase] = useState<GamePhase>("init");
  const [communityCardsState, setCommunityCardsState] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [burnedCardsCount, setBurnedCardsCount] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [, _setDealingCard] = useState<number | null>(null);
  const [roundPlayersActed, setRoundPlayersActed] = useState<Set<number>>(new Set());
  const [gameInitialized, setGameInitialized] = useState(false);
  const [handResult, setHandResult] = useState<"win" | "loss" | null>(null);
  const [handResultData, setHandResultData] = useState<{ winnerName: string; handName: string } | null>(null);
  /** Un joueur éliminé (0 jetons) : partie terminée (scénario 2.1) */
  const [gameOverReason, setGameOverReason] = useState<"human_eliminated" | "bot_eliminated" | null>(null);
  const [showdownResult, setShowdownResult] = useState<{
    winnerId: string;
    winnerIds?: string[];
    winnerName: string;
    hand: string;
    handRank: number;
    pot: number;
    isSplit?: boolean;
  } | null>(null);
  const [lastBotAction, setLastBotAction] = useState<{ name: string; action: string } | null>(null);
  /** Après un all-in suivi : run-out du board sans nouveau tour de mise (preflop -> flop -> turn -> river -> showdown) */
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
  /** Évite d'annuler le setTimeout(dealFlop/dealTurn/…) quand l'effet re-run après que le bot agit */
  const streetTransitionScheduledRef = useRef<string | null>(null);
  const streetTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doStreetTransitionRef = useRef<(() => void) | null>(null);
  /** Timestamp d'entrée dans la street actuelle (flop/turn/river) pour détecter les blocages en mode bot */
  const streetPhaseEnteredRef = useRef<number>(0);
  /** Mode bot : les deux ont agi (preflop égalisé), ne pas redonner la main au joueur */
  const bothActedNoTurnRef = useRef(false);
  const toAddLastRef = useRef(0);
  const botIsFetchingRef = useRef(false);
  const [showdownReveal, setShowdownReveal] = useState(false);
  const showdownStartedRef = useRef(false);
  const showdownResultRef = useRef<typeof showdownResult>(null);
  showdownResultRef.current = showdownResult;
  const [showdownWinnerCards, setShowdownWinnerCards] = useState<Card[]>([]);
  /** Multiplayer: données du showdown en attente (révélation 3s avant d'afficher le modal) */
  const [pendingShowdownData, setPendingShowdownData] = useState<{
    winnerId: string;
    winnerIds?: string[];
    winnerName: string;
    hand: string;
    pot: number;
    winnerCards: Card[];
    isSplit?: boolean;
  } | null>(null);
  /** Track total chips contributed per player across all streets (for side pot calculation) */
  const handContributionsRef = useRef<Record<string, number>>({});
  const [sidePots, setSidePots] = useState<{ amount: number; eligibleIds: string[] }[]>([]);
  /** Multi: host peut relancer avec les mêmes membres */
  const [isRematchHost, setIsRematchHost] = useState(false);
  const [rematchLoading, setRematchLoading] = useState(false);
  /** Cash game: countdown entre les mains (timestamp de fin) */
  const [cashCountdownEndsAt, setCashCountdownEndsAt] = useState<number | null>(null);
  /** Cash game: sièges de la table */
  const [cashSeats, setCashSeats] = useState<{ seatIndex: number; userId: string | null; username: string | null; chips: number }[]>([]);
  /** Cash game: en attente de joueurs (< 2) */
  const [cashWaitingPlayers, setCashWaitingPlayers] = useState(false);
  /** Spectateur : inscrit pour rejoindre à la prochaine manche */
  const [spectatorWantsToRejoin, setSpectatorWantsToRejoin] = useState(false);
  /** Skip la révélation du showdown : appelle cette ref pour passer au résultat */
  const showdownSkipRef = useRef<(() => void) | null>(null);
  /** Multi: timeouts pour l'animation du flop carte par carte */
  const flopAnimateTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Multi: évite de rejouer l'animation flop à chaque GAME_UPDATE (changement de tour) */
  const flopAnimatedRef = useRef(false);

  // Hook d'accessibilité
  const { highContrast, toggleHighContrast, visualAlerts, toggleVisualAlerts, colorblindMode, toggleColorblindMode } = useAccessibility();
  const { addToast } = useToast();

  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  const SB = 50;
  const BB = 100;
  const BOT_START_CHIPS = 1000;

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

  const submitAddMoney = () => {
    if (addMoneyAmount == null || addMoneyAmount <= 0) return;
    if (devValidation.trim().toLowerCase() !== "dev") return;
    const newBalance = addToUserBalance(addMoneyAmount);
    if (mode === "bot") setPlayerChips(newBalance);
    syncBalanceToServer().catch(() => {});
    setAddSuccess(true);
    setTimeout(() => closeAddMoney(), 800);
  };

  const getPlayers = (): (BasePlayer | BotPlayer)[] => {
    const count = parseInt(searchParams.get("bots") || "1", 10);
    const diff = searchParams.get("difficulty") || "moyen";
    const diffMap: "easy" | "medium" | "hard" =
      diff === "facile" ? "easy" : diff === "difficile" || diff === "expert" ? "hard" : "medium";
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
          isActive: true,
          isDealer: true,
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
        chips: playerChips - BB,
        bet: BB,
        position: count,
        isActive: false,
        isDealer: false,
        cards: [],
        isConnected: true,
        hasFolded: false,
        role: "PLAYER",
      });

      // Heads-up: index 0 = Dealer/SB, index 1 = BB
      if (totalPlayers === 2) {
        allPlayers[0].role = "SB";
        allPlayers[0].bet = SB;
        allPlayers[0].chips -= SB;
        allPlayers[1].role = "BB";
        allPlayers[1].bet = BB;
        allPlayers[1].chips -= BB;
      } else {
        // 3+: index 0 = Dealer, index 1 = SB, index 2 = BB
        allPlayers[1].role = "SB";
        allPlayers[1].bet = SB;
        allPlayers[1].chips -= SB;
        allPlayers[2].role = "BB";
        allPlayers[2].bet = BB;
        allPlayers[2].chips -= BB;
      }

      // Preflop first-to-act: player after BB
      const bbIdx = allPlayers.findIndex((p) => p.role === "BB");
      const firstToAct = (bbIdx + 1) % totalPlayers;
      allPlayers[firstToAct].isActive = true;

      return allPlayers;
    }
    return [];
  };

  // Déclarations dérivées AVANT les useEffect qui les utilisent (évite "Cannot access before initialization")
  const activePlayers = playersState.length > 0 ? playersState : getPlayers();
  const activePlayer = activePlayers.find((p) => p.isActive);
  const callAmount = useMemo(() => {
    if (!activePlayer) return 0;
    const highestBet = Math.max(...activePlayers.map((p) => p.bet ?? 0), 0);
    return Math.max(0, highestBet - (activePlayer.bet ?? 0));
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
  const heroDisplayName = heroPlayer?.name ?? "Vous";
  const hasFoldedFromState = heroPlayer?.hasFolded ?? false;

  playersStateRef.current = activePlayers;

  const heroCards = tablePlayers.find((p) => isHero(p))?.cards || [];
  const communityCards = communityCardsState;

  /** En multijoueur : vient du serveur. En mode bot : dérivé de la phase (1 avant flop, 2 avant turn, 3 avant river). */
  const displayBurnedCardsCount = gameIdParam
    ? burnedCardsCount
    : (phase === "flop" ? 1 : phase === "turn" ? 2 : phase === "river" || phase === "showdown" ? 3 : 0);

  // Générer un jeu de cartes complet
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

  // Distribution des cartes aux joueurs (utilise le deck et les joueurs passés en argument)
  const dealCardsToPlayers = (currentDeck: Card[], currentPlayers: (BasePlayer | BotPlayer)[]) => {
    const newDeck = [...currentDeck];
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
        setDeck([...newDeck]);
      }
      cardIndex++;
    }, 250);
  };

  /** Track contribution: add amount to a player's hand total */
  const addContribution = (playerId: string | number, amount: number) => {
    const key = String(playerId);
    handContributionsRef.current[key] = (handContributionsRef.current[key] ?? 0) + amount;
  };

  const resetBetsAndSetFirstToAct = (startIndex: number) => {
    setRoundPlayersActed(new Set());
    setPlayersState((prev) => {
      if (prev.length === 0) return prev;
      let firstIdx = startIndex % prev.length;
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

  // Postflop: heads-up → dealer (index 0) first; multi-player → SB (index 1) first
  const getPostflopFirstAct = () => (playersState.length === 2 ? 0 : 1);

  // Distribution du flop (3 cartes)
  // runOutOnly = true : après un all-in, on distribue les cartes sans donner la main à personne
  const dealFlop = (runOutOnly?: boolean) => {
    setPhase("flop");
      if (!runOutOnly) resetBetsAndSetFirstToAct(0);
    const newDeck = [...deck];
    const newCommunityCards = [...communityCardsState];
    newDeck.shift();
    for (let i = 0; i < 3; i++) {
      const card = newDeck.shift();
      if (card) {
        setTimeout(() => {
          newCommunityCards[i] = card;
          setCommunityCardsState([...newCommunityCards]);
        }, i * 800);
      }
    }
    setDeck([...newDeck]);
  };

  const dealTurn = (runOutOnly?: boolean) => {
    setPhase("turn");
      if (!runOutOnly) resetBetsAndSetFirstToAct(0);
    const newDeck = [...deck];
    const newCommunityCards = [...communityCardsState];
    newDeck.shift();
    const card = newDeck.shift();
    if (card) {
      newCommunityCards[3] = card;
      setCommunityCardsState([...newCommunityCards]);
    }
    setDeck([...newDeck]);
  };

  const dealRiver = (runOutOnly?: boolean) => {
    setPhase("river");
    if (!runOutOnly) resetBetsAndSetFirstToAct(getPostflopFirstAct());
    const newDeck = [...deck];
    const newCommunityCards = [...communityCardsState];
    newDeck.shift();
    const card = newDeck.shift();
    if (card) {
      newCommunityCards[4] = card;
      setCommunityCardsState([...newCommunityCards]);
    }
    setDeck([...newDeck]);
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
    // Mode bot : différer d'un frame pour éviter blocage config → jeu (React doit finir le mount)
    if (mode === "bot" && !gameIdParam) {
      const id = requestAnimationFrame(() => {
        runInit();
      });
      return () => cancelAnimationFrame(id);
    }
    runInit();
  }, [mode, gameIdParam]);

  // Rejouer avec la même configuration (bouton overlay, mode bot uniquement)
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
    setBurnedCardsCount(0);
    hasSetStartOfHandThisHandRef.current = false;
    streetTransitionScheduledRef.current = null;
    if (streetTransitionTimeoutRef.current) {
      clearTimeout(streetTransitionTimeoutRef.current);
      streetTransitionTimeoutRef.current = null;
    }
    navigate(location.pathname + location.search, { replace: true, state: {} });
  }, [location.state, isBotMode]);

  // Multijoueur : récupérer l'état du jeu depuis le backend (évite race localStorage + cartes / phase / pot)
  // Spectateurs : pas de fetch HTTP, l'état vient du socket JOIN_SPECTATE
  useEffect(() => {
    if (!gameIdParam || isSpectating || !userId) return;
    const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '/vmProjetIntegrateurgrp10-0';
    const url = `${baseUrl}/api/game/${encodeURIComponent(gameIdParam)}?playerId=${encodeURIComponent(userId)}`;
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
      .then((gameState: { players?: { id: string; name: string; chips: number; currentBet?: number; position?: number; isActive?: boolean; isDealer?: boolean; isConnected?: boolean; cards?: { suit: string; value: string }[] }[]; pot?: number; phase?: string; communityCards?: (Card | null)[]; currentTurn?: string } | null) => {
        if (cancelled || !gameState) return;
        if (gameStateFromSocketRef.current) return;
        const players = gameState.players ?? [];
        const phaseMap: Record<string, GamePhase> = {
          WAITING: "init",
          PREFLOP: "preflop",
          FLOP: "flop",
          TURN: "turn",
          RIVER: "river",
          SHOWDOWN: "showdown",
        };
        const mapped = players.map((p, index) => ({
          id: String(p.id),
          name: p.name,
          chips: p.chips ?? 1000,
          bet: p.currentBet ?? 0,
          position: p.position ?? index,
          isActive: p.id === gameState.currentTurn,
          isDealer: p.isDealer ?? false,
          cards: Array.isArray(p.cards) ? p.cards.map((c) => normalizeServerCard(c)).filter((c): c is Card => c !== null) : [],
          isConnected: p.isConnected !== false,
          hasFolded: false,
          isBot: false,
        }));
        setPlayersState(mapped);
        setPot(gameState.pot ?? 0);
        const humanChips = players.find((p) => String(p.id) === String(userId))?.chips;
        if (humanChips != null) {
          setPlayerChips(humanChips);
        }
        const phase = gameState.phase != null ? (phaseMap[gameState.phase] ?? gameState.phase.toLowerCase?.() ?? "preflop") : "preflop";
        setPhase(phase as GamePhase);
        setBurnedCardsCount((gameState as { burnedCardsCount?: number }).burnedCardsCount ?? 0);
      const cc = gameState.communityCards;
      if (Array.isArray(cc)) {
        const arr: (Card | null)[] = [null, null, null, null, null];
        cc.forEach((c, i) => { if (i < 5 && c && typeof c === "object") arr[i] = normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]); });
        // Flop carte par carte en multijoueur (comme en mode bot)
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

  // Rejoindre la room socket pour recevoir GAME_UPDATE, TURN_TIMER, GAME_CHAT
  useEffect(() => {
    if (!socket || !gameIdParam) return;
    if (isSpectating) {
      socket.emit("JOIN_SPECTATE", { gameId: gameIdParam });
    } else {
      if (!userId) return;
      socket.emit("JOIN_GAME", { gameId: gameIdParam, playerId: userId });
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
        // Si le serveur refuse l'action (ex: pas assez de jetons, pas votre tour)
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

  // Appliquer les mises à jour d'état envoyées par le serveur (après une action)
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
    const onGameUpdate = (gameState: { players?: { id: string; name: string; chips: number; currentBet?: number; position?: number; isActive?: boolean; isDealer?: boolean; isConnected?: boolean; cards?: { suit: string; value: string }[] }[]; pot?: number; phase?: string; communityCards?: (Card | null)[]; currentTurn?: string; showdownWinnerId?: string; showdownWinnerIds?: string[]; showdownIsSplit?: boolean; showdownHandName?: string; showdownPot?: number; cashCountdownEndsAt?: number; cashSeats?: { seatIndex: number; userId: string | null; username: string | null; chips: number }[]; spectatorRejoinQueue?: string[] }) => {
      gameStateFromSocketRef.current = true;
      if (gameState.cashCountdownEndsAt != null) setCashCountdownEndsAt(gameState.cashCountdownEndsAt);
      if (gameState.cashSeats && Array.isArray(gameState.cashSeats)) {
        setCashSeats(gameState.cashSeats);
        // Spectateur assis via processRejoinQueue → passer en mode joueur (rediriger sans spectate=1)
        if (isSpectating && userId && gameState.cashSeats.some((s) => s.userId && String(s.userId) === String(userId))) {
          navigate(`/game?gameId=${gameIdParam}`, { replace: true });
          return;
        }
      }
      if (!gameState.cashCountdownEndsAt && gameState.phase !== "WAITING") setCashCountdownEndsAt(null);
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
          const myCards = isMe && serverCards.length > 0 ? serverCards : (isMe ? myCardsFromPrev : serverCards);
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
            hasFolded: !(p.isActive),
            isBot: false,
          };
        });
        return mapped;
      });
      setPot(gameState.pot ?? 0);
      const phase = gameState.phase != null ? (phaseMap[gameState.phase] ?? (gameState.phase as string).toLowerCase?.() ?? "preflop") : "preflop";
      setPhase(phase as GamePhase);
      setBurnedCardsCount((gameState as { burnedCardsCount?: number }).burnedCardsCount ?? 0);
      const cc = gameState.communityCards;
      if (Array.isArray(cc)) {
        const arr: (Card | null)[] = [null, null, null, null, null];
        cc.forEach((c, i) => { if (i < 5 && c && typeof c === "object") arr[i] = normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]); });
        // Multi: flop carte par carte (comme en mode bot) — une seule fois, pas à chaque changement de tour
        if (phase === "flop" && arr[0] && arr[1] && arr[2]) {
          if (!flopAnimatedRef.current) {
            flopAnimatedRef.current = true;
            flopAnimateTimeoutsRef.current.forEach((t) => clearTimeout(t));
            flopAnimateTimeoutsRef.current = [];
            setCommunityCardsState([arr[0], null, null, null, null]);
            const t1 = setTimeout(() => setCommunityCardsState((prev) => [arr[0]!, arr[1]!, null, null, null]), 800);
            const t2 = setTimeout(() => setCommunityCardsState(arr), 1600);
            flopAnimateTimeoutsRef.current = [t1, t2];
          } else {
            setCommunityCardsState(arr);
          }
        } else {
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
        setTimeLeft(30);
      }
      const hasShowdownWinner = gameState.showdownWinnerId || (gameState.showdownWinnerIds && gameState.showdownWinnerIds.length > 0);
      if (phase === "showdown" && hasShowdownWinner) {
        const winnerIds = gameState.showdownIsSplit && gameState.showdownWinnerIds?.length
          ? gameState.showdownWinnerIds
          : [gameState.showdownWinnerId!];
        const firstWinnerId = winnerIds[0]!;
        const winnerName = gameState.showdownIsSplit && winnerIds.length > 1
          ? "Égalité"
          : (players.find((p) => String(p.id) === String(firstWinnerId))?.name ?? firstWinnerId);
        const winnerPlayer = players.find((p) => String(p.id) === String(firstWinnerId));
        const totalPot = gameState.showdownPot ?? 0;
        const potWon = winnerIds.length > 1 ? Math.floor(totalPot / winnerIds.length) : totalPot;
        const humanChipsAfter = humanServerChips ?? 0;
        const balanceChange = humanChipsAfter - startOfHandChipsRef.current;
        addToUserBalance(balanceChange);
        const normalized = winnerPlayer?.cards?.length
          ? winnerPlayer.cards
              .map((c) => normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]))
              .filter((c): c is Card => c !== null)
          : [];
        setShowdownReveal(true);
        setPendingShowdownData({
          winnerId: firstWinnerId,
          winnerIds: winnerIds.length > 1 ? winnerIds : undefined,
          winnerName,
          hand: gameState.showdownHandName ?? "—",
          pot: potWon,
          winnerCards: normalized,
          isSplit: gameState.showdownIsSplit ?? false,
        });
      }
    };
    socket.on("GAME_UPDATE", onGameUpdate);
    const onGameEnded = (data: { gameId: string; winnerId: string; reason: string; pot?: number }) => {
      if (data.reason === "opponent_left" && String(data.winnerId) === String(userId)) {
        const balanceChange = Math.round(data.pot ?? 0);
        addToUserBalance(balanceChange);
        setShowdownResult((prevResult) => {
          if (prevResult) return prevResult;
          return {
            winnerId: data.winnerId,
            winnerName: "Vous",
            hand: "Adversaire parti",
            handRank: 0,
            pot: data.pot ?? 0,
          };
        });
      }
    };
    socket.on("GAME_ENDED", onGameEnded);
    const onCashWaiting = (state: { cashCountdownEndsAt?: number; cashSeats?: { seatIndex: number; userId: string | null; username: string | null; chips: number }[] }) => {
      setCashWaitingPlayers(true);
      if (state.cashSeats) setCashSeats(state.cashSeats);
    };
    socket.on("CASH_WAITING_PLAYERS", onCashWaiting);
    const onQueueStatus = (data: { queued: boolean }) => setSpectatorWantsToRejoin(data.queued);
    socket.on("SPECTATOR_QUEUE_STATUS", onQueueStatus);
    return () => {
      socket.off("GAME_UPDATE", onGameUpdate);
      socket.off("GAME_ENDED", onGameEnded);
      socket.off("CASH_WAITING_PLAYERS", onCashWaiting);
      socket.off("SPECTATOR_QUEUE_STATUS", onQueueStatus);
    };
  }, [socket, gameIdParam, userId, isSpectating]);

  // Multi: fetch room-info quand handResult pour afficher bouton rematch au host
  useEffect(() => {
    if (!handResult || !gameIdParam || isBotMode || !userId) return;
    const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);
    fetch(`${apiBase}/api/game/${gameIdParam}/room-info`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.hostId && String(data.hostId) === String(userId)) setIsRematchHost(true);
      })
      .catch(() => {});
  }, [handResult, gameIdParam, isBotMode, userId]);

  // Cash game: tick countdown pour afficher les secondes restantes
  const [cashCountdownTick, setCashCountdownTick] = useState(0);
  useEffect(() => {
    if (!cashCountdownEndsAt) return;
    const iv = setInterval(() => setCashCountdownTick((t) => t + 1), 1000);
    return () => clearInterval(iv);
  }, [cashCountdownEndsAt]);
  const cashCountdownSecs = cashCountdownEndsAt ? Math.max(0, Math.ceil((cashCountdownEndsAt - Date.now()) / 1000)) : 0;

  // Multi: écouter REMATCH_CREATED pour rediriger vers la nouvelle salle
  useEffect(() => {
    if (!socket) return;
    const onRematch = (data: { newRoomId: string }) => {
      if (data?.newRoomId) navigate(`/waiting-room?roomId=${data.newRoomId}`);
    };
    socket.on("REMATCH_CREATED", onRematch);
    return () => socket.off("REMATCH_CREATED", onRematch);
  }, [socket, navigate]);

  // Multiplayer: après 3s de révélation des cartes, afficher le modal du gagnant (ou Skip)
  useEffect(() => {
    if (!pendingShowdownData || !gameIdParam) return;
    const applyResult = () => {
      setShowdownResult({
        winnerId: pendingShowdownData.winnerId,
        winnerIds: pendingShowdownData.winnerIds,
        winnerName: pendingShowdownData.winnerName,
        hand: pendingShowdownData.hand,
        handRank: 0,
        pot: pendingShowdownData.pot,
        isSplit: pendingShowdownData.isSplit,
      });
      setShowdownWinnerCards(pendingShowdownData.winnerCards);
      setShowdownReveal(false);
      setPendingShowdownData(null);
      showdownSkipRef.current = null;
    };
    const t = setTimeout(applyResult, 3000);
    showdownSkipRef.current = () => {
      clearTimeout(t);
      applyResult();
    };
    return () => {
      clearTimeout(t);
      showdownSkipRef.current = null;
    };
  }, [pendingShowdownData, gameIdParam]);

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
      if (phaseRef.current === "showdown") return; // Ne pas réactiver le timer au showdown
      setTimeLeft(data.timeLeft);
      setTimerActive(true);
    });
    return () => socket.off("TURN_TIMER");
  }, [socket]);

  const _playPhase = phase === "preflop" || phase === "flop" || phase === "turn" || phase === "river";

  // Forcer l'activation du timer quand c'est le tour du joueur (arrêter dès le showdown)
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
    setTimeLeft(30);

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

  // Quand c'est le tour du joueur humain, garantir que les boutons sont actifs (sans écraser hasPlayerActed après une action)
  useEffect(() => {
    if (isMyTurn && !hasFoldedFromState && !hasPlayerActed) {
      setIsLoading(false);
      setTimerActive(true);
    }
  }, [isMyTurn, hasFoldedFromState, hasPlayerActed]);

  // Safety net: if active player has already acted this round but is still marked active, pass turn
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

        let nextIndex = nextPlayerWithChips((idx + 1) % newPlayers.length);
        if (nextIndex !== -1) {
          newPlayers[nextIndex] = { ...newPlayers[nextIndex], isActive: true };
        }

      return newPlayers;
    });

    setHasPlayerActed(false);
    setIsLoading(false);
  };

  // Tour de mises terminé → passer à la street suivante. Utilise playersState (pas la ref) pour avoir l'état à jour quand roundPlayersActed change.
  useEffect(() => {
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
        } else if (!hasAllIn) {
          // Transition dès que tout le monde a agi et les mises sont égalisées (bot et multi)
          if (streetTransitionScheduledRef.current === phase) return;
          streetTransitionScheduledRef.current = phase;
          streetTransitionTimeoutRef.current = setTimeout(() => {
            streetTransitionTimeoutRef.current = null;
            doStreetTransitionRef.current?.();
          }, 1000);
        }
      }
    }
  }, [roundPlayersActed, phase, gameIdParam, userId, runOutPhase, playersState]);

  // Capturer le stack du joueur une seule fois au tout début de la main (preflop), avant toute mise
  useEffect(() => {
    if (phase !== "preflop" || !gameInitialized || hasSetStartOfHandThisHandRef.current) return;
    const humanChips = isBotMode ? playerChips : playersState.find((p) => String(p.id) === String(userId))?.chips ?? playerChips;
    startOfHandChipsRef.current = humanChips;
    hasSetStartOfHandThisHandRef.current = true;
  }, [phase, gameInitialized, isBotMode, playerChips, playersState, userId]);

  // Garder les refs à jour pour le run-out (éviter closures stales)
  useEffect(() => {
    deckRef.current = deck;
    communityCardsStateRef.current = communityCardsState;
  }, [deck, communityCardsState]);

  // Ref pour la transition de rue : toujours appeler la dernière version (évite closures stales dans nextTurn)
  useEffect(() => {
    doStreetTransitionRef.current = () => {
      if (phase === "preflop") dealFlop();
      else if (phase === "flop") dealTurn();
      else if (phase === "turn") dealRiver();
      else if (phase === "river") setPhase("showdown");
    };
  }, [phase, dealFlop, dealTurn, dealRiver]);

  // Réinitialiser le run-out, le flag "début de main", la raison de fin de partie et le flag de transition en début de main
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

  // Réinitialiser le flag de transition et annuler le timeout précédent quand on change de phase
  useEffect(() => {
    if (streetTransitionTimeoutRef.current) {
      clearTimeout(streetTransitionTimeoutRef.current);
      streetTransitionTimeoutRef.current = null;
    }
    streetTransitionScheduledRef.current = null;
  }, [phase]);

  // Mode bot : filet de sécurité si bloqué en flop/turn/river (>20s sans transition malgré mises égalisées)
  useEffect(() => {
    if (!isBotMode || gameIdParam) return; // En bot : pas de gameId
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

  // Run-out du board après all-in : distribuer Flop puis Turn puis River sans tour de mise, puis showdown
  // On lit deckRef/communityCardsStateRef dans le timeout pour avoir l'état à jour (sinon Turn/River écrasent le Flop)
  useEffect(() => {
    if (runOutPhase === null) return;
    const t = setTimeout(() => {
      if (runOutPhase === "preflop") {
        dealFlop(true);
        setRunOutPhase("flop");
      } else if (runOutPhase === "flop") {
        const currentDeck = [...deckRef.current];
        const currentCommunity = [...communityCardsStateRef.current];
        currentDeck.shift(); // burn
        const turnCard = currentDeck.shift();
        if (turnCard) currentCommunity[3] = turnCard;
        setDeck(currentDeck);
        setCommunityCardsState(currentCommunity);
        setPhase("turn");
        setRunOutPhase("turn");
      } else if (runOutPhase === "turn") {
        const currentDeck = [...deckRef.current];
        const currentCommunity = [...communityCardsStateRef.current];
        currentDeck.shift(); // burn
        const riverCard = currentDeck.shift();
        if (riverCard) currentCommunity[4] = riverCard;
        setDeck(currentDeck);
        setCommunityCardsState(currentCommunity);
        setPhase("river");
        setRunOutPhase("river");
      } else if (runOutPhase === "river") {
        setPhase("showdown");
        setRunOutPhase(null);
      }
    }, runOutPhase === "preflop" ? 1200 : 1400);
    return () => clearTimeout(t);
  }, [runOutPhase]);

  // Reset showdown state on new hand
  useEffect(() => {
    if (phase === "init" || phase === "shuffle") {
      showdownStartedRef.current = false;
      setShowdownReveal(false);
      setShowdownWinnerCards([]);
      setPendingShowdownData(null);
    }
  }, [phase]);

  // Showdown: reveal all cards for 3s, then evaluate winner with side pot support
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
      setShowdownReveal(true);
      const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);
      setTimeout(async () => {
        let handName = "Haute carte";
        try {
          const url = apiUrl ? `${apiUrl}/api/bot/evaluate-winner` : "/api/bot/evaluate-winner";
          const res = await fetch(url, {
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
        setShowdownReveal(false);
        setShowdownWinnerCards(sole.cards ?? []);
        setShowdownResult({ winnerId: String(sole.id), winnerName: sole.name, hand: handName, handRank: 0, pot });
      }, 3000);
      return;
    }

    showdownStartedRef.current = true;
    setShowdownReveal(true);
    let pots: { amount: number; eligibleIds: string[] }[];
    try {
      pots = calculateSidePots(playersState, handContributionsRef.current);
    } catch {
      pots = [{ amount: pot, eligibleIds: activeInHand.map((p) => String(p.id)) }];
    }
    if (pots.length > 1) setSidePots(pots);

    const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
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
      setShowdownReveal(false);
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
      }
      addToUserBalance(0);
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
          const url = apiUrl ? `${apiUrl}/api/bot/evaluate-winner` : "/api/bot/evaluate-winner";
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
            mainWinnerName = data.isSplit ? "Égalité" : (data.winnerName ?? winnerIds[0]);
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
        humanShare = awards[humanId] ?? 0;
        if (humanShare > 0) setPlayerChips((prev) => prev + humanShare);

        const startChips = startOfHandChipsRef.current;
        const endChips = humanShare > 0 ? playerChips + humanShare : playerChips;
        const balanceChange = endChips - startChips;
        const toAdd = isBotMode ? (balanceChange > 0 ? Math.round(balanceChange * winMultiplier) : balanceChange) : balanceChange;
        addToUserBalance(toAdd);
        toAddLastRef.current = toAdd;
        setPot(0);
        setShowdownReveal(false);
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
            const r = await fetch(apiUrl ? `${apiUrl}/api/bot/evaluate-winner` : "/api/bot/evaluate-winner", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ players: [{ id: String(fw.id), name: fw.name, cards: fw.cards }], communityCards: validCommunity }),
            });
            if (r.ok) { const d = await r.json(); fallbackHand = d.handName ?? fallbackHand; }
          }
        } catch { /* ignore */ }
        applyFallback(fallbackHand);
      }
    };
    const revealTimer = setTimeout(runComplete, 3000);
    showdownSkipRef.current = () => {
      clearTimeout(revealTimer);
      showdownSkipRef.current = null;
      runComplete();
    };
    return () => {
      clearTimeout(revealTimer);
      showdownSkipRef.current = null;
    };
  }, [phase, showdownResult, handResult, isBotMode, playersState, communityCardsState, pot, winMultiplier, userId]);

  // Safety net: force showdown completion if stuck for 12s (API timeout, race, validCommunity delay)
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
          const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);
          const r = await fetch(apiUrl ? `${apiUrl}/api/bot/evaluate-winner` : "/api/bot/evaluate-winner", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ players: [{ id: String(winner.id), name: winner.name, cards: (winner as BasePlayer | BotPlayer).cards }], communityCards: validComm }),
          });
          if (r.ok) { const d = await r.json(); safetyHand = d.handName ?? safetyHand; }
        } catch { /* ignore */ }
      }
      setPot(0);
      setShowdownReveal(false);
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
      addToUserBalance(0);
    }, 12000);
    return () => clearTimeout(safety);
  }, [phase, showdownResult, handResult, isBotMode, playersState, pot, userId]);

  // Game over: human eliminated or all bots eliminated
  useEffect(() => {
    if (!isBotMode || !showdownResult || gameOverReason) return;
    if (playerChips <= 0) {
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
        const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '/vmProjetIntegrateurgrp10-0';
        const url = `${baseUrl}/api/bot/action`;
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
            minRaise: 20,
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

        // Montant que le bot doit mettre (total bet côté serveur pour RAISE = mise totale visée)
        const botCurrentBet = activePlayer.bet ?? 0;
        const amountFromServer = decision.amount ?? 0;
        const amountToPut =
          decision.action === "RAISE"
            ? Math.max(0, amountFromServer - botCurrentBet)
            : decision.action === "CALL"
              ? Math.min(decision.amount ?? callAmount, activePlayer.chips ?? 0)
              : 0;

        const botActionLabel =
          decision.action === "FOLD"
            ? "s'est couché"
            : decision.action === "CHECK" || (decision.action === "RAISE" && amountToPut <= 0)
              ? "a checké"
              : decision.action === "CALL" || (decision.action === "RAISE" && amountToPut <= callAmount)
                ? "a suivi"
                : "a relancé";
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
              // Ne jamais mettre plus que le callAmount (montant pour égaliser) ni plus que les jetons du bot
              const effectiveCall = Math.min(
                decision.amount ?? callAmount,
                callAmount,
                activePlayer.chips ?? 0
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
        }, Math.random() * 1000 + 1000);
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

  // Après gain/perte : animation puis enregistrement des stats (sans navigation)
  useEffect(() => {
    if (handResult === null || !isBotMode) return;
    const t = setTimeout(() => {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.DEV ? 'http://localhost:3000' : '/vmProjetIntegrateurgrp10-0';
      const recordUrl = `${baseUrl}/api/game/record-result`;
      if (token) {
        fetch(recordUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ won: handResult === "win", delta: toAddLastRef.current }),
        }).catch(() => {});
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [handResult, isBotMode]);

  const handleFold = (playerId?: number | string) => {
    if (handResult !== null) return;
    const heroId = playersState.find((p) => p.id === userId || p.id === "human")?.id;
    const isHuman = playerId === undefined || playerId === heroId;
    if (gameIdParam && isHuman && !socket) return;
    if (gameIdParam && socket && isHuman) {
      socket.emit("PLAYER_ACTION", { gameId: gameIdParam, playerId: String(userId), action: "FOLD" });
    }
    const foldingIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (foldingIndex === -1) return;

    setRoundPlayersActed((prev) => new Set(prev).add(foldingIndex));
    setPlayersState((prev) => {
      const newPlayers = prev.map((p, i) =>
        i === foldingIndex ? { ...p, hasFolded: true, isActive: false } : { ...p }
      );
      const activeInHand = newPlayers.filter(
        (p) => p.isConnected !== false && !(p.hasFolded ?? false)
      );

      // En multijoueur, on laisse le serveur gérer le pot, le SHOWDOWN et le vainqueur
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

    // En multijoueur, le serveur envoie GAME_UPDATE avec le vainqueur — ne pas traiter en local
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
        setShowdownWinnerCards([]); // Abandon : le gagnant ne montre pas ses cartes
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
      const endChips = humanWon ? playerChips + pot : playerChips;
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
      socket.emit("PLAYER_ACTION", { gameId: gameIdParam, playerId: String(userId), action: "CHECK" });
    }
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (isHumanActing) {
      setHasPlayerActed(true);
      setIsLoading(true);
    }
    if (!gameIdParam) nextTurn(justActedIndex);
  };

  const handleCall = (amount: number, playerId?: number | string) => {
    if (handResult !== null) return;
    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    const isHumanActing = playerId === undefined || playerId === hero?.id;
    if (gameIdParam && isHumanActing && !socket) return;
    if (gameIdParam && socket && isHumanActing) {
      socket.emit("PLAYER_ACTION", { gameId: gameIdParam, playerId: String(userId), action: "CALL", amount });
    }
    // Cap call amount at player's chips (all-in if not enough)
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
      const totalRefund = playersState
        .filter((p) => p.id !== playerId && (p.bet ?? 0) > amount)
        .reduce((sum, p) => sum + ((p.bet ?? 0) - amount), 0);
      const humanRefund = hero && hero.id !== playerId && (hero.bet ?? 0) > amount ? (hero.bet ?? 0) - amount : 0;
      setPlayersState((prev) => {
        const nextList = prev.map((p) => {
          let next = p;
          if (p.id !== playerId) {
            if ((p.bet ?? 0) > amount) {
              const refund = (p.bet ?? 0) - amount;
              next = { ...p, chips: p.chips + refund, bet: amount };
            }
          } else {
            next = { ...p, chips: Math.max(0, actorChipsBefore - amount), bet: actorBetBefore + amount, isActive: false };
          }
          if (isBotAllInCall) {
            next = { ...next, isActive: false };
          }
          return next;
        });
        const botNext = nextList.find((p) => p.id === playerId);
        if (botNext) {
          console.log("[QB-BOT setPlayersState bot update]", { amount, botChipsBefore: actorChipsBefore, botChipsAfter: botNext.chips, botBetAfter: botNext.bet });
        }
        return nextList;
      });
      const newPot = Math.max(0, pot + amount - totalRefund);
      console.log("[QB-BOT pot update]", { potBefore: pot, amount, totalRefund, potAfter: newPot });
      setPot((prev) => Math.max(0, prev + amount - totalRefund));
      setRoundPlayersActed((prev) => {
        const next = new Set(prev).add(botIndex);
          const activeInHandCount = playersStateRef.current.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false)).length;
          if (next.size >= activeInHandCount && !isBotAllInCall) {
          bothActedNoTurnRef.current = true;
          const currentPhase = phase;
          if (streetTransitionScheduledRef.current !== currentPhase) {
            streetTransitionScheduledRef.current = currentPhase;
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
            // Bot a agi : donner la main au joueur suivant
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
    if (!gameIdParam) nextTurn(justActedIndex);
  };

  const handleRaise = (raiseAmount: number, playerId?: number | string) => {
    if (handResult !== null) return;
    const totalToPut = callAmount + raiseAmount;
    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    const isHumanActing = playerId === undefined || playerId === hero?.id;
    if (gameIdParam && isHumanActing && !socket) return;
    if (gameIdParam && socket && isHumanActing) {
      socket.emit("PLAYER_ACTION", { gameId: gameIdParam, playerId: String(userId), action: "RAISE", amount: raiseAmount });
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
    if (!gameIdParam) nextTurn(justActedIndex);
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
      {/* Particules dorées flottantes */}
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

      {/* Animation de shuffle du dealer */}
      <AnimatePresence>
        {phase === "shuffle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60]"
          >
            <div className="relative">
              {/* Pile de cartes qui se mélangent */}
              <div className="relative w-32 h-44">
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-full h-full bg-gradient-to-br from-red-900 to-red-950 rounded-xl border-4 border-yellow-500/50 shadow-2xl"
                    style={{
                      backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.03) 10px, rgba(255,255,255,.03) 20px)",
                    }}
                    animate={{
                      rotate: [0, shuffleCount % 2 === 0 ? 15 : -15, 0],
                      x: [0, shuffleCount % 2 === 0 ? 30 : -30, 0],
                      y: [0, shuffleCount % 2 === 0 ? -20 : 20, 0],
                    }}
                    transition={{
                      duration: 0.3,
                      delay: i * 0.05,
                      ease: "easeInOut",
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-yellow-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
              
              {/* Texte "Shuffling..." */}
              <motion.div
                className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <p className="text-yellow-400 font-bold text-xl tracking-wider drop-shadow-lg">
                  Mélange des cartes...
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animation "Bot réfléchit" */}
      {isBotThinking && mode === "bot" && (
        <div className={`absolute z-50 left-1/2 transform -translate-x-1/2 ${
          isMobile ? 'bottom-32' : isTablet ? 'bottom-36' : 'bottom-40'
        }`}>
          <div className={`bg-slate-800/95 backdrop-blur-sm rounded-2xl ${isMobile ? 'p-4' : 'p-6'} border-2 border-blue-500 shadow-2xl`}>
            <div className={`flex items-center ${isMobile ? 'gap-3' : 'gap-4'}`}>
              <Loader2 className={`${isMobile ? 'w-6 h-6' : 'w-8 h-8'} text-blue-400 animate-spin`} />
              <div>
                <div className={`text-white font-bold ${isMobile ? 'text-base' : 'text-lg'}`}>Bot réfléchit...</div>
                <div className={`text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'}`}>Analyse des probabilités</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Showdown card reveal: show all hands for 3s before modal */}
      <AnimatePresence>
        {showdownReveal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[105] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className="flex flex-col items-center gap-4"
            >
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Showdown</h2>

              {/* Player hands (toutes les cartes de tout le monde) */}
              <div className="flex flex-wrap justify-center gap-6">
                {playersState
                  .filter((p) => p.cards?.length === 2)
                  .map((player) => (
                    <motion.div
                      key={String(player.id)}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      className="flex flex-col items-center gap-2 bg-slate-800/80 rounded-xl px-4 py-3 border border-slate-600"
                    >
                      <span className="text-white font-semibold text-sm md:text-base">{player.name}</span>
                      <div className="flex gap-2">
                        {player.cards.map((card, i) => (
                          <PokerCard
                            key={i}
                            suit={card.suit}
                            value={card.value}
                            size="md"
                            animated
                            animationDelay={i * 0.1}
                          />
                        ))}
                      </div>
                    </motion.div>
                  ))}
              </div>

              {/* Community cards */}
              {(() => {
                const validCommunity = communityCardsState.filter((c): c is Card => c !== null);
                if (validCommunity.length === 0) return null;
                return (
                  <motion.div
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col items-center gap-2 mt-2"
                  >
                    <span className="text-gray-400 text-xs font-semibold tracking-wider uppercase">Board</span>
                    <div className="flex gap-2">
                      {validCommunity.map((card, i) => (
                        <PokerCard
                          key={i}
                          suit={card.suit}
                          value={card.value}
                          size="sm"
                          animated
                          animationDelay={0.3 + i * 0.08}
                        />
                      ))}
                    </div>
                  </motion.div>
                );
              })()}

              {/* Bouton Skip pour passer directement au résultat */}
              <button
                type="button"
                onClick={() => showdownSkipRef.current?.()}
                className="mt-4 px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 border border-white/40 text-white font-semibold text-sm transition-colors"
              >
                Skip
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Showdown : gagnant + combinaison + pot */}
      <ShowdownDisplay
        winner={
          showdownResult
            ? {
                name: showdownResult.winnerName,
                hand: showdownResult.hand,
                pot: showdownResult.pot,
                isSplit: showdownResult.isSplit,
              }
            : null
        }
        winnerCards={showdownWinnerCards}
        onClose={() => {
          if (!showdownResult) return;
          if (gameOverReason) {
            navigate("/lobby", {
              state: {
                message: gameOverReason === "bot_eliminated"
                  ? "Vous avez gagné la partie ! (bot éliminé)"
                  : "Plus de jetons. Partie terminée.",
              },
            });
            setShowdownResult(null);
            setGameOverReason(null);
            return;
          }
          const humanId = playersState.find((p) => p.id === userId || p.id === "human")?.id;
          const won =
            showdownResult.winnerId === humanId ||
            showdownResult.winnerId === "human" ||
            (showdownResult.isSplit && showdownResult.winnerIds?.some((id) => String(id) === String(humanId)));
          const winnerName = showdownResult.winnerName;
          const handName = showdownResult.hand;
          setHandResult(won ? "win" : "loss");
          setHandResultData({ winnerName, handName });
          setShowdownResult(null);
        }}
      />

      {/* Overlay gain / perte */}
      <AnimatePresence>
        {handResult !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 200 }}
              className={`rounded-3xl shadow-2xl border-2 px-8 py-10 flex flex-col items-center gap-4 ${
                handResult === "win"
                  ? "bg-gradient-to-br from-amber-500/20 to-yellow-600/30 border-amber-400"
                  : "bg-gradient-to-br from-slate-700/95 to-slate-800 border-slate-500"
              }`}
            >
              {handResult === "win" ? (
                <Trophy className="w-20 h-20 text-amber-400" />
              ) : (
                <Frown className="w-20 h-20 text-slate-400" />
              )}
              <h2 className="text-2xl md:text-3xl font-bold text-white">
                {handResult === "win" ? "Vous avez gagné !" : "Vous avez perdu"}
              </h2>
              <p className="text-slate-300 text-sm">Résultats des paris cachés...</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full max-w-xs mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (handResultData) {
                      navigate("/hidden-bets-result", {
                        state: {
                          winnerName: handResultData.winnerName,
                          handName: handResultData.handName,
                        },
                      });
                    }
                    setHandResult(null);
                    setHandResultData(null);
                  }}
                  className="flex-1 min-w-[140px] px-4 py-3 rounded-xl font-semibold bg-amber-500/30 hover:bg-amber-500/50 border border-amber-400/60 text-white transition-colors"
                >
                  {t("game.goToHiddenBets")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    navigate("/lobby");
                    setHandResult(null);
                    setHandResultData(null);
                  }}
                  className="flex-1 min-w-[140px] px-4 py-3 rounded-xl font-semibold bg-slate-600/80 hover:bg-slate-500/80 border border-slate-500 text-white transition-colors"
                >
                  {t("game.backToLobby")}
                </button>
                {gameIdParam && !isBotMode && isRematchHost && (
                  <button
                    type="button"
                    onClick={async () => {
                      setRematchLoading(true);
                      try {
                        const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);
                        const res = await fetch(`${apiBase}/api/waiting-room/rematch`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
                          body: JSON.stringify({ gameId: gameIdParam }),
                        });
                        if (!res.ok) {
                          const err = await res.json().catch(() => ({}));
                          addToast(err?.error ?? "Erreur rematch", "error");
                        }
                      } finally {
                        setRematchLoading(false);
                      }
                    }}
                    disabled={rematchLoading}
                    className="flex-1 min-w-[140px] px-4 py-3 rounded-xl font-semibold bg-emerald-600/80 hover:bg-emerald-500/80 border border-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {rematchLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {t("game.rematchSameMembers")}
                  </button>
                )}
                {isBotMode && (
                  <button
                    type="button"
                    onClick={() => {
                      setHandResult(null);
                      setHandResultData(null);
                      navigate(location.pathname + location.search, { state: { replay: true } });
                    }}
                    className="flex-1 min-w-[140px] px-4 py-3 rounded-xl font-semibold bg-emerald-600/80 hover:bg-emerald-500/80 border border-emerald-500 text-white transition-colors"
                  >
                    {t("game.replaySameConfig")}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barre de navigation - En haut */}
      <div className={`absolute ${isMobile ? 'top-2 left-2 right-2' : 'top-4 left-8 right-8'} z-50 flex items-center justify-between`}>
        {/* Partie GAUCHE - Logo, Menu Hamburger, Affichage */}
        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-3'}`}>
          {/* Logo Quantum Bluff */}
          <QuantumBluffLogo 
            className={`${isMobile ? 'w-8 h-8' : 'w-12 h-12'} drop-shadow-2xl`}
          />

          {/* Indicateur de phase */}
          {!isMobile && phase !== "init" && phase !== "shuffle" && phase !== "deal" && (
            <div className="bg-yellow-500/20 backdrop-blur-sm border border-yellow-500/40 rounded-lg px-3 py-1.5 shadow-lg">
              <p className="text-yellow-400 font-bold text-sm tracking-wide uppercase">
                {phase === "preflop" && "Pre-Flop"}
                {phase === "flop" && "Flop"}
                {phase === "turn" && "Turn"}
                {phase === "river" && "River"}
                {phase === "showdown" && "Showdown"}
              </p>
            </div>
          )}

          {/* Bouton Menu Hamburger */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm text-white ${isMobile ? 'p-2' : 'p-3'} rounded-lg border border-slate-700 transition-all shadow-lg`}
              title="Menu"
            >
              <Menu className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>

            {/* Menu déroulant */}
            {showMenu && (
              <div className={`absolute ${isMobile ? 'top-12' : 'top-14'} left-0 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700 overflow-hidden ${isMobile ? 'min-w-[180px]' : 'min-w-[220px]'} z-50`}>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} text-white hover:bg-slate-700 transition-all`}
                >
                  <User className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>{t('lobby.profile')}</span>
                </button>
                <button
                  onClick={() => {
                    navigate("/friends");
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} text-white hover:bg-slate-700 transition-all`}
                >
                  <Users className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>{t('lobby.friends')}</span>
                </button>
                <button
                  onClick={() => {
                    navigate("/tutorial-game");
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} text-cyan-400 hover:bg-slate-700 transition-all`}
                >
                  <HelpCircle className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>Tutoriel</span>
                </button>
                <div className="border-t border-slate-700"></div>
                <button
                  onClick={() => {
                    setIsQuantumOpen((o) => !o);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} ${isQuantumOpen ? 'text-amber-400 bg-amber-500/20' : 'text-white hover:bg-slate-700'} transition-all`}
                >
                  <Activity className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>Probabilités</span>
                </button>
                <button
                  onClick={() => {
                    setIsPanelOpen((o) => !o);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} ${isPanelOpen ? 'text-yellow-400 bg-yellow-500/20' : 'text-white hover:bg-slate-700'} transition-all`}
                >
                  <Trophy className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>Paris Cachés</span>
                </button>
                <div className="border-t border-slate-700"></div>
                <button
                  onClick={() => {
                    setShowQuitConfirm(true);
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} text-red-400 hover:bg-slate-700 transition-all`}
                >
                  <LogOut className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>Quitter la partie</span>
                </button>
              </div>
            )}
          </div>

          {/* Bouton Affichage (Accessibilité) */}
          {!isMobile && (
            <div className="bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-full shadow-lg px-2 py-2 flex items-center gap-1">
              <button
                onClick={toggleHighContrast}
                className={`relative rounded-full px-3 py-2 transition-all group ${
                  highContrast ? "bg-yellow-600" : "bg-slate-700 hover:bg-slate-600"
                }`}
                title="Contraste élevé"
              >
                <Eye className={`w-4 h-4 ${highContrast ? "text-white" : "text-gray-400"}`} />
              </button>

              <button
                onClick={toggleVisualAlerts}
                className={`relative rounded-full px-3 py-2 transition-all group ${
                  visualAlerts ? "bg-blue-600" : "bg-slate-700 hover:bg-slate-600"
                }`}
                title="Alertes visuelles"
              >
                <Bell className={`w-4 h-4 ${visualAlerts ? "text-white" : "text-gray-400"}`} />
              </button>

              <button
                onClick={toggleColorblindMode}
                className={`relative rounded-full px-3 py-2 transition-all group ${
                  colorblindMode ? "bg-purple-600" : "bg-slate-700 hover:bg-slate-600"
                }`}
                title="Mode daltonien"
              >
                <Palette className={`w-4 h-4 ${colorblindMode ? "text-white" : "text-gray-400"}`} />
              </button>
            </div>
          )}
        </div>

        {/* Partie DROITE - Avatar, Nom/ID, Solde + Ajout, Bouton Chat, Bouton Aide */}
        <div className={`flex items-center ${isMobile ? 'gap-1.5' : 'gap-4'}`}>
          {/* Avatar du joueur */}
          {!isMobile && (
            <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl border-2 border-white">
              {getPlayerAvatar(heroDisplayName) ? (
                <ImageWithFallback
                  src={getPlayerAvatar(heroDisplayName)}
                  alt="Avatar du joueur"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">{heroDisplayName.charAt(0)}</span>
              )}
            </div>
          )}

          {/* Nom du joueur et ID */}
          {!isMobile && (
            <div className="flex flex-col">
              <div className="text-white font-bold text-lg leading-tight">
                {heroDisplayName}
              </div>
              <div className="text-gray-400 text-xs font-medium">
                {userId ? `ID ${userId.slice(0, 8)}` : "—"}
              </div>
            </div>
          )}

          {/* Séparateur */}
          {!isMobile && <div className="w-px h-10 bg-slate-700"></div>}

          {/* Capsule Solde + Bouton Ajouter */}
          <div className="flex items-center bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full pl-3 pr-1 py-1 shadow-lg gap-3">
            <div className={`text-white font-bold flex items-center gap-1.5 ${isMobile ? 'text-sm' : 'text-base'}`}>
              <ChipIcon size="sm" />
              <span>{playerChips.toLocaleString()}</span>
            </div>

            <button
              onClick={openAddMoney}
              className={`bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white ${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-full flex items-center justify-center shadow-md transition-all transform hover:scale-105 border border-green-400`}
              title={t("lobby.addMoney")}
            >
              <Plus className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
            </button>
          </div>

          {/* Séparateur */}
          {!isMobile && <div className="w-px h-10 bg-slate-700"></div>}

          {/* Bouton Chat - Minimaliste */}
          {!isMobile && (
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="p-2 rounded-full transition-all duration-300 hover:bg-slate-700/50 group"
              title="Ouvrir le chat"
            >
              <MessageCircle 
                className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${
                  isChatOpen ? "text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" : "text-gray-200 hover:text-white"
                }`} 
              />
            </button>
          )}

          {/* NOUVEAU : Bouton Aide (?) - Minimaliste */}
          {!isMobile && (
            <button
              onClick={() => setShowGameHelp(!showGameHelp)}
              className="p-2 rounded-full transition-all duration-300 hover:bg-slate-700/50 group"
              title="Aide et règles du jeu"
            >
              <HelpCircle 
                className={`w-6 h-6 transition-all duration-300 group-hover:scale-110 ${
                  showGameHelp ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.8)]" : "text-gray-200 hover:text-white"
                }`} 
              />
            </button>
          )}
        </div>
      </div>

      {/* Modal Ajouter des jetons */}
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
                      className={`px-4 py-2 rounded-lg font-bold transition ${
                        addMoneyAmount === amount
                          ? "bg-yellow-500 text-slate-900"
                          : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      }`}
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

      {/* Modal Confirmation Quitter */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-red-900 to-red-950 rounded-2xl border-2 border-red-600 shadow-2xl max-w-md w-full p-6 animate-bounce">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">!</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Quitter la partie ?</h2>
            </div>

            <p className="text-red-200 mb-6 leading-relaxed">
              Vous êtes sur le point de quitter la partie en cours. Vos jetons seront perdus et vous ne pourrez pas revenir à cette table.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  setShowQuitConfirm(false);
                  navigate("/lobby");
                }}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-red-600/50"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menu Accessibilité */}
      <AccessibilityMenu 
        isOpen={showAccessibilityMenu} 
        onClose={() => setShowAccessibilityMenu(false)} 
      />

      {/* Bannière Cash Game : countdown ou attente joueurs */}
      {gameIdParam && !isBotMode && (cashCountdownEndsAt || cashWaitingPlayers) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2">
          <div className="bg-slate-800/95 border border-emerald-500/50 rounded-xl px-6 py-3 shadow-lg">
            {cashWaitingPlayers ? (
              <p className="text-emerald-300 font-semibold">En attente de joueurs...</p>
            ) : cashCountdownSecs > 0 ? (
              <p className="text-white font-semibold">Nouvelle main dans {cashCountdownSecs} secondes...</p>
            ) : null}
          </div>
          {cashCountdownEndsAt && !cashWaitingPlayers && (
            <div className="flex gap-2 flex-wrap justify-center">
              {!cashSeats.some((s) => s.userId === userId) ? (
                cashSeats.some((s) => !s.userId) && (
                  <button
                    onClick={() => {
                      const free = cashSeats.findIndex((s) => !s.userId);
                      if (free >= 0 && socket) socket.emit("CASH_SIT", { gameId: gameIdParam, seatIndex: free, buyIn: 100 });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                  >
                    S&apos;asseoir (100)
                  </button>
                )
              ) : (
                <>
                  <button
                    onClick={() => socket?.emit("CASH_LEAVE", { gameId: gameIdParam })}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                  >
                    Se lever
                  </button>
                  <button
                    onClick={() => socket?.emit("CASH_REBUY", { gameId: gameIdParam, amount: 100 })}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
                  >
                    Racheter (100)
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Zone centrale - Table de poker avec cartes communes */}
      <div className={`flex-1 flex items-center justify-center relative ${isMobile ? 'px-2 pt-14' : 'px-6 pt-24'}`}>
        <PokerTable players={tablePlayers} communitySafeZone={230} phase={phase} burnedCardsCount={displayBurnedCardsCount}>
          <CommunityCards cards={communityCards} pot={pot} sidePots={sidePots.length > 1 ? sidePots : undefined} />
        </PokerTable>
      </div>

      {/* HUD Quantique - s'ouvre en overlay */}
      <QuantumHUD isOpen={isQuantumOpen} onToggle={() => setIsQuantumOpen(!isQuantumOpen)} />

      {/* Panneau Paris Cachés - s'ouvre en overlay */}
      <HiddenBetsPanel 
        isOpen={isPanelOpen}
        onToggle={() => setIsPanelOpen(!isPanelOpen)}
        players={activePlayers}
      />

      {/* Chat Poker - s'ouvre en overlay */}
      <PokerChat 
        isOpen={isChatOpen} 
        onToggle={() => setIsChatOpen(!isChatOpen)}
        onSendMessage={handleSendMessage}
      />

      {/* Feed de messages - En haut à gauche */}
      <MessageFeed messages={chatMessages} />

      {/* Bouton spectateur : rejoindre à la prochaine manche (toggle) - affiché dès qu'on specte un cash game */}
      {isSpectating && gameIdParam && !isBotMode && cashSeats.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => {
              if (spectatorWantsToRejoin) {
                socket?.emit("SPECTATOR_QUEUE_LEAVE", { gameId: gameIdParam });
              } else {
                socket?.emit("SPECTATOR_QUEUE_JOIN", { gameId: gameIdParam });
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              spectatorWantsToRejoin
                ? "bg-amber-600 hover:bg-amber-500 text-white"
                : "bg-emerald-600 hover:bg-emerald-500 text-white"
            }`}
          >
            {spectatorWantsToRejoin ? t("game.cancelRejoinNextHand") : t("game.rejoinNextHand")}
          </button>
        </div>
      )}

      {/* Tableau de bord du joueur - EN BAS (masqué en mode spectateur) */}
      {!isSpectating && (
        <PlayerDashboard
          name={heroDisplayName}
          chips={playerChips}
          cards={heroCards}
          onFold={() => handleFold()}
          onCall={(amount) => handleCall(amount)}
          onRaise={(amount) => handleRaise(amount)}
          onCheck={() => handleCheck()}
          callAmount={callAmount}
          minRaise={50}
          maxRaise={Math.max(0, playerChips - callAmount)}
          isMyTurn={handResult === null && isMyTurn}
          isLoading={isLoading}
          hasFolded={hasFoldedFromState}
          hasActed={hasPlayerActed}
          actionsDisabled={Boolean(gameIdParam && !socket)}
          waitingForPlayer={!isMyTurn && !hasFoldedFromState ? activePlayer?.name : undefined}
          timeLeft={timeLeft ?? 30}
          onToggleQuantum={() => setIsQuantumOpen(!isQuantumOpen)}
          onToggleHiddenBets={() => setIsPanelOpen(!isPanelOpen)}
          onToggleChat={() => setIsChatOpen(!isChatOpen)}
          isQuantumOpen={isQuantumOpen}
          isHiddenBetsOpen={isPanelOpen}
          isChatOpen={isChatOpen}
        />
      )}

      {/* Modal d'aide du jeu (affiché quand on clique sur le "?") */}
      {showGameHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowGameHelp(false)}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-indigo-500 shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <HelpCircle className="w-8 h-8 text-indigo-400" />
                Guide de Quantum Bluff
              </h2>
              <button onClick={() => setShowGameHelp(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-white">
              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">🎮 Objectif du Jeu</h3>
                <p className="text-gray-300">Remporter les jetons des autres joueurs en ayant la meilleure main de poker ou en les faisant se coucher.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">🃏 Actions Principales</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><strong className="text-red-400">{t('game.fold')} (Fold)</strong> : {t('gameHelp.foldDesc')}</li>
                  <li><strong className="text-blue-400">{t('game.callLabel')} (Call)</strong> : {t('gameHelp.callDesc')}</li>
                  <li><strong className="text-green-400">{t('game.raise')}</strong> : {t('gameHelp.raiseDesc')}</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">✨ Fonctionnalités Spéciales</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><strong className="text-purple-400">Probabilités Quantiques</strong> : Survolez pour voir vos chances de gagner, cliquez pour épingler</li>
                  <li><strong className="text-yellow-400">Paris Cachés</strong> : Pariez discrètement sur le résultat du coup</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">🏆 Combinaisons de Poker (du plus fort au plus faible)</h3>
                <ol className="space-y-1 text-gray-300 list-decimal list-inside">
                  <li>Quinte Flush Royale</li>
                  <li>Quinte Flush</li>
                  <li>Carré</li>
                  <li>Full</li>
                  <li>Couleur</li>
                  <li>Suite</li>
                  <li>Brelan</li>
                  <li>Double Paire</li>
                  <li>Paire</li>
                  <li>Carte Haute</li>
                </ol>
              </section>
            </div>

            <button
              onClick={() => setShowGameHelp(false)}
              className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </div>
  );
}