import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "./SocketContext";

interface HiddenBet {
  id: string;
  playerName: string;
  playerId: string;
  betType: "winner" | "combination";
  betChoice: string;
  amount: number;
  odds: number;
  won?: boolean;
  winAmount?: number;
}

interface HiddenBetsContextType {
  bets: HiddenBet[];
  placeBet: (
    bet: Omit<HiddenBet, "id" | "odds" | "won" | "winAmount">
  ) => Promise<void>;
  isOpen: boolean;
  togglePanel: () => void;
  totalBets: number;
  totalAmount: number;
}

const HiddenBetsContext = createContext<HiddenBetsContextType | undefined>(
  undefined
);

export const HiddenBetsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bets, setBets] = useState<HiddenBet[]>([]);
  const { socket } = useSocket();
  const navigate = useNavigate();

  useEffect(() => {
    if (!socket) return;

    const handlePlaced = (bet: HiddenBet) => {
      setBets((prev) => [...prev, bet]);
    };

    const handleResults = (results: HiddenBet[]) => {
      setBets(results);
      navigate("/hidden-bets-result");
    };

    socket.on("BET_PLACED", handlePlaced);
    socket.on("BET_RESULTS", handleResults);

    return () => {
      socket.off("BET_PLACED", handlePlaced);
      socket.off("BET_RESULTS", handleResults);
    };
  }, [socket, navigate]);

  const placeBet = async (
    bet: Omit<HiddenBet, "id" | "odds" | "won" | "winAmount">
  ): Promise<void> => {
    return new Promise((resolve) => {
      const odds = bet.betType === "winner" ? 2.5 : 5.0;

      const newBet: HiddenBet = {
        ...bet,
        id: `bet_${Date.now()}`,
        odds,
        won: undefined,
        winAmount: undefined,
      };

      setBets((prev) => [...prev, newBet]);

      if (socket) {
        socket.emit("PLACE_BET", newBet);
      }

      setTimeout(resolve, 500);
    });
  };

  const togglePanel = () => setIsOpen((prev) => !prev);

  const totalBets = bets.length;
  const totalAmount = bets.reduce((sum, bet) => sum + bet.amount, 0);

  return (
    <HiddenBetsContext.Provider
      value={{ bets, placeBet, isOpen, togglePanel, totalBets, totalAmount }}
    >
      {children}
    </HiddenBetsContext.Provider>
  );
};

export const useHiddenBets = (): HiddenBetsContextType => {
  const context = useContext(HiddenBetsContext);
  if (!context) {
    throw new Error("useHiddenBets must be used within HiddenBetsProvider");
  }
  return context;
};

