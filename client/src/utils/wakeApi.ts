import { apiFetch, apiUrl } from "./apiBase";

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

/** Sur le site web prod, OAuth passe par la même origine (proxy Vercel → API). */
export function shouldUseSameOriginOAuth(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, protocol } = window.location;
  if (protocol !== "https:" && protocol !== "http:") return false;
  return /(^|\.)quantum-bluff\.com$/i.test(hostname);
}

export function buildGoogleOAuthStartUrl(ref?: string | null): string {
  const path = "/auth/google";
  const base = shouldUseSameOriginOAuth()
    ? new URL(path, window.location.origin)
    : new URL(apiUrl(path));
  if (ref) base.searchParams.set("ref", ref);
  return base.toString();
}
