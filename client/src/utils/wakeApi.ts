import { apiFetch, apiUrl, getApiBaseUrl } from "./apiBase";

/** Réveille l’API Render (cold start) avant OAuth ou actions critiques. */
export async function wakeApiServer(maxRetries = 5): Promise<boolean> {
  const url = apiUrl("/api/health/live");
  try {
    const res = await apiFetch(url, {
      method: "GET",
      cache: "no-store",
      maxRetries,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Origine du backend pour démarrer OAuth (toujours l’API, jamais le domaine du SPA). */
export function resolveOAuthBackendOrigin(): string {
  const base = getApiBaseUrl();
  if (base && /^https?:\/\//i.test(base)) {
    try {
      return new URL(base).origin;
    } catch {
      /* fall through */
    }
  }
  // En dev, /auth/google sur le port Vite charge le SPA → « No routes matched ».
  if (import.meta.env.DEV) return "http://localhost:3000";
  if (typeof window !== "undefined") {
    const { hostname } = window.location;
    if (/(^|\.)quantum-bluff\.com$/i.test(hostname)) {
      return "https://api.quantum-bluff.com";
    }
    return window.location.origin;
  }
  return "https://api.quantum-bluff.com";
}

export function buildGoogleOAuthStartUrl(ref?: string | null): string {
  const path = "/auth/google";
  const url = new URL(path, resolveOAuthBackendOrigin());
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}
