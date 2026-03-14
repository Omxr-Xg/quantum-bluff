import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { PokerTable } from "../components/PokerTable";
import { CommunityCards } from "../components/CommunityCards";
import { HiddenBetsPanel } from "../components/HiddenBetsPanel";
import { QuantumHUD } from "../components/QuantumHUD";
import { PokerChat } from "../components/PokerChat";
import { MessageFeed } from "../components/MessageFeed";
import { PlayerDashboard } from "../components/PlayerDashboard";
import { AccessibilityMenu } from "../components/AccessibilityMenu";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useSocket } from "../contexts/SocketContext";
import { useToast } from "../contexts/ToastContext";
import { User, Users, Menu, Loader2, Eye, Plus, MessageCircle, X, LogOut, Palette, Bell, HelpCircle, Sparkles, Trophy, Frown } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { QuantumBluffLogo } from "../assets/logo";
import { useDeviceType } from "../components/ui/use-mobile";
import { ShowdownDisplay } from "../components/ShowdownDisplay";
import { useUser } from "../hooks/useUser";

import type { ClientCard } from "../utils/cards";
import { normalizeServerCard } from "../utils/cards";

type Card = ClientCard;

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
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const gameIdParam = searchParams.get("gameId");
  const isBotMode = mode === "bot";
  const { userId } = useUser();

  const { socket } = useSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isQuantumOpen, setIsQuantumOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [_hasFolded, _setHasFolded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pot, setPot] = useState(150);
  const [playerChips, setPlayerChips] = useState(5000);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hasPlayerActed, setHasPlayerActed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playersState, setPlayersState] = useState<(BasePlayer | BotPlayer)[]>([]);
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showGameHelp, setShowGameHelp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [_timerActive, setTimerActive] = useState(false);
  const [currentBet] = useState(0);
  
  // Nouveaux états pour les animations de cartes
  const [phase, setPhase] = useState<GamePhase>("init");
  const [communityCardsState, setCommunityCardsState] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [, _setDealingCard] = useState<number | null>(null);
  const [roundPlayersActed, setRoundPlayersActed] = useState<Set<number>>(new Set());
  const [gameInitialized, setGameInitialized] = useState(false);
  const [handResult, setHandResult] = useState<"win" | "loss" | null>(null);
  const [showdownResult, setShowdownResult] = useState<{
    winnerId: string;
    winnerName: string;
    hand: string;
    handRank: number;
    pot: number;
  } | null>(null);
  const [lastBotAction, setLastBotAction] = useState<{ name: string; action: string } | null>(null);
  /** Après un all-in suivi : run-out du board sans nouveau tour de mise (preflop -> flop -> turn -> river -> showdown) */
  const [runOutPhase, setRunOutPhase] = useState<GamePhase | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameStateFromSocketRef = useRef(false);
  const clearBotActionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playersStateRef = useRef<(BasePlayer | BotPlayer)[]>([]);

  // Hook d'accessibilité
  const { highContrast, toggleHighContrast, visualAlerts, toggleVisualAlerts, colorblindMode, toggleColorblindMode } = useAccessibility();
  const { addToast } = useToast();

  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  const SB = 50;
  const BB = 100;

  const getPlayers = (): (BasePlayer | BotPlayer)[] => {
    const count = parseInt(searchParams.get("bots") || "1", 10);
    const diff = searchParams.get("difficulty") || "moyen";
    const diffMap: "easy" | "medium" | "hard" =
      diff === "facile" ? "easy" : diff === "difficile" || diff === "expert" ? "hard" : "medium";

    if (mode === "bot") {
      const botNames = ["Alpha", "Beta", "Gamma", "Delta", "Epsilon"];
      const bots: BotPlayer[] = [];
      for (let i = 0; i < count; i++) {
        bots.push({
          id: `bot-${i + 1}`,
          name: `Bot ${botNames[i]}`,
          chips: 5000 - SB,
          bet: SB,
          position: 0,
          isActive: true,
          isDealer: true,
          cards: [],
          isBot: true,
          difficulty: diffMap,
          isConnected: true,
          hasFolded: false,
          role: "SB",
        });
      }
      bots.push({
        id: "human",
        name: "Vous",
        chips: playerChips - BB,
        bet: BB,
        position: 1,
        isActive: false,
        isDealer: false,
        cards: [],
        isConnected: true,
        hasFolded: false,
        role: "BB",
      });
      return bots;
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

  const resetBetsAndSetFirstToAct = (position: number) => {
    setRoundPlayersActed(new Set());
    setPlayersState((prev) =>
      prev.map((p) => ({ ...p, bet: 0, isActive: p.position === position }))
    );
  };

  // Distribution du flop (3 cartes) — post-flop : BB (position 1) parle en premier
  // runOutOnly = true : après un all-in, on distribue les cartes sans donner la main à personne
  const dealFlop = (runOutOnly?: boolean) => {
    setPhase("flop");
    if (!runOutOnly) resetBetsAndSetFirstToAct(1);
    const newDeck = [...deck];
    const newCommunityCards = [...communityCardsState];
    newDeck.shift();
    for (let i = 0; i < 3; i++) {
      const card = newDeck.shift();
      if (card) {
        setTimeout(() => {
          newCommunityCards[i] = card;
          setCommunityCardsState([...newCommunityCards]);
        }, i * 300);
      }
    }
    setDeck([...newDeck]);
  };

  // Distribution du turn — BB parle en premier
  const dealTurn = (runOutOnly?: boolean) => {
    setPhase("turn");
    if (!runOutOnly) resetBetsAndSetFirstToAct(1);
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

  // Distribution de la river — SB (position 0) parle en premier, BB en dernier
  const dealRiver = (runOutOnly?: boolean) => {
    setPhase("river");
    if (!runOutOnly) resetBetsAndSetFirstToAct(0);
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
    let initial: (BasePlayer | BotPlayer)[] = [];
    if (gameIdParam && typeof window !== "undefined") {
      const stored = localStorage.getItem("gamePlayers");
      if (stored) {
        try {
          const parsed: { id: string; name: string }[] = JSON.parse(stored);
          // Ne pas supprimer : l'autre onglet doit pouvoir lire aussi
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
    initial.forEach((p, idx) => {
      (p as BasePlayer).isActive = idx === 0;
      p.cards = [];
    });
    setPlayersState(initial);
    if (!gameIdParam) {
      setDeck(generateDeck());
    }
    if (mode === "bot") {
      setPot(SB + BB);
      setPlayerChips(5000 - BB);
    }
  }, []);

  // Multijoueur : récupérer l'état du jeu depuis le backend (évite race localStorage + cartes / phase / pot)
  useEffect(() => {
    if (!gameIdParam || !userId) return;
    const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    const base = apiUrl || "";
    const url = `${base}/api/game/${encodeURIComponent(gameIdParam)}?playerId=${encodeURIComponent(userId)}`;
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
        const phase = gameState.phase != null ? (phaseMap[gameState.phase] ?? gameState.phase.toLowerCase?.() ?? "preflop") : "preflop";
        setPhase(phase as GamePhase);
        const cc = gameState.communityCards;
        if (Array.isArray(cc)) {
          const arr: (Card | null)[] = [null, null, null, null, null];
          cc.forEach((c, i) => { if (i < 5 && c && typeof c === "object") arr[i] = normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]); });
          setCommunityCardsState(arr);
        }
        const isPlayingPhase = phase !== "init";
        setGameInitialized(isPlayingPhase);
      })
      .catch((err) => {
        if (!cancelled) console.error("Erreur récupération état partie:", err);
      });
    return () => { cancelled = true; };
  }, [gameIdParam, userId, navigate]);

  // Rejoindre la room socket pour recevoir GAME_UPDATE et TURN_TIMER
  useEffect(() => {
    if (!socket || !gameIdParam || !userId) return;
    socket.emit("JOIN_GAME", { gameId: gameIdParam, playerId: userId });

    const onError = (payload: { code?: string; message?: string }) => {
      if (payload?.code === "GAME_NOT_FOUND") {
        navigate("/lobby", { state: { message: "Partie terminée (adversaire parti ou partie supprimée)." } });
      }
    };
    socket.on("ERROR", onError);
    return () => {
      socket.off("ERROR", onError);
    };
  }, [socket, gameIdParam, userId, navigate]);

  // Appliquer les mises à jour d'état envoyées par le serveur (après une action)
  useEffect(() => {
    if (!socket || !gameIdParam || !userId) return;
    const phaseMap: Record<string, GamePhase> = {
      WAITING: "init",
      PREFLOP: "preflop",
      FLOP: "flop",
      TURN: "turn",
      RIVER: "river",
      SHOWDOWN: "showdown",
      ENDED_OPPONENT_LEFT: "showdown",
    };
    const onGameUpdate = (gameState: { players?: { id: string; name: string; chips: number; currentBet?: number; position?: number; isActive?: boolean; isDealer?: boolean; isConnected?: boolean; cards?: { suit: string; value: string }[] }[]; pot?: number; phase?: string; communityCards?: (Card | null)[]; currentTurn?: string; showdownWinnerId?: string; showdownHandName?: string; showdownPot?: number }) => {
      gameStateFromSocketRef.current = true;
      const players = gameState.players ?? [];
      setPlayersState((prev) => {
        const myCardsFromPrev = prev.find((p) => String(p.id) === String(userId))?.cards ?? [];
        const currentTurnId = gameState.currentTurn != null ? String(gameState.currentTurn) : "";
        const mapped = players.map((p, index) => {
          const isMe = String(p.id) === String(userId);
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
      const cc = gameState.communityCards;
      if (Array.isArray(cc)) {
        const arr: (Card | null)[] = [null, null, null, null, null];
        cc.forEach((c, i) => { if (i < 5 && c && typeof c === "object") arr[i] = normalizeServerCard(c as Parameters<typeof normalizeServerCard>[0]); });
        setCommunityCardsState(arr);
      }
      setGameInitialized(phase !== "init");
      setHasPlayerActed(false);
      setIsLoading(false);
      setRoundPlayersActed(new Set());
      const currentTurnId = gameState.currentTurn != null ? String(gameState.currentTurn) : "";
      if (currentTurnId === String(userId)) {
        setTimerActive(true);
        setTimeLeft(20);
      }
      if (phase === "showdown" && gameState.showdownWinnerId) {
        const winnerName = players.find((p) => String(p.id) === String(gameState.showdownWinnerId))?.name ?? String(gameState.showdownWinnerId);
        setShowdownResult({
          winnerId: gameState.showdownWinnerId,
          winnerName,
          hand: gameState.showdownHandName ?? "—",
          handRank: 0,
          pot: gameState.showdownPot ?? 0,
        });
      }
    };
    socket.on("GAME_UPDATE", onGameUpdate);
    const onGameEnded = (data: { gameId: string; winnerId: string; reason: string; pot?: number }) => {
      if (data.reason === "opponent_left" && String(data.winnerId) === String(userId)) {
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
    return () => {
      socket.off("GAME_UPDATE", onGameUpdate);
      socket.off("GAME_ENDED", onGameEnded);
    };
  }, [socket, gameIdParam, userId]);

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
      setTimeLeft(data.timeLeft);
      setTimerActive(true);
    });
    return () => socket.off("TURN_TIMER");
  }, [socket]);

  const _playPhase = phase === "preflop" || phase === "flop" || phase === "turn" || phase === "river";

  // Forcer l'activation du timer quand c'est le tour du joueur
  useEffect(() => {
    if (!isMyTurn || !gameInitialized || phase === "init" || phase === "shuffle" || phase === "deal") {
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
    setTimeLeft(20);

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

  // Quand c'est le tour du joueur humain, garantir que les boutons sont actifs (sans écraser hasPlayerActed après une action)
  useEffect(() => {
    if (isMyTurn && !hasFoldedFromState && !hasPlayerActed) {
      setIsLoading(false);
      setTimerActive(true);
    }
  }, [isMyTurn, hasFoldedFromState, hasPlayerActed]);

  // Filet de sécurité : si le bot a agi (roundPlayersActed a l'index du bot) mais le joueur actif est encore le bot, forcer le passage au humain
  useEffect(() => {
    if (!isBotMode || playersState.length < 2) return;
    if (phase !== "preflop" && phase !== "flop" && phase !== "turn" && phase !== "river") return;
    const humanIndex = playersState.findIndex((p) => p.id === userId || p.id === "human");
    const botIndex = playersState.findIndex((p) => "isBot" in p && p.isBot);
    if (humanIndex === -1 || botIndex === -1) return;
    const activeIdx = playersState.findIndex((p) => p.isActive);
    const botHasActed = roundPlayersActed.has(botIndex);
    const humanHasActed = roundPlayersActed.has(humanIndex);
    if (botHasActed && !humanHasActed && activeIdx === botIndex) {
      setPlayersState((prev) =>
        prev.map((p, i) => ({ ...p, isActive: i === humanIndex }))
      );
      setHasPlayerActed(false);
      setIsLoading(false);
    }
  }, [isBotMode, playersState, phase, roundPlayersActed]);

  const nextTurn = (justActedIndex?: number) => {
    const idx =
      justActedIndex !== undefined
        ? justActedIndex
        : playersStateRef.current.findIndex((p) => p.isActive);

    if (idx === -1) return;

    setRoundPlayersActed((prev) => new Set(prev).add(idx));

    setPlayersState((prev) => {
      const newPlayers = prev.map((p) => ({ ...p }));
      newPlayers[idx] = { ...newPlayers[idx], isActive: false };

      // Ne pas donner la main à un joueur all-in (0 jetons)
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

      let nextIndex: number;
      if (newPlayers.length === 2) {
        nextIndex = idx === 0 ? 1 : 0;
        const canAct = !(newPlayers[nextIndex].hasFolded ?? false) && (newPlayers[nextIndex].chips ?? 0) > 0;
        if (canAct) {
          newPlayers[nextIndex] = { ...newPlayers[nextIndex], isActive: true };
        }
      } else {
        nextIndex = nextPlayerWithChips((idx + 1) % newPlayers.length);
        if (nextIndex !== -1) {
          newPlayers[nextIndex] = { ...newPlayers[nextIndex], isActive: true };
        }
      }

      return newPlayers;
    });

    setHasPlayerActed(false);
    setIsLoading(false);
  };

  // Vérifier si un tour de mises est terminé (ne pas avancer tant que le joueur humain n'a pas joué)
  useEffect(() => {
    if (phase === "preflop" || phase === "flop" || phase === "turn" || phase === "river") {
      const activeInHand = playersState.filter((p) => p.isConnected !== false && !(p.hasFolded ?? false));
      if (activeInHand.length === 0) return;
      const activeIdx = playersState.findIndex((p) => p.isActive);
      const humanIndex = playersState.findIndex((p) => String(p.id) === String(userId) || p.id === "human");
      const humanInHand = humanIndex >= 0 && !(playersState[humanIndex]?.hasFolded ?? false);

      if (humanInHand && !roundPlayersActed.has(humanIndex)) return;
      if (gameIdParam && activeIdx >= 0 && !("isBot" in playersState[activeIdx] && playersState[activeIdx].isBot) && !roundPlayersActed.has(activeIdx)) return;

      if (activeInHand.length === 1) {
        const t = setTimeout(() => setPhase("showdown"), 1500);
        return () => clearTimeout(t);
      }

      const maxBet = Math.max(0, ...activeInHand.map((p) => p.bet ?? 0));
      // Enchères terminées si tout le monde a égalé OU est all-in (0 jetons)
      const bettingComplete = activeInHand.every((p) => (p.bet ?? 0) === maxBet || (p.chips ?? 0) === 0);
      const hasAllIn = activeInHand.some((p) => (p.chips ?? 0) === 0);

      if (roundPlayersActed.size >= activeInHand.length && bettingComplete) {
        if (hasAllIn && runOutPhase === null && !gameIdParam) {
          // All-in suivi (mode bot) : plus de tour de mise, on run-out le board puis showdown
          setPlayersState((prev) => prev.map((p) => ({ ...p, isActive: false })));
          setRunOutPhase(phase);
        } else if (!hasAllIn) {
          setTimeout(() => {
            if (phase === "preflop") dealFlop();
            else if (phase === "flop") dealTurn();
            else if (phase === "turn") dealRiver();
            else if (phase === "river") setPhase("showdown");
          }, 1000);
        }
      }
    }
  }, [roundPlayersActed, phase, playersState, gameIdParam, userId, runOutPhase]);

  // Réinitialiser le run-out en début de main
  useEffect(() => {
    if (phase === "init" || phase === "shuffle" || phase === "deal") setRunOutPhase(null);
  }, [phase]);

  // Run-out du board après all-in : distribuer Turn/River sans tour de mise, puis showdown
  useEffect(() => {
    if (runOutPhase === null) return;
    const t = setTimeout(() => {
      if (runOutPhase === "preflop") {
        dealFlop(true);
        setRunOutPhase("flop");
      } else if (runOutPhase === "flop") {
        dealTurn(true);
        setRunOutPhase("turn");
      } else if (runOutPhase === "turn") {
        dealRiver(true);
        setRunOutPhase("river");
      } else if (runOutPhase === "river") {
        setPhase("showdown");
        setRunOutPhase(null);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [runOutPhase]);

  // Showdown (2 joueurs) : évaluer les mains et afficher le résultat
  useEffect(() => {
    if (phase !== "showdown" || showdownResult !== null || handResult !== null || !isBotMode || playersState.length < 2) return;
    const activeInHand = playersState.filter((p) => !(p.hasFolded ?? false) && p.cards?.length === 2);
    if (activeInHand.length < 2) return;
    const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
    const url = apiUrl ? `${apiUrl}/api/bot/evaluate-winner` : "/api/bot/evaluate-winner";
    const currentPot = pot;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        players: activeInHand.map((p) => ({ id: p.id, name: p.name, cards: p.cards })),
        communityCards: communityCardsState.filter((c): c is Card => c !== null),
      }),
    })
      .then((res) => res.json())
      .then((data: { winnerId?: string; winnerName?: string; handName?: string; handRank?: number }) => {
        const humanId = playersState.find((p) => p.id === userId || p.id === "human")?.id;
        const won = data.winnerId === humanId || data.winnerId === "human";
        if (won) setPlayerChips((prev) => prev + currentPot);
        else setPlayersState((prev) => prev.map((p) => (p.id === data.winnerId ? { ...p, chips: p.chips + currentPot } : p)));
        setPot(0);
        setShowdownResult({
          winnerId: data.winnerId ?? "",
          winnerName: data.winnerName ?? String(data.winnerId),
          hand: data.handName ?? "Haute carte",
          handRank: data.handRank ?? 0,
          pot: currentPot,
        });
      })
      .catch(() => {
        const fallbackWinner = activeInHand.find((p) => p.id !== userId && p.id !== "human") ?? activeInHand[0];
        setPot(0);
        setShowdownResult({
          winnerId: fallbackWinner?.id ?? "",
          winnerName: fallbackWinner?.name ?? "Inconnu",
          hand: "—",
          handRank: 0,
          pot: currentPot,
        });
        setHandResult("loss");
      });
  }, [phase, showdownResult, handResult, isBotMode, playersState, communityCardsState, pot]);

  useEffect(() => {
    if (!isBotMode || playersState.length === 0) return;
    if (phase === "init" || phase === "shuffle" || phase === "deal") return;
    if (handResult !== null) return;

    const activePlayer = playersState.find((p) => p.isActive);
    if (!activePlayer) return;

    const isBotTurn = "isBot" in activePlayer && activePlayer.isBot;
    if (!isBotTurn || isBotThinking) return;

    setIsBotThinking(true);

    const fetchBotDecision = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
        const url = `${apiUrl ? apiUrl + "/" : ""}api/bot/action`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

        if (!response.ok) {
          await response.text();
          addToast(`Erreur bot (${response.status})`, "error");
          setIsBotThinking(false);
          return;
        }

        const decision = await response.json();

        const botActionLabel =
          decision.action === "FOLD"
            ? "s'est couché"
            : decision.action === "CALL"
              ? "a suivi"
              : decision.action === "CHECK"
                ? "a checké"
                : decision.action === "RAISE"
                  ? "a relancé"
                  : decision.action;
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
            case "CALL":
              handleCall(decision.amount ?? callAmount, activePlayer.id);
              break;
            case "CHECK":
              handleCheck(activePlayer.id);
              break;
            case "RAISE":
              handleRaise(decision.amount ?? callAmount + 20, activePlayer.id);
              break;
          }
          setIsBotThinking(false);
        }, Math.random() * 1000 + 1000);
      } catch (error) {
        console.error("Erreur API bot:", error);
        addToast("Erreur connexion bot", "error");
        setIsBotThinking(false);
      }
    };

    fetchBotDecision();
  }, [isBotMode, playersState, isBotThinking, phase, communityCardsState, pot, callAmount, addToast, handResult]);

  // Après gain/perte : animation puis enregistrement des stats (sans navigation)
  useEffect(() => {
    if (handResult === null) return;
    const t = setTimeout(() => {
      const token = localStorage.getItem("token");
      const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
      const base = apiUrl || "";
      const recordUrl = base ? `${base}/api/game/record-result` : "/api/game/record-result";
      if (token) {
        fetch(recordUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ won: handResult === "win" }),
        }).catch(() => {});
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [handResult]);

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
        setShowdownResult({
          winnerId: String(winner.id),
          winnerName: winner.name,
          hand: "Abandon adverse",
          handRank: 0,
          pot,
        });
      }
      if (humanWon) setPlayerChips((prev) => prev + pot);
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
    nextTurn(justActedIndex);
  };

  const handleCall = (amount: number, playerId?: number | string) => {
    if (handResult !== null) return;
    const hero = playersState.find((p) => p.id === userId || p.id === "human");
    const isHumanActing = playerId === undefined || playerId === hero?.id;
    if (gameIdParam && isHumanActing && !socket) return;
    if (gameIdParam && socket && isHumanActing) {
      socket.emit("PLAYER_ACTION", { gameId: gameIdParam, playerId: String(userId), action: "CALL", amount });
    }
    if (playerId !== undefined && playerId !== hero?.id) {
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, chips: p.chips - amount, bet: (p.bet ?? 0) + amount } : p
        )
      );
    } else {
      setPlayerChips((prev) => prev - amount);
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === userId || p.id === "human"
            ? { ...p, chips: p.chips - amount, bet: (p.bet ?? 0) + amount }
            : p
        )
      );
    }
    setPot((prev) => prev + amount);
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    if (isHumanActing) {
      setHasPlayerActed(true);
      setIsLoading(true);
    }
    nextTurn(justActedIndex);
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
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === playerId
            ? { ...p, chips: p.chips - totalToPut, bet: (p.bet ?? 0) + totalToPut }
            : p
        )
      );
    } else {
      setPlayerChips((prev) => prev - totalToPut);
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === userId || p.id === "human"
            ? { ...p, chips: p.chips - totalToPut, bet: (p.bet ?? 0) + totalToPut }
            : p
        )
      );
    }
    setPot((prev) => prev + totalToPut);
    if (isHumanActing) {
      setHasPlayerActed(true);
      setIsLoading(true);
    }
    const justActedIndex =
      playerId !== undefined
        ? playersState.findIndex((p) => p.id === playerId)
        : playersState.findIndex((p) => p.id === userId || p.id === "human");
    nextTurn(justActedIndex);
  };

  const handleSendMessage = (content: string, type: "emoji" | "text") => {
    const id = Date.now();
    const newMessage: ChatMessage = {
      id: id,
      player: "Vous",
      content: content,
      type: type,
      timestamp: id,
      isLeaving: false,
    };

    setChatMessages((prev) => [...prev, newMessage]);

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

      {/* Showdown : gagnant + combinaison + pot */}
      <ShowdownDisplay
        winner={
          showdownResult
            ? {
                name: showdownResult.winnerName,
                hand: showdownResult.hand,
                pot: showdownResult.pot,
              }
            : null
        }
        onClose={() => {
          if (!showdownResult) return;
          const humanId = playersState.find((p) => p.id === userId || p.id === "human")?.id;
          const won = showdownResult.winnerId === humanId || showdownResult.winnerId === "human";
          const winnerName = showdownResult.winnerName;
          const handName = showdownResult.hand;
          setHandResult(won ? "win" : "loss");
          setShowdownResult(null);
          setTimeout(() => {
            navigate("/hidden-bets-result", {
              state: { winnerName, handName },
            });
          }, 2500);
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
              <span className="text-yellow-400 drop-shadow-sm">🪙</span>
              <span>{playerChips.toLocaleString()}</span>
            </div>

            <button
              onClick={() => {}}
              className={`bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white ${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-full flex items-center justify-center shadow-md transition-all transform hover:scale-105 border border-green-400`}
              title={t('gameHelp.addCredits')}
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
                  navigate("/");
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

      {/* Zone centrale - Table de poker avec cartes communes */}
      <div className={`flex-1 flex items-center justify-center relative ${isMobile ? 'px-2 pt-14' : 'px-6 pt-24'}`}>
        <PokerTable players={tablePlayers} communitySafeZone={230} phase={phase}>
          <CommunityCards cards={communityCards} pot={pot} />
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

      {/* Tableau de bord du joueur - EN BAS */}
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
        timeLeft={timeLeft ?? 20}
        onToggleQuantum={() => setIsQuantumOpen(!isQuantumOpen)}
        onToggleHiddenBets={() => setIsPanelOpen(!isPanelOpen)}
        onToggleChat={() => setIsChatOpen(!isChatOpen)}
        isQuantumOpen={isQuantumOpen}
        isHiddenBetsOpen={isPanelOpen}
        isChatOpen={isChatOpen}
      />

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