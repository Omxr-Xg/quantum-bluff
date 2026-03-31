import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserContextType {
  userId: string | null;
  username: string | null;
  chips: number;
  setChips: (value: number) => void;
  addChips: (amount: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  // USER INFO
  const rawUserId =
    localStorage.getItem("userId") ?? localStorage.getItem("userid");
  const rawUsername = localStorage.getItem("username");

  const userId =
    rawUserId && rawUserId !== "undefined" && rawUserId !== "null"
      ? rawUserId
      : null;

  const username =
    rawUsername && rawUsername !== "undefined" && rawUsername !== "null"
      ? rawUsername
      : null;

  // CHIPS STATE (GLOBAL)
  const [chips, setChips] = useState<number>(() => {
    const stored = localStorage.getItem("chips");
    return stored ? Number(stored) : 1000;
  });

  // PERSIST TO LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem("chips", String(chips));
  }, [chips]);

  // SAFE ADD (IMPORTANT)
  const addChips = (amount: number) => {
    setChips((prev) => prev + amount);
  };

  return (
    <UserContext.Provider
      value={{
        userId,
        username,
        chips,
        setChips,
        addChips,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

// CUSTOM HOOK
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};