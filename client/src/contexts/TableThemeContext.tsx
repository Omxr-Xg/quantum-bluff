import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import ba1Url from "../assets/background/BA1.webp";
import ba2Url from "../assets/background/BA2.webp";
import ba3Url from "../assets/background/BA3.webp";
import ba4Url from "../assets/background/BA4.webp";
import { apiUrl } from "../utils/apiBase";
import {
  feltGradientFromCustomColor,
  type TableVisualsPayload,
} from "../utils/tableThemeShop";
import { useUser } from "../hooks/useUser";
import { useGetTableThemeShopQuery } from "../services/api";

export type TableThemeId = "default" | "vegasRed" | "vegasPurple" | "darkBlue";

/** Texture sous le dégradé de tapis (`PokerTable`) et fond salle (bot). */
export type TableFeltBackgroundId = "ba1" | "ba2" | "ba3" | "ba4";

const STORAGE_KEY = "pokerTableTheme";
const FELT_BACKGROUND_STORAGE_KEY = "pokerTableFeltBackground";
const CUSTOM_COLOR_STORAGE_KEY = "pokerTableCustomColor";

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

const FELT_RAIL_BROWN = "rgba(120, 53, 15, 0.85)";

export const TABLE_FELT_BORDER: Record<TableThemeId, string> = {
  default: FELT_RAIL_BROWN,
  vegasRed: FELT_RAIL_BROWN,
  vegasPurple: FELT_RAIL_BROWN,
  darkBlue: FELT_RAIL_BROWN,
};

function resolveBackgroundUrl(
  id: TableFeltBackgroundId | "custom",
  customUrl: string | null,
): string {
  if (id === "custom" && customUrl) {
    return customUrl.startsWith("/api/") ? apiUrl(customUrl) : customUrl;
  }
  if (isTableFeltBackgroundId(id)) return TABLE_FELT_BACKGROUND_URLS[id];
  return TABLE_FELT_BACKGROUND_URLS.ba1;
}

function resolveGradient(
  themeId: TableThemeId | "custom",
  customColor: string | null,
): string {
  if (themeId === "custom" && customColor) {
    return feltGradientFromCustomColor(customColor);
  }
  if (isTableThemeId(themeId)) return TABLE_FELT_GRADIENTS[themeId];
  return TABLE_FELT_GRADIENTS.default;
}

interface TableThemeContextType {
  tableTheme: TableThemeId | "custom";
  setTableTheme: (id: TableThemeId) => void;
  customFeltColor: string | null;
  setCustomFeltColor: (hex: string) => void;
  feltGradient: string;
  feltBorder: string;
  feltBackgroundId: TableFeltBackgroundId | "custom";
  setFeltBackgroundId: (id: TableFeltBackgroundId | "custom", customUrl?: string | null) => void;
  feltBackgroundUrl: string;
  setSessionTableVisuals: (visuals: TableVisualsPayload | null) => void;
}

const TableThemeContext = createContext<TableThemeContextType | undefined>(undefined);

export function TableThemeProvider({ children }: { children: ReactNode }) {
  const { userId, isAdmin } = useUser();
  const { data: shopData } = useGetTableThemeShopQuery(undefined, { skip: !userId || isAdmin });

  const [tableTheme, setTableThemeState] = useState<TableThemeId | "custom">(() => {
    if (typeof window === "undefined") return "default";
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === "custom") return "custom";
    return raw && isTableThemeId(raw) ? raw : "default";
  });

  const [customFeltColor, setCustomFeltColorState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(CUSTOM_COLOR_STORAGE_KEY);
  });

  const [feltBackgroundId, setFeltBackgroundIdState] = useState<TableFeltBackgroundId | "custom">(() => {
    if (typeof window === "undefined") return "ba1";
    const raw = localStorage.getItem(FELT_BACKGROUND_STORAGE_KEY);
    if (raw === "custom") return "custom";
    return raw && isTableFeltBackgroundId(raw) ? raw : "ba1";
  });

  const [customFeltBackgroundUrl, setCustomFeltBackgroundUrl] = useState<string | null>(null);
  const [sessionVisuals, setSessionVisuals] = useState<TableVisualsPayload | null>(null);

  useEffect(() => {
    const prefs = shopData?.preferences;
    if (!prefs) return;
    const theme = prefs.feltThemeId;
    if (theme === "custom") {
      setTableThemeState("custom");
      localStorage.setItem(STORAGE_KEY, "custom");
      if (prefs.feltCustomColor) {
        setCustomFeltColorState(prefs.feltCustomColor);
        localStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, prefs.feltCustomColor);
      }
    } else if (isTableThemeId(theme)) {
      setTableThemeState(theme);
      localStorage.setItem(STORAGE_KEY, theme);
    }
    const bg = prefs.feltBackgroundId;
    if (bg === "custom") {
      setFeltBackgroundIdState("custom");
      if (prefs.visuals?.feltBackgroundUrl) {
        setCustomFeltBackgroundUrl(prefs.visuals.feltBackgroundUrl);
      }
    } else if (isTableFeltBackgroundId(bg)) {
      setFeltBackgroundIdState(bg);
    }
  }, [shopData]);

  const setTableTheme = useCallback((id: TableThemeId) => {
    setTableThemeState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const setCustomFeltColor = useCallback((hex: string) => {
    setTableThemeState("custom");
    setCustomFeltColorState(hex);
    localStorage.setItem(STORAGE_KEY, "custom");
    localStorage.setItem(CUSTOM_COLOR_STORAGE_KEY, hex);
  }, []);

  const setFeltBackgroundId = useCallback(
    (id: TableFeltBackgroundId | "custom", customUrl?: string | null) => {
      setFeltBackgroundIdState(id);
      localStorage.setItem(FELT_BACKGROUND_STORAGE_KEY, id);
      if (id === "custom" && customUrl) setCustomFeltBackgroundUrl(customUrl);
    },
    [],
  );

  const setSessionTableVisuals = useCallback((visuals: TableVisualsPayload | null) => {
    setSessionVisuals(visuals);
  }, []);

  const effectiveTheme = sessionVisuals?.feltThemeId ?? tableTheme;
  const effectiveCustomColor = sessionVisuals?.feltCustomColor ?? customFeltColor;
  const effectiveBgId = sessionVisuals?.feltBackgroundId ?? feltBackgroundId;
  const effectiveCustomBgUrl = sessionVisuals?.feltBackgroundUrl ?? customFeltBackgroundUrl;

  const feltGradient = resolveGradient(effectiveTheme, effectiveCustomColor ?? null);
  const feltBorder = FELT_RAIL_BROWN;
  const feltBackgroundUrl = resolveBackgroundUrl(effectiveBgId, effectiveCustomBgUrl);

  const value = useMemo(
    () => ({
      tableTheme,
      setTableTheme,
      customFeltColor,
      setCustomFeltColor,
      feltGradient,
      feltBorder,
      feltBackgroundId,
      setFeltBackgroundId,
      feltBackgroundUrl,
      setSessionTableVisuals,
    }),
    [
      tableTheme,
      setTableTheme,
      customFeltColor,
      setCustomFeltColor,
      feltGradient,
      feltBorder,
      feltBackgroundId,
      setFeltBackgroundId,
      feltBackgroundUrl,
      setSessionTableVisuals,
    ],
  );

  return <TableThemeContext.Provider value={value}>{children}</TableThemeContext.Provider>;
}

export function useTableTheme(): TableThemeContextType {
  const ctx = useContext(TableThemeContext);
  if (!ctx) {
    throw new Error("useTableTheme must be used within TableThemeProvider");
  }
  return ctx;
}
