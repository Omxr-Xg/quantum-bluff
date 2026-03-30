import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";

export type TableThemeId = "default" | "vegasRed" | "vegasPurple" | "darkBlue";

const STORAGE_KEY = "pokerTableTheme";

function isTableThemeId(v: string): v is TableThemeId {
  return v === "default" || v === "vegasRed" || v === "vegasPurple" || v === "darkBlue";
}

/** Dégradé du tapis (feutre) — utilisé par `PokerTable`. */
export const TABLE_FELT_GRADIENTS: Record<TableThemeId, string> = {
  default:
    "radial-gradient(ellipse at center, #0d9660 0%, #0a7c4a 35%, #065a36 70%, #043d24 100%)",
  vegasRed:
    "radial-gradient(ellipse at center, #f87171 0%, #dc2626 35%, #991b1b 70%, #450a0a 100%)",
  vegasPurple:
    "radial-gradient(ellipse at center, #d8b4fe 0%, #a855f7 35%, #7e22ce 70%, #4c1d95 100%)",
  darkBlue:
    "radial-gradient(ellipse at center, #3b82f6 0%, #2563eb 35%, #1e3a8a 70%, #0f172a 100%)",
};

/** Bordure rail / cuir — identique pour tous les tapis (marron type billard). */
const FELT_RAIL_BROWN = "rgba(120, 53, 15, 0.85)";

export const TABLE_FELT_BORDER: Record<TableThemeId, string> = {
  default: FELT_RAIL_BROWN,
  vegasRed: FELT_RAIL_BROWN,
  vegasPurple: FELT_RAIL_BROWN,
  darkBlue: FELT_RAIL_BROWN,
};

interface TableThemeContextType {
  tableTheme: TableThemeId;
  setTableTheme: (id: TableThemeId) => void;
  feltGradient: string;
  feltBorder: string;
}

const TableThemeContext = createContext<TableThemeContextType | undefined>(
  undefined
);

export function TableThemeProvider({ children }: { children: ReactNode }) {
  const [tableTheme, setTableThemeState] = useState<TableThemeId>(() => {
    if (typeof window === "undefined") return "default";
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw && isTableThemeId(raw) ? raw : "default";
  });

  const setTableTheme = (id: TableThemeId) => {
    setTableThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, tableTheme);
  }, [tableTheme]);

  const feltGradient = TABLE_FELT_GRADIENTS[tableTheme];
  const feltBorder = TABLE_FELT_BORDER[tableTheme];

  const value = useMemo(
    () => ({ tableTheme, setTableTheme, feltGradient, feltBorder }),
    [tableTheme, feltGradient, feltBorder]
  );

  return (
    <TableThemeContext.Provider value={value}>
      {children}
    </TableThemeContext.Provider>
  );
}

export function useTableTheme(): TableThemeContextType {
  const ctx = useContext(TableThemeContext);
  if (!ctx) {
    throw new Error("useTableTheme must be used within TableThemeProvider");
  }
  return ctx;
}
