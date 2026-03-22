import { createContext, useContext, useCallback, useRef, ReactNode } from "react";

interface AccessibilityMenuOpenContextType {
  registerOpener: (open: (() => void) | null) => void;
  openAccessibilityMenu: () => void;
}

const AccessibilityMenuOpenContext = createContext<AccessibilityMenuOpenContextType | undefined>(undefined);

export function AccessibilityMenuOpenProvider({ children }: { children: ReactNode }) {
  const openerRef = useRef<(() => void) | null>(null);

  const registerOpener = useCallback((open: (() => void) | null) => {
    openerRef.current = open;
  }, []);

  const openAccessibilityMenu = useCallback(() => {
    openerRef.current?.();
  }, []);

  return (
    <AccessibilityMenuOpenContext.Provider value={{ registerOpener, openAccessibilityMenu }}>
      {children}
    </AccessibilityMenuOpenContext.Provider>
  );
}

export function useAccessibilityMenuOpen() {
  const context = useContext(AccessibilityMenuOpenContext);
  return context;
}
