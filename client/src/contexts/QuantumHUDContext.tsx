import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSocket } from "../hooks/useSocket";

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

const RANK_ORDER = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const SUITS = ["hearts","diamonds","clubs","spades"];

function rankIndex(v: string): number {
  const i = RANK_ORDER.indexOf(v);
  return i === -1 ? 0 : i;
}

function evalCategory(allValues: number[]): number {
  const counts = new Map<number, number>();
  for (const v of allValues) counts.set(v, (counts.get(v) ?? 0) + 1);
  const groups = Array.from(counts.entries())
    .map(([r, c]) => ({ r, c }))
    .sort((a, b) => b.c - a.c || b.r - a.r);

  const uniq = Array.from(new Set(allValues)).sort((a, b) => b - a);
  if (uniq.includes(14)) uniq.push(1);
  let run = 1, hasStraight = false;
  for (let i = 0; i < uniq.length - 1; i++) {
    if (uniq[i] - 1 === uniq[i + 1]) { run++; if (run >= 5) { hasStraight = true; break; } }
    else run = 1;
  }

  if (groups[0]?.c === 4) return 7;
  if (groups[0]?.c === 3 && groups[1]?.c >= 2) return 6;
  if (hasStraight) return 4;
  if (groups[0]?.c === 3) return 3;
  if (groups[0]?.c === 2 && groups[1]?.c === 2) return 2;
  if (groups[0]?.c === 2) return 1;
  return 0;
}

const HAND_KEYS = [
  "highCard", "pair", "twoPair", "threeKind", "straight",
  "flush", "fullHouse", "fourKind", "straightFlush"
];

function estimateWinProbability(
  playerCards: { suit: string; value: string }[],
  communityCards: ({ suit: string; value: string } | null)[],
  opponentCount: number
): { winProb: number; currentHand: string; probabilities: HandProbability[] } {
  if (playerCards.length < 2) {
    return { winProb: 0, currentHand: "", probabilities: [] };
  }

  const pCards = playerCards.map(c => ({ s: c.suit, v: rankIndex(c.value) + 2 }));
  const cCards = communityCards
    .filter((c): c is { suit: string; value: string } => c !== null)
    .map(c => ({ s: c.suit, v: rankIndex(c.value) + 2 }));

  const allKnown = [...pCards, ...cCards];
  const allValues = allKnown.map(c => c.v);

  const suitCounts = new Map<string, number>();
  for (const c of allKnown) suitCounts.set(c.s, (suitCounts.get(c.s) ?? 0) + 1);
  const hasFlush = Array.from(suitCounts.values()).some(v => v >= 5);

  let cat = evalCategory(allValues);
  if (hasFlush && cat < 5) cat = 5;

  const currentHand = HAND_KEYS[cat] ?? "highCard";

  const communityCount = cCards.length;
  const cardsTocome = 5 - communityCount;

  let baseStrength = cat / 8;
  const highCard = Math.max(...pCards.map(c => c.v));
  baseStrength += (highCard / 14) * 0.15;
  const hasPocket = pCards[0].v === pCards[1].v;
  if (hasPocket) baseStrength += 0.1;

  baseStrength += cardsTocome * 0.02;
  const oppPenalty = (opponentCount - 1) * 0.08;
  let winProb = Math.max(0.02, Math.min(0.98, baseStrength - oppPenalty));

  if (communityCount === 0) {
    if (hasPocket) winProb = Math.max(winProb, 0.55 + (pCards[0].v / 14) * 0.3);
    else if (highCard >= 12) winProb = Math.max(winProb, 0.45);
    else winProb = Math.min(winProb, 0.5);
  }

  const probabilities: HandProbability[] = HAND_KEYS.map((handKey, i) => {
    let prob = 0;
    if (i <= cat) prob = i === cat ? 1 : 0;
    else {
      const diff = i - cat;
      prob = Math.max(0, (cardsTocome * 0.08) / (diff * diff));
    }
    return {
      handKey,
      probability: Math.min(1, prob),
      descriptionType: i <= cat ? 'acquired' : 'chance',
      probPercent: i <= cat ? undefined : Math.round(prob * 100)
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
