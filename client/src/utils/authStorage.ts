import { isCapacitorWebViewShell } from "./apiBase";
import { hasCapacitorBridgeObject, shouldPersistAuth } from "./platform";

const AUTH_KEYS = [
  "token",
  "role",
  "userId",
  "userid",
  "username",
  "quantum_bluff_username",
  "quantum_bluff_email",
  "quantum_bluff_avatar",
  "quantum_bluff_balance",
] as const;

/** Même critères que la garde migration : lecture localStorage dès le cold start WebView. */
function useLocalStorageForAuth(): boolean {
  if (typeof window === "undefined") return false;
  // Build `vite build --mode capacitor` : toujours persistant, même si hostname ≠ localhost (IP live reload, etc.).
  if (import.meta.env.MODE === "capacitor") return true;
  return shouldPersistAuth() || hasNativeRuntimeHint() || isCapacitorWebViewShell();
}

function getStorageForRuntime(): Storage {
  return useLocalStorageForAuth() ? localStorage : sessionStorage;
}

export function getAuthItem(key: string): string | null {
  return getStorageForRuntime().getItem(key);
}

export function setAuthItem(key: string, value: string): void {
  getStorageForRuntime().setItem(key, value);
}

export function removeAuthItem(key: string): void {
  getStorageForRuntime().removeItem(key);
}

export function clearAuthStorageEverywhere(extraKeys: string[] = []): void {
  const allKeys = [...AUTH_KEYS, ...extraKeys];
  for (const key of allKeys) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
}

function hasNativeRuntimeHint(): boolean {
  if (typeof window === "undefined") return false;
  if (hasCapacitorBridgeObject()) return true;
  const { protocol } = window.location;
  if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return true;
  try {
    const ua = navigator.userAgent ?? "";
    if (/Capacitor/i.test(ua)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Web only: move old persistent auth to session storage,
 * then clear local persistent auth keys.
 *
 * Ne jamais toucher à localStorage si un indice natif / ambigu est présent :
 * évite de supprimer la session mobile avant que le bridge Capacitor soit fiable.
 */
export function migrateLegacyAuthOnStartup(): void {
  if (useLocalStorageForAuth()) return;

  for (const key of AUTH_KEYS) {
    const currentSession = sessionStorage.getItem(key);
    if (currentSession == null) {
      const legacy = localStorage.getItem(key);
      if (legacy != null) sessionStorage.setItem(key, legacy);
    }
    localStorage.removeItem(key);
  }
}

/**
 * Exécute la migration après un tick pour laisser le bridge natif s’initialiser,
 * puis réévalue shouldPersistAuth / hints avant toute écriture destructive.
 */
export function scheduleMigrateLegacyAuthOnStartup(): void {
  if (typeof window === "undefined") {
    migrateLegacyAuthOnStartup();
    return;
  }
  const run = () => migrateLegacyAuthOnStartup();
  try {
    queueMicrotask(run);
  } catch {
    setTimeout(run, 0);
  }
}

