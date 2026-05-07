import { isCapacitorWebViewShell } from "./apiBase";

declare global {
  interface Window {
    electron?: {
      appVersion?: () => string;
      isElectron?: boolean;
    };
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}

export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  if (window.electron?.isElectron) return true;
  return /electron/i.test(navigator.userAgent);
}

export function isCapacitorNative(): boolean {
  if (typeof window === "undefined") return false;
  const nativeByApi = Boolean(window.Capacitor?.isNativePlatform?.());
  return nativeByApi || isCapacitorWebViewShell();
}

export function shouldPersistAuth(): boolean {
  return isElectron() || isCapacitorNative();
}

