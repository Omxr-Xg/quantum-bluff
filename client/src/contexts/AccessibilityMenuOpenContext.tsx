import {
  createContext,
  useContext,
  useCallback,
  useRef,
  ReactNode,
} from "react";

export type SettingsTab = "aesthetic" | "accessibility";

interface AccessibilityMenuOpenContextType {
  registerOpener: (open: ((tab?: SettingsTab) => void) | null) => void;
  /** Ouvre le panneau Paramètres ; onglet par défaut : esthétique. */
  openSettingsMenu: (tab?: SettingsTab) => void;
  /** @deprecated Utiliser `openSettingsMenu('accessibility')` */
  openAccessibilityMenu: () => void;
}

const AccessibilityMenuOpenContext = createContext<
  AccessibilityMenuOpenContextType | undefined
>(undefined);

export function AccessibilityMenuOpenProvider({
  children,
}: {
  children: ReactNode;
}) {
  const openerRef = useRef<((tab?: SettingsTab) => void) | null>(null);

  const registerOpener = useCallback(
    (open: ((tab?: SettingsTab) => void) | null) => {
      openerRef.current = open;
    },
    []
  );

  const openSettingsMenu = useCallback((tab?: SettingsTab) => {
    openerRef.current?.(tab);
  }, []);

  const openAccessibilityMenu = useCallback(() => {
    openerRef.current?.("accessibility");
  }, []);

  return (
    <AccessibilityMenuOpenContext.Provider
      value={{ registerOpener, openSettingsMenu, openAccessibilityMenu }}
    >
      {children}
    </AccessibilityMenuOpenContext.Provider>
  );
}

export function useAccessibilityMenuOpen() {
  return useContext(AccessibilityMenuOpenContext);
}
