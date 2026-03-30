import React, { createContext, useContext } from "react";

/** @deprecated Les paris cachés sont gérés côté serveur ; ce contexte conserve une API minimale pour les anciennes pages. */
export interface HiddenBet {
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
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  setBetsResults: (results: HiddenBet[]) => void;
}

const HiddenBetsContext = createContext<HiddenBetsContextType | undefined>(
  undefined
);

export const HiddenBetsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const noop = () => {};
  return (
    <HiddenBetsContext.Provider
      value={{
        bets: [],
        placeBet: async () => {},
        isOpen: false,
        togglePanel: noop,
        totalBets: 0,
        totalAmount: 0,
        showResults: false,
        setShowResults: noop,
        setBetsResults: noop,
      }}
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
