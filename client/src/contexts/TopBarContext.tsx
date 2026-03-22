import { createContext, useContext, type ReactNode } from "react";

interface TopBarContextValue {
  menuContent: ReactNode | null;
}

const TopBarContext = createContext<TopBarContextValue>({ menuContent: null });

export function TopBarProvider({ children, menuContent }: { children: ReactNode; menuContent: ReactNode | null }) {
  return (
    <TopBarContext.Provider value={{ menuContent }}>
      {children}
    </TopBarContext.Provider>
  );
}

export function useTopBar() {
  return useContext(TopBarContext);
}
