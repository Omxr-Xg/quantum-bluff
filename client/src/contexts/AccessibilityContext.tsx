import { createContext, useContext, useState, useEffect, useLayoutEffect, ReactNode } from "react";

interface AccessibilityContextType {
  highContrast: boolean;
  toggleHighContrast: () => void;
  visualAlerts: boolean;
  toggleVisualAlerts: () => void;
  colorblindMode: boolean;
  toggleColorblindMode: () => void;
  // NOUVEAU : Ajout du type de daltonisme
  colorblindType: string;
  setColorblindType: (type: string) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem("highContrast");
    return saved === "true";
  });

  const [visualAlerts, setVisualAlerts] = useState(() => {
    const saved = localStorage.getItem("visualAlerts");
    return saved !== "false";
  });

  const [colorblindMode, setColorblindMode] = useState(() => {
    const saved = localStorage.getItem("colorblindMode");
    return saved === "true";
  });

  // NOUVEAU : État pour le type de filtre
  const [colorblindType, setColorblindType] = useState(() => {
    const saved = localStorage.getItem("colorblindType");
    return saved || "protanopia"; // Protanopie par défaut
  });

  // useLayoutEffect pour le haut contraste
  useLayoutEffect(() => {
    localStorage.setItem("highContrast", highContrast.toString());
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  // useEffect pour les alertes visuelles
  useEffect(() => {
    localStorage.setItem("visualAlerts", visualAlerts.toString());
  }, [visualAlerts]);

  // useLayoutEffect MODIFIÉ : Gère le mode ET le type spécifique de daltonisme
  useLayoutEffect(() => {
    localStorage.setItem("colorblindMode", colorblindMode.toString());
    localStorage.setItem("colorblindType", colorblindType);

    const html = document.documentElement;

    // 1. On nettoie toujours les anciennes classes pour éviter les conflits
    html.classList.remove(
      "colorblind-mode",
      "colorblind-protanopia",
      "colorblind-deuteranopia",
      "colorblind-tritanopia"
    );

    // 2. Si le mode est actif, on applique les bonnes classes
    if (colorblindMode) {
      html.classList.add("colorblind-mode");
      html.classList.add(`colorblind-${colorblindType}`);
    }
  }, [colorblindMode, colorblindType]);

  const toggleHighContrast = () => setHighContrast(!highContrast);
  const toggleVisualAlerts = () => setVisualAlerts(!visualAlerts);
  const toggleColorblindMode = () => setColorblindMode(!colorblindMode);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        toggleHighContrast,
        visualAlerts,
        toggleVisualAlerts,
        colorblindMode,
        toggleColorblindMode,
        colorblindType,
        setColorblindType,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error("useAccessibility must be used within AccessibilityProvider");
  }
  return context;
}