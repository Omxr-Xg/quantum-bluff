import { shouldPersistAuth } from "./platform";

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

function getStorageForRuntime(): Storage {
  return shouldPersistAuth() ? localStorage : sessionStorage;
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

/**
 * Web only: move old persistent auth to session storage,
 * then clear local persistent auth keys.
 */
export function migrateLegacyAuthOnStartup(): void {
  if (shouldPersistAuth()) return;

  for (const key of AUTH_KEYS) {
    const currentSession = sessionStorage.getItem(key);
    if (currentSession == null) {
      const legacy = localStorage.getItem(key);
      if (legacy != null) sessionStorage.setItem(key, legacy);
    }
    localStorage.removeItem(key);
  }
}

