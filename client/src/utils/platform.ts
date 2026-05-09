import { isCapacitorWebViewShell } from "./apiBase";

/**
 * Objet global injecté par le bridge Capacitor (forme variable selon versions).
 * Ne pas dépendre d’un seul champ : plusieurs signaux réduisent les faux négatifs au boot.
 */
type CapacitorBridge = {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  /** Anciennes builds / snippets custom */
  isNative?: boolean;
};

declare global {
  interface Window {
    electron?: {
      appVersion?: () => string;
      isElectron?: boolean;
    };
    Capacitor?: CapacitorBridge;
  }
}

export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  if (window.electron?.isElectron) return true;
  return /electron/i.test(navigator.userAgent);
}

/** True si le runtime Capacitor indique iOS / Android (pas le mode web du CLI). */
function capacitorBridgeSaysNative(): boolean {
  const C = typeof window !== "undefined" ? window.Capacitor : undefined;
  if (!C) return false;
  if (typeof C.isNativePlatform === "function" && C.isNativePlatform()) return true;
  if (C.isNative === true) return true;
  if (typeof C.getPlatform === "function") {
    const p = C.getPlatform();
    if (p === "ios" || p === "android") return true;
  }
  return false;
}

/**
 * Indice conservateur : l’objet bridge est présent avant que les méthodes soient toutes disponibles.
 * Évite une migration web qui purge localStorage trop tôt.
 */
export function hasCapacitorBridgeObject(): boolean {
  return typeof window !== "undefined" && window.Capacitor != null;
}

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  if (capacitorBridgeSaysNative()) return true;
  return isCapacitorWebViewShell();
}

export function shouldPersistAuth(): boolean {
  return isElectron() || isCapacitorNative();
}

