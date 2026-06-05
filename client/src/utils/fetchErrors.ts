import type { TFunction } from "i18next";

const TRANSIENT_NETWORK_PATTERNS = [
  /^load failed$/i,
  /^failed to fetch$/i,
  /^networkerror/i,
  /^network request failed$/i,
  /^the internet connection appears to be offline/i,
  /^fetch failed$/i,
];

/** Erreur réseau navigateur (Safari : « Load failed », Chrome : « Failed to fetch »). */
export function isTransientNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.trim();
  if (!msg) return false;
  return TRANSIENT_NETWORK_PATTERNS.some((re) => re.test(msg));
}

export function isTransientHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

export function formatFetchError(
  err: unknown,
  t: TFunction,
  fallbackKey = "common.networkError",
): string {
  if (isTransientNetworkError(err)) {
    return t("common.networkError");
  }
  if (err instanceof Error && err.message.trim()) {
    const msg = err.message.trim();
    if (isTransientHttpStatus(Number.parseInt(msg, 10))) {
      return t("common.serverBusy");
    }
    return msg;
  }
  return t(fallbackKey);
}
