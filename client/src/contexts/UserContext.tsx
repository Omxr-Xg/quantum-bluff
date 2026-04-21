import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserContextType {
  userId: string | null;
  username: string | null;
  chips: number;
  /** Jeton console admin (login /auth/admin). */
  isAdmin: boolean;
  setChips: (value: number) => void;
  addChips: (amount: number) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

function readFromStorage() {
  const rawUserId = localStorage.getItem("userId") ?? localStorage.getItem("userid");
  const rawUsername = localStorage.getItem("username");
  return {
    userId: rawUserId && rawUserId !== "undefined" && rawUserId !== "null" ? rawUserId : null,
    username: rawUsername && rawUsername !== "undefined" && rawUsername !== "null" ? rawUsername : null,
    isAdmin: localStorage.getItem("role") === "admin",
  };
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [userId, setUserId] = useState<string | null>(() => readFromStorage().userId);
  const [username, setUsername] = useState<string | null>(() => readFromStorage().username);
  const [isAdmin, setIsAdmin] = useState<boolean>(() => readFromStorage().isAdmin);
  const [chips, setChips] = useState<number>(() => {
    const stored = localStorage.getItem("chips");
    return stored ? Number(stored) : 1000;
  });

  useEffect(() => {
    const handleAuthChanged = () => {
      const { userId: newUserId, username: newUsername, isAdmin: nextAdmin } = readFromStorage();
      setUserId(newUserId);
      setUsername(newUsername);
      setIsAdmin(nextAdmin);
    };
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => window.removeEventListener("auth-changed", handleAuthChanged);
  }, []);

  useEffect(() => {
    localStorage.setItem("chips", String(chips));
  }, [chips]);

  const addChips = (amount: number) => {
    setChips((prev) => prev + amount);
  };

  return (
    <UserContext.Provider value={{ userId, username, chips, isAdmin, setChips, addChips }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
