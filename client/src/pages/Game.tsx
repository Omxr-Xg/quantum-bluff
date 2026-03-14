import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
import { User, Users, Menu, Loader2, Eye, Plus, MessageCircle, X, LogOut, Palette, Bell, HelpCircle, Sparkles } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { QuantumBluffLogo } from "../assets/logo";
import { useDeviceType } from "../components/ui/use-mobile";

interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
}

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
}

interface BotPlayer extends BasePlayer {
  isBot: true;
  difficulty: "easy" | "medium" | "hard";
}

export function Game() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode");
  const isBotMode = mode === "bot";

  const { socket } = useSocket();
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isQuantumOpen, setIsQuantumOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [hasFolded, setHasFolded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [pot, setPot] = useState(500);
  const [playerChips, setPlayerChips] = useState(7000);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [hasPlayerActed, setHasPlayerActed] = useState(false);
  const [playersState, setPlayersState] = useState<(BasePlayer | BotPlayer)[]>([]);
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showGameHelp, setShowGameHelp] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [currentBet] = useState(0);
  
  // Nouveaux états pour les animations de cartes
  const [phase, setPhase] = useState<GamePhase>("init");
  const [communityCardsState, setCommunityCardsState] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [, setDealingCard] = useState<number | null>(null);
  const [roundPlayersActed, setRoundPlayersActed] = useState<Set<number>>(new Set());
  const [gameInitialized, setGameInitialized] = useState(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Hook d'accessibilité
  const { highContrast, toggleHighContrast, visualAlerts, toggleVisualAlerts, colorblindMode, toggleColorblindMode } = useAccessibility();
  
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

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
          chips: 5000,
          bet: 0,
          position: i,
          isActive: i === 0,
          isDealer: false,
          cards: [],
          isBot: true,
          difficulty: diffMap,
          isConnected: true,
          hasFolded: false,
        });
      }
      bots.push({
        id: count + 1,
        name: "Vous",
        chips: playerChips,
        bet: 0,
        position: count,
        isActive: false,
        isDealer: false,
        cards: [],
        isConnected: true,
        hasFolded: false,
      });
      return bots;
    }
    return [
      { id: 1, name: "Alice", chips: 2500, bet: 100, position: 0, isActive: false, isDealer: false, cards: [], isConnected: true, hasFolded: false },
      { id: 2, name: "Bob", chips: 3200, bet: 100, position: 1, isActive: true, isDealer: false, cards: [], isConnected: true, hasFolded: false },
      { id: 3, name: "Charlie", chips: 1800, bet: 0, position: 2, isActive: false, isDealer: false, cards: [], isConnected: false, hasFolded: false },
      { id: 4, name: "Diana", chips: 4100, bet: 100, position: 3, isActive: false, isDealer: false, cards: [], isConnected: true, hasFolded: false },
      { id: 5, name: "Eve", chips: 2900, bet: 100, position: 4, isActive: false, isDealer: false, cards: [], isConnected: true, hasFolded: false },
      { id: 6, name: "Vous", chips: playerChips, bet: 0, position: 5, isActive: false, isDealer: false, cards: [], isConnected: true, hasFolded: false },
    ];
  };

  // Déclarations dérivées AVANT les useEffect qui les utilisent (évite "Cannot access before initialization")
  const activePlayers = playersState.length > 0 ? playersState : getPlayers();
  const callAmount = 100;
  const tablePlayers = activePlayers.map((player) => {
    const humanPlayer = player.name === "Diana" || player.name === "Vous";
    if (humanPlayer) {
      return { ...player, position: 0, cards: player.cards || [] };
    }
    const otherPlayerIndex = activePlayers.filter((p) => p.name !== "Diana" && p.name !== "Vous").indexOf(player);
    return { ...player, position: otherPlayerIndex + 1 };
  });
  const activePlayer = activePlayers.find((p) => p.isActive);
  const isMyTurn = activePlayer?.name === "Diana" || activePlayer?.name === "Vous";
  const heroCards = tablePlayers.find((p) => p.name === "Diana" || p.name === "Vous")?.cards || [];
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

  // Distribution du flop (3 cartes)
  const dealFlop = () => {
    setPhase("flop");
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
    setRoundPlayersActed(new Set());
  };

  // Distribution du turn (1 carte)
  const dealTurn = () => {
    setPhase("turn");
    const newDeck = [...deck];
    const newCommunityCards = [...communityCardsState];
    
    newDeck.shift();
    
    const card = newDeck.shift();
    if (card) {
      newCommunityCards[3] = card;
      setCommunityCardsState([...newCommunityCards]);
    }
    
    setDeck([...newDeck]);
    setRoundPlayersActed(new Set());
  };

  // Distribution de la river (1 carte)
  const dealRiver = () => {
    setPhase("river");
    const newDeck = [...deck];
    const newCommunityCards = [...communityCardsState];
    
    newDeck.shift();
    
    const card = newDeck.shift();
    if (card) {
      newCommunityCards[4] = card;
      setCommunityCardsState([...newCommunityCards]);
    }
    
    setDeck([...newDeck]);
    setRoundPlayersActed(new Set());
  };

  useEffect(() => {
    const initialPlayers = getPlayers();
    initialPlayers.forEach((p, idx) => {
      p.isActive = idx === 0;
      p.cards = [];
    });
    setPlayersState(initialPlayers);
    setDeck(generateDeck());
  }, []);

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

  const playPhase = phase === "preflop" || phase === "flop" || phase === "turn" || phase === "river";

  useEffect(() => {
    if (typeof isMyTurn === "undefined") return;
    if (!gameInitialized || !playPhase) {
      setTimerActive(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      return;
    }
    if (!isMyTurn) {
      setTimerActive(false);
      setTimeLeft(20);
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
          if (callAmount === 0) handleCheck();
          else handleFold();
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
  }, [isMyTurn, gameInitialized, playPhase]);

  const nextTurn = () => {
    setPlayersState((prevPlayers) => {
      const newPlayers = prevPlayers.map((p) => ({ ...p }));
      const currentIndex = newPlayers.findIndex((p) => p.isActive);

      if (currentIndex !== -1) {
        newPlayers[currentIndex].isActive = false;
        setRoundPlayersActed((prev) => new Set(prev).add(currentIndex));
      }

      let nextIndex = (currentIndex + 1) % newPlayers.length;
      let loopCount = 0;

      while (loopCount < newPlayers.length) {
        const p = newPlayers[nextIndex];
        const connected = p.isConnected !== false;
        const notFolded = !(p.hasFolded ?? false);
        if (connected && notFolded) break;
        nextIndex = (nextIndex + 1) % newPlayers.length;
        loopCount++;
      }

      newPlayers[nextIndex].isActive = true;
      return newPlayers;
    });

    setHasPlayerActed(false);
  };

  // Vérifier si un tour de mises est terminé
  useEffect(() => {
    if (phase === "preflop" || phase === "flop" || phase === "turn" || phase === "river") {
      const activePlayers = playersState.filter(p => p.isConnected);
      
      // Vérifier si tous les joueurs ont joué
      if (roundPlayersActed.size >= activePlayers.length) {
        // Tour terminé, passer à la phase suivante
        setTimeout(() => {
          if (phase === "preflop") {
            dealFlop();
          } else if (phase === "flop") {
            dealTurn();
          } else if (phase === "turn") {
            dealRiver();
          } else if (phase === "river") {
            setPhase("showdown");
          }
        }, 1000);
      }
    }
  }, [roundPlayersActed, phase, playersState]);

  useEffect(() => {
    if (!isBotMode || playersState.length === 0) return;
    if (phase === "init" || phase === "shuffle" || phase === "deal") return;

    const activePlayer = playersState.find((p) => p.isActive);
    if (!activePlayer) return;

    const isBotTurn = "isBot" in activePlayer && activePlayer.isBot;
    if (!isBotTurn || isBotThinking) return;

    setIsBotThinking(true);

    const fetchBotDecision = async () => {
      try {
        const apiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
        const response = await fetch(`${apiUrl ? apiUrl + "/" : ""}api/bot/action`, {
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

        const decision = await response.json();

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
        setIsBotThinking(false);
      }
    };

    fetchBotDecision();
  }, [isBotMode, playersState, isBotThinking, phase, communityCardsState, pot, callAmount]);

  const handleFold = (playerId?: number | string) => {
    const heroId = playersState.find((p) => p.name === "Vous" || p.name === "Diana")?.id;
    const isHuman = playerId === undefined || playerId === heroId;

    setPlayersState((prev) =>
      prev.map((p) => {
        if (p.id === playerId || (isHuman && (p.name === "Vous" || p.name === "Diana"))) {
          return { ...p, hasFolded: true };
        }
        return p;
      })
    );
    if (isHuman) setHasFolded(true);
    setHasPlayerActed(true);
    setTimeout(() => nextTurn(), 500);
  };

  const handleCheck = (_playerId?: number | string) => {
    setHasPlayerActed(true);
    setTimeout(() => nextTurn(), 500);
  };

  const handleCall = (amount: number, playerId?: number | string) => {
    const hero = playersState.find((p) => p.name === "Vous" || p.name === "Diana");
    if (playerId !== undefined && playerId !== hero?.id) {
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, chips: p.chips - amount, bet: (p.bet ?? 0) + amount } : p
        )
      );
    } else {
      setPlayerChips((prev) => prev - amount);
    }
    setPot((prev) => prev + amount);
    setHasPlayerActed(true);
    setTimeout(() => nextTurn(), 500);
  };

  const handleRaise = (amount: number, playerId?: number | string) => {
    const hero = playersState.find((p) => p.name === "Vous" || p.name === "Diana");
    if (playerId !== undefined && playerId !== hero?.id) {
      setPlayersState((prev) =>
        prev.map((p) =>
          p.id === playerId ? { ...p, chips: p.chips - amount, bet: (p.bet ?? 0) + amount } : p
        )
      );
    } else {
      setPlayerChips((prev) => prev - amount);
    }
    setPot((prev) => prev + amount);
    setHasPlayerActed(true);
    setTimeout(() => nextTurn(), 500);
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
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>Profil</span>
                </button>
                <button
                  onClick={() => {
                    navigate("/friends");
                    setShowMenu(false);
                  }}
                  className={`w-full flex items-center ${isMobile ? 'gap-2 px-4 py-3' : 'gap-3 px-6 py-4'} text-white hover:bg-slate-700 transition-all`}
                >
                  <Users className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                  <span className={`${isMobile ? 'text-sm' : ''} font-semibold`}>Amis</span>
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
              {getPlayerAvatar("Diana") ? (
                <ImageWithFallback
                  src={getPlayerAvatar("Diana")}
                  alt="Avatar du joueur"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-bold text-xl">D</span>
              )}
            </div>
          )}

          {/* Nom du joueur et ID */}
          {!isMobile && (
            <div className="flex flex-col">
              <div className="text-white font-bold text-lg leading-tight">
                Diana
              </div>
              <div className="text-gray-400 text-xs font-medium">
                ID 4857
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
              onClick={() => console.log("Ajouter de l'argent")}
              className={`bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white ${isMobile ? 'w-7 h-7' : 'w-8 h-8'} rounded-full flex items-center justify-center shadow-md transition-all transform hover:scale-105 border border-green-400`}
              title="Ajouter des crédits"
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
                Annuler
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
        <PokerTable players={tablePlayers} communitySafeZone={230}>
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
        name="Diana"
        chips={playerChips}
        cards={heroCards}
        onFold={() => handleFold()}
        onCall={(amount) => handleCall(amount)}
        onRaise={(amount) => handleRaise(amount)}
        onCheck={() => handleCheck()}
        callAmount={callAmount}
        minRaise={50}
        maxRaise={playerChips}
        isMyTurn={isMyTurn}
        hasFolded={hasFolded}
        hasActed={hasPlayerActed}
        waitingForPlayer={!isMyTurn && !hasFolded ? activePlayer?.name : undefined}
        timeLeft={timeLeft}
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
                  <li><strong className="text-red-400">Coucher (Fold)</strong> : Abandonner le coup en cours</li>
                  <li><strong className="text-blue-400">Suivre (Call)</strong> : Égaler la mise actuelle</li>
                  <li><strong className="text-green-400">Relancer (Raise)</strong> : Augmenter la mise</li>
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