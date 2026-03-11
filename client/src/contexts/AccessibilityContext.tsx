import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface AccessibilityContextType {
  highContrast: boolean;
  toggleHighContrast: () => void;
  visualAlerts: boolean;
  toggleVisualAlerts: () => void;
  colorblindMode: boolean;
  toggleColorblindMode: () => void;
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

  useEffect(() => {
    localStorage.setItem("highContrast", highContrast.toString());
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  useEffect(() => {
    localStorage.setItem("visualAlerts", visualAlerts.toString());
  }, [visualAlerts]);

  useEffect(() => {
    localStorage.setItem("colorblindMode", colorblindMode.toString());
    if (colorblindMode) {
      document.documentElement.classList.add("colorblind-mode");
    } else {
      document.documentElement.classList.remove("colorblind-mode");
    }
  }, [colorblindMode]);

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