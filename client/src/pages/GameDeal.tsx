import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { PokerTable } from "../components/PokerTable";
import { Sparkles, ArrowRight } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";
import { ChipIcon } from "../components/ChipIcon";

interface Card {
  suit: "hearts" | "diamonds" | "clubs" | "spades";
  value: string;
}

interface Player {
  id: number;
  name: string;
  chips: number;
  bet: number;
  position: number;
  isActive: boolean;
  isDealer?: boolean;
  cards: Card[];
  isConnected: boolean;
}

type GamePhase = "init" | "shuffle" | "deal" | "flop" | "turn" | "river" | "complete";

export function GameDeal() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<GamePhase>("init");
  const [communityCards, setCommunityCards] = useState<(Card | null)[]>([null, null, null, null, null]);
  const [_dealingCard, setDealingCard] = useState<number | null>(null);
  const [shuffleCount, setShuffleCount] = useState(0);

  // Générer un jeu de cartes complet
  const generateDeck = (): Card[] => {
    const suits: Array<"hearts" | "diamonds" | "clubs" | "spades"> = ["hearts", "diamonds", "clubs", "spades"];
    const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
    const deck: Card[] = [];
    
    for (const suit of suits) {
      for (const value of values) {
        deck.push({ suit, value });
      }
    }
    
    return deck.sort(() => Math.random() - 0.5);
  };

  // Joueurs à la table
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: "Alice", chips: 2500, bet: 100, position: 1, isActive: false, isDealer: false, cards: [], isConnected: true },
    { id: 2, name: "Bob", chips: 3200, bet: 100, position: 2, isActive: false, isDealer: false, cards: [], isConnected: true },
    { id: 3, name: "Charlie", chips: 1800, bet: 100, position: 3, isActive: false, isDealer: false, cards: [], isConnected: true },
    { id: 4, name: "Diana", chips: 4100, bet: 100, position: 4, isActive: false, isDealer: false, cards: [], isConnected: true },
    { id: 5, name: "Eve", chips: 2900, bet: 100, position: 5, isActive: false, isDealer: false, cards: [], isConnected: true },
    { id: 6, name: "Vous", chips: 5000, bet: 100, position: 0, isActive: false, isDealer: false, cards: [], isConnected: true },
  ]);

  const [deck, setDeck] = useState<Card[]>(generateDeck());

  // Animation de shuffle
  const performShuffle = () => {
    setPhase("shuffle");
    setShuffleCount(0);
    
    const shuffleInterval = setInterval(() => {
      setShuffleCount(prev => {
        if (prev >= 8) {
          clearInterval(shuffleInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 150);

    setTimeout(() => {
      setPhase("deal");
      dealCardsToPlayers();
    }, 1500);
  };

  // Distribution des cartes aux joueurs
  const dealCardsToPlayers = () => {
    const newDeck = [...deck];
    const updatedPlayers = [...players];
    
    // Distribuer 2 cartes à chaque joueur avec animation
    let cardIndex = 0;
    const dealInterval = setInterval(() => {
      const playerIndex = Math.floor(cardIndex / 2);
      const _cardRound = cardIndex % 2;
      
      if (playerIndex >= updatedPlayers.length) {
        clearInterval(dealInterval);
        setPhase("flop");
        return;
      }
      
      const card = newDeck.shift();
      if (card) {
        updatedPlayers[playerIndex].cards.push(card);
        setPlayers([...updatedPlayers]);
        setDeck([...newDeck]);
        setDealingCard(cardIndex);
        
        setTimeout(() => setDealingCard(null), 400);
      }
      
      cardIndex++;
    }, 200);
  };

  // Distribution du flop (3 cartes)
  const dealFlop = () => {
    const newDeck = [...deck];
    const newCommunityCards = [...communityCards];
    
    // Burn une carte
    newDeck.shift();
    
    // Distribuer 3 cartes
    for (let i = 0; i < 3; i++) {
      const card = newDeck.shift();
      if (card) {
        setTimeout(() => {
          newCommunityCards[i] = card;
          setCommunityCards([...newCommunityCards]);
        }, i * 300);
      }
    }
    
    setDeck([...newDeck]);
    
    setTimeout(() => {
      setPhase("turn");
    }, 1000);
  };

  // Distribution du turn (1 carte)
  const dealTurn = () => {
    const newDeck = [...deck];
    const newCommunityCards = [...communityCards];
    
    // Burn une carte
    newDeck.shift();
    
    // Distribuer 1 carte
    const card = newDeck.shift();
    if (card) {
      newCommunityCards[3] = card;
      setCommunityCards([...newCommunityCards]);
    }
    
    setDeck([...newDeck]);
    setPhase("river");
  };

  // Distribution de la river (1 carte)
  const dealRiver = () => {
    const newDeck = [...deck];
    const newCommunityCards = [...communityCards];
    
    // Burn une carte
    newDeck.shift();
    
    // Distribuer 1 carte
    const card = newDeck.shift();
    if (card) {
      newCommunityCards[4] = card;
      setCommunityCards([...newCommunityCards]);
    }
    
    setDeck([...newDeck]);
    setPhase("complete");
  };

  // Gérer le bouton Next
  const handleNext = () => {
    switch (phase) {
      case "init":
        performShuffle();
        break;
      case "flop":
        dealFlop();
        break;
      case "turn":
        dealTurn();
        break;
      case "river":
        dealRiver();
        break;
      case "complete":
        // Recommencer ou revenir au lobby
        navigate("/lobby");
        break;
    }
  };

  const getSuitSymbol = (suit: string) => {
    const suits: { [key: string]: string } = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    };
    return suits[suit] || "";
  };

  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-slate-900";
  };

  const getPhaseText = () => {
    switch (phase) {
      case "init":
        return t('gameDeal.readyToStart');
      case "shuffle":
        return "Mélange des cartes...";
      case "deal":
        return "Distribution en cours...";
      case "flop":
        return "Flop";
      case "turn":
        return "Turn";
      case "river":
        return "River";
      case "complete":
        return "Distribution terminée";
      default:
        return "";
    }
  };

  const getButtonText = () => {
    switch (phase) {
      case "init":
        return "Commencer";
      case "flop":
        return "Flop";
      case "turn":
        return "Turn";
      case "river":
        return "River";
      case "complete":
        return t('gameDeal.backToLobby');
      default:
        return "Next";
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden relative">
      {/* Particules dorées flottantes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-500/30 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [null, Math.random() * window.innerHeight],
              x: [null, Math.random() * window.innerWidth],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* En-tête avec logo */}
      <div className="absolute top-4 left-8 right-8 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QuantumBluffLogo 
            className="w-12 h-12 drop-shadow-2xl"
          />
          <div className="text-white">
            <h1 className="font-bold text-xl">Quantum Bluff</h1>
            <p className="text-sm text-gray-400">{getPhaseText()}</p>
          </div>
        </div>
      </div>

      {/* Animation du dealer au centre */}
      <AnimatePresence>
        {phase === "shuffle" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40"
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
                  Shuffling...
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zone centrale - Table de poker */}
      <div className="flex-1 flex items-center justify-center relative px-6 pt-24">
        <PokerTable players={players} communitySafeZone={230}>
          {/* Cartes communes au centre de la table */}
          <div className="flex gap-3 items-center justify-center">
            {communityCards.map((card, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0, rotateY: 180, opacity: 0 }}
                animate={card ? { 
                  scale: 1, 
                  rotateY: 0, 
                  opacity: 1 
                } : {}}
                transition={{ 
                  duration: 0.5, 
                  ease: "easeOut",
                  type: "spring",
                  stiffness: 200,
                }}
                className={`${
                  card
                    ? "bg-white border-2 border-gray-300"
                    : "bg-slate-700/30 border-2 border-slate-600/50"
                } w-20 h-28 rounded-lg shadow-xl flex flex-col items-center justify-center backdrop-blur-sm`}
              >
                {card ? (
                  <>
                    <div
                      className={`text-3xl font-bold ${getSuitColor(card.suit)}`}
                    >
                      {card.value}
                    </div>
                    <div
                      className={`text-4xl ${getSuitColor(card.suit)}`}
                    >
                      {getSuitSymbol(card.suit)}
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500 text-4xl">?</div>
                )}
              </motion.div>
            ))}
          </div>
        </PokerTable>
      </div>

      {/* Bouton Next au centre-bas */}
      {(phase === "init" || phase === "flop" || phase === "turn" || phase === "river" || phase === "complete") && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50"
        >
          <button
            onClick={handleNext}
            className="relative group"
          >
            {/* Fond avec effet glass et gradient doré */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 via-yellow-600/30 to-yellow-700/20 rounded-2xl backdrop-blur-xl border-2 border-yellow-500/40 shadow-2xl group-hover:shadow-yellow-500/50 transition-all duration-300"></div>
            
            {/* Effet de brillance animé */}
            <motion.div
              className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              animate={{
                background: [
                  "radial-gradient(circle at 0% 0%, rgba(250, 204, 21, 0.3) 0%, transparent 50%)",
                  "radial-gradient(circle at 100% 100%, rgba(250, 204, 21, 0.3) 0%, transparent 50%)",
                  "radial-gradient(circle at 0% 0%, rgba(250, 204, 21, 0.3) 0%, transparent 50%)",
                ],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "linear",
              }}
            />

            {/* Contenu du bouton */}
            <div className="relative px-12 py-6 flex items-center gap-4">
              <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
              <span className="text-white font-bold text-2xl tracking-wide drop-shadow-lg">
                {getButtonText()}
              </span>
              <ArrowRight className="w-6 h-6 text-yellow-400 group-hover:translate-x-1 transition-transform" />
            </div>

            {/* Particules autour du bouton */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                style={{
                  left: `${50 + Math.cos((i * Math.PI * 2) / 6) * 120}px`,
                  top: `${50 + Math.sin((i * Math.PI * 2) / 6) * 40}px`,
                }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </button>
        </motion.div>
      )}

      {/* Pot au centre */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="absolute top-32 left-1/2 transform -translate-x-1/2 z-30"
      >
        <div className="bg-slate-800/90 backdrop-blur-sm border-2 border-yellow-500/50 rounded-2xl px-8 py-4 shadow-2xl">
          <div className="text-center">
            <p className="text-gray-400 text-sm font-semibold mb-1">POT</p>
            <p className="text-yellow-400 text-3xl font-bold drop-shadow-lg">
              {players.reduce((sum, p) => sum + p.bet, 0).toLocaleString()} <ChipIcon size="sm" className="inline-block align-middle ml-1" />
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}