import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import ba1Url from "../assets/background/BA1.webp";
import ba2Url from "../assets/background/BA2.webp";
import ba3Url from "../assets/background/BA3.webp";
import ba4Url from "../assets/background/BA4.webp";

export type TableThemeId = "default" | "vegasRed" | "vegasPurple" | "darkBlue";

/** Texture sous le dégradé de tapis (`PokerTable`) et fond salle (bot). */
export type TableFeltBackgroundId = "ba1" | "ba2" | "ba3" | "ba4";

const STORAGE_KEY = "pokerTableTheme";
const FELT_BACKGROUND_STORAGE_KEY = "pokerTableFeltBackground";

export const TABLE_FELT_BACKGROUND_IDS: TableFeltBackgroundId[] = ["ba1", "ba2", "ba3", "ba4"];

export const TABLE_FELT_BACKGROUND_URLS: Record<TableFeltBackgroundId, string> = {
  ba1: ba1Url,
  ba2: ba2Url,
  ba3: ba3Url,
  ba4: ba4Url,
};

function isTableThemeId(v: string): v is TableThemeId {
  return v === "default" || v === "vegasRed" || v === "vegasPurple" || v === "darkBlue";
}

function isTableFeltBackgroundId(v: string): v is TableFeltBackgroundId {
  return v === "ba1" || v === "ba2" || v === "ba3" || v === "ba4";
}

/** Dégradé du tapis (feutre) — utilisé par `PokerTable`. */
export const TABLE_FELT_GRADIENTS: Record<TableThemeId, string> = {
  default:
    "radial-gradient(ellipse at center, #0b7f52 0%, #086a3f 35%, #054b2e 70%, #032a19 100%)",
  vegasRed:
    "radial-gradient(ellipse at center, #ea6565 0%, #c01f1f 35%, #7f1616 70%, #360808 100%)",
  vegasPurple:
    "radial-gradient(ellipse at center, #c49ef0 0%, #9248e0 35%, #6b1db5 70%, #3d1678 100%)",
  darkBlue:
    "radial-gradient(ellipse at center, #2d6edb 0%, #1d55c9 35%, #162f72 70%, #0a111f 100%)",
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
  feltBackgroundId: TableFeltBackgroundId;
  setFeltBackgroundId: (id: TableFeltBackgroundId) => void;
  /** URL bundlée (Vite) pour `background-image: url(...)`. */
  feltBackgroundUrl: string;
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

  const [feltBackgroundId, setFeltBackgroundIdState] = useState<TableFeltBackgroundId>(() => {
    if (typeof window === "undefined") return "ba1";
    const raw = localStorage.getItem(FELT_BACKGROUND_STORAGE_KEY);
    return raw && isTableFeltBackgroundId(raw) ? raw : "ba1";
  });

  const setTableTheme = (id: TableThemeId) => {
    setTableThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
  };

  const setFeltBackgroundId = (id: TableFeltBackgroundId) => {
    setFeltBackgroundIdState(id);
    localStorage.setItem(FELT_BACKGROUND_STORAGE_KEY, id);
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, tableTheme);
  }, [tableTheme]);

  useEffect(() => {
    localStorage.setItem(FELT_BACKGROUND_STORAGE_KEY, feltBackgroundId);
  }, [feltBackgroundId]);

  const feltGradient = TABLE_FELT_GRADIENTS[tableTheme];
  const feltBorder = TABLE_FELT_BORDER[tableTheme];
  const feltBackgroundUrl = TABLE_FELT_BACKGROUND_URLS[feltBackgroundId];

  const value = useMemo(
    () => ({
      tableTheme,
      setTableTheme,
      feltGradient,
      feltBorder,
      feltBackgroundId,
      setFeltBackgroundId,
      feltBackgroundUrl,
    }),
    [tableTheme, feltGradient, feltBorder, feltBackgroundId, feltBackgroundUrl]
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
