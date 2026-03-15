import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./SocketContext";

interface HandProbability {
  hand: string;
  probability: number; // 0–1
  description: string;
}

interface QuantumHUDContextType {
  probabilities: HandProbability[];
  isOpen: boolean;
  toggleHUD: () => void;
  currentHand: string | null;
  winProbability: number; // 0–1
}

const QuantumHUDContext = createContext<QuantumHUDContextType | undefined>(undefined);

export const QuantumHUDProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [probabilities, setProbabilities] = useState<HandProbability[]>([]);
  const [currentHand, setCurrentHand] = useState<string | null>(null);
  const [winProbability, setWinProbability] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handler = (data: {
      probabilities: HandProbability[];
      currentHand: string;
      winProbability: number;
    }) => {
      setProbabilities(data.probabilities ?? []);
      setCurrentHand(data.currentHand ?? null);
      setWinProbability(typeof data.winProbability === "number" ? data.winProbability : 0);
    };

    socket.on("PROBABILITY_UPDATE", handler);

    return () => {
      socket.off("PROBABILITY_UPDATE", handler);
    };
  }, [socket]);

  const toggleHUD = () => setIsOpen((prev) => !prev);

  return (
    <QuantumHUDContext.Provider
      value={{ probabilities, isOpen, toggleHUD, currentHand, winProbability }}
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

