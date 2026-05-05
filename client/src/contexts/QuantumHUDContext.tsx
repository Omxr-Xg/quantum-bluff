import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSocket } from "../hooks/useSocket";
import { getHandCategoryIndex } from "../utils/pokerHandCategory";
import {
  estimateEquityMonteCarlo,
  MONTE_CARLO_DEFAULT_ITERATIONS,
} from "../utils/pokerMonteCarloEquity";

export interface HandProbability {
  handKey: string;
  probability: number;
  descriptionType: 'acquired' | 'chance';
  probPercent?: number;
}

interface QuantumHUDContextType {
  probabilities: HandProbability[];
  isOpen: boolean;
  toggleHUD: () => void;
  currentHand: string | null; // handKey
  winProbability: number;
  updateFromCards: (
    playerCards: { suit: string; value: string }[],
    communityCards: ({ suit: string; value: string } | null)[],
    opponentCount: number
  ) => void;
}

const QuantumHUDContext = createContext<QuantumHUDContextType | undefined>(undefined);

/** Indices = catégories serveur (0–9), du plus faible au plus fort. */
const HAND_KEYS = [
  "highCard",
  "pair",
  "twoPair",
  "threeKind",
  "straight",
  "flush",
  "quantumCombi",
  "fullHouse",
  "fourKind",
  "straightFlush",
];

/** Monte Carlo : équité au showdown + distribution des catégories finales (évaluateur serveur). */
function estimateWinProbability(
  playerCards: { suit: string; value: string }[],
  communityCards: ({ suit: string; value: string } | null)[],
  opponentCount: number
): { winProb: number; currentHand: string; probabilities: HandProbability[] } {
  if (playerCards.length < 2) {
    return { winProb: 0, currentHand: "", probabilities: [] };
  }

  const cat = getHandCategoryIndex(playerCards, communityCards);
  const currentHand = HAND_KEYS[cat] ?? "highCard";

  const mc = estimateEquityMonteCarlo(
    playerCards,
    communityCards,
    opponentCount,
    MONTE_CARLO_DEFAULT_ITERATIONS,
  );
  const it = mc.iterations;
  const winProb = it > 0 ? mc.equity : 0;

  const probabilities: HandProbability[] = HAND_KEYS.map((handKey, i) => {
    const p = it > 0 ? mc.categoryCounts[i] / it : 0;
    return {
      handKey,
      probability: p,
      descriptionType: i === cat ? "acquired" : "chance",
      probPercent: i === cat ? undefined : Math.round(p * 100),
    };
  });

  return { winProb, currentHand, probabilities };
}

export const QuantumHUDProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [probabilities, setProbabilities] = useState<HandProbability[]>([]);
  const [currentHand, setCurrentHand] = useState<string | null>(null);
  const [winProbability, setWinProbability] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    const handler = (data: {
      probabilities?: HandProbability[];
      currentHand?: string;
      winProbability?: number;
    }) => {
      setProbabilities(data.probabilities ?? []);
      setCurrentHand(data.currentHand ?? null);
      setWinProbability(typeof data.winProbability === "number" ? data.winProbability : 0);
    };
    socket.on("PROBABILITY_UPDATE", handler);
    return () => { socket.off("PROBABILITY_UPDATE", handler); };
  }, [socket]);

  const updateFromCards = useCallback(
    (
      playerCards: { suit: string; value: string }[],
      communityCards: ({ suit: string; value: string } | null)[],
      opponentCount: number
    ) => {
      const { winProb, currentHand: hand, probabilities: probs } = estimateWinProbability(
        playerCards, communityCards, opponentCount
      );
      setWinProbability(winProb);
      setCurrentHand(hand);
      setProbabilities(probs);
    },
    []
  );

  const toggleHUD = () => setIsOpen((prev) => !prev);

  return (
    <QuantumHUDContext.Provider
      value={{ probabilities, isOpen, toggleHUD, currentHand, winProbability, updateFromCards }}
    >
      {children}
    </QuantumHUDContext.Provider>
  );
};

export const useQuantumHUD = (): QuantumHUDContextType => {
  const context = useContext(QuantumHUDContext);
  if (!context) {
    throw new Error("useQuantumHUD must be used within QuantumHUDProvider");
  }
  return context;
};
