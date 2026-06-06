/**
 * Résout l’URL du backend HTTP.
 *
 * - `VITE_API_URL` si défini (mobile Capacitor, prod Render/Vercel).
 * - Chemin relatif (ex. `/api` ou préfixe SPA) : OK pour le web sur la même origine.
 *   Sous **Capacitor**, utiliser une URL `https://...` complète ou `VITE_DEPLOY_ORIGIN` + chemin relatif.
 * - Navigateur sur `localhost` / `127.0.0.1` sans env → `http://localhost:3000`
 *   pour éviter les 404 quand `/api` n’est pas proxifié (ex. `vite preview`).
 * - Sinon chaîne vide → requêtes relatives `/api/...` (même origine, nginx, etc.).
 *
 * Ne pas utiliser le fallback `localhost:3000` pour `capacitor:` / `file:` :
 * dans ce cas il faut obligatoirement une base résolue (URL absolue ou DEPLOY_ORIGIN + chemin).
 */
/** WebView Capacitor : souvent `https://localhost` (pas seulement `capacitor://`). */
export function isCapacitorWebViewShell(): boolean {
  if (typeof window === "undefined") return false;
  const { protocol, hostname } = window.location;
  if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return true;
  // APK : pas en `vite dev`, origine factice https://localhost (Android récent).
  if (
    protocol === "https:" &&
    (hostname === "localhost" || hostname === "127.0.0.1") &&
    !import.meta.env.DEV
  ) {
    return true;
  }
  // APK/IPA : origine parfois autre que localhost (IP machine, domaine custom).
  if (import.meta.env.MODE !== "capacitor") return false;
  return protocol === "https:" || protocol === "http:";
}

/** Première base `https://…` trouvée dans l’env (API ou socket), pour relier `/api/…` sous WebView. */
function absoluteApiBaseFromEnvUrls(): string {
  for (const key of ["VITE_API_URL", "VITE_SOCKET_URL"] as const) {
    const v = (import.meta.env[key] ?? "").toString().replace(/\/$/, "").trim();
    if (/^https?:\/\//i.test(v)) return v;
  }
  return "";
}

export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? "").toString().replace(/\/$/, "").trim();
  let fromEnv = raw;

  if (raw.startsWith("/")) {
    const isNativeShell =
      typeof window !== "undefined" && isCapacitorWebViewShell();
    const deployOrigin = (import.meta.env.VITE_DEPLOY_ORIGIN ?? "")
      .toString()
      .replace(/\/$/, "")
      .trim();
    if (isNativeShell) {
      if (deployOrigin) {
        fromEnv = `${deployOrigin}${raw}`;
      } else {
        const absSibling = absoluteApiBaseFromEnvUrls();
        if (absSibling) {
          try {
            const u = new URL(absSibling);
            const prefix = u.pathname.replace(/\/$/, "");
            const rawNorm = raw.replace(/\/$/, "");
            if (prefix === rawNorm) {
              fromEnv = absSibling;
            } else {
              fromEnv = `${u.origin}${raw}`;
            }
          } catch {
            fromEnv = `${absSibling}${raw}`;
          }
        } else {
          fromEnv = "";
          if (import.meta.env.MODE === "capacitor") {
            console.warn(
              `[Quantum Bluff] VITE_API_URL est relatif (${raw}). ` +
                "Sur l’app native, définis une URL https complète pour VITE_API_URL " +
                "ou VITE_DEPLOY_ORIGIN + ce même chemin (voir .env.capacitor.example).",
            );
          }
        }
      }
    }
  }

  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "";
  const { hostname, protocol } = window.location;
  if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // En `vite dev`, `/api` est proxifié vers le backend : utiliser l’origine évite les appels directs `:3000`.
    if (import.meta.env.DEV) return "";
    if (isCapacitorWebViewShell()) return "";
    return "http://localhost:3000";
  }
  return "";
}

/** Ex. `apiUrl("/api/auth/balance")` → `http://localhost:3000/api/auth/balance` en local sans env. */
export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const base = getApiBaseUrl();
  if (base) return `${base}${p}`;
  // WebView : `<img src>` vers `/api/…` viserait https://localhost — forcer la base absolue depuis l’env.
  if (typeof window !== "undefined" && isCapacitorWebViewShell()) {
    const abs = absoluteApiBaseFromEnvUrls();
    if (abs) return `${abs}${p}`;
    const d = (import.meta.env.VITE_DEPLOY_ORIGIN ?? "").toString().replace(/\/$/, "").trim();
    if (d && p.startsWith("/api")) return `${d}${p}`;
  }
  // Build Vite avec `base` non racine : préfixer `/api/…` si l’API partage le même chemin de base.
  const viteBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  if (viteBase && p.startsWith("/api")) {
    return `${viteBase}${p}`;
  }
  return p;
}

import { isTransientHttpStatus } from "./fetchErrors";

const API_FETCH_MAX_RETRIES = 3;

function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  const ra = retryAfterHeader;
  if (ra) {
    const sec = Number.parseInt(ra, 10);
    if (Number.isFinite(sec)) {
      return Math.min(60_000, Math.max(500, sec * 1000));
    }
  }
  return Math.min(8000, 400 * Math.pow(2, attempt));
}

/**
 * fetch avec backoff sur erreurs transitoires (429, 502/503/504, coupure réseau).
 * Réduit les flashes « Load failed » quand l’API Render redémarre ou est saturée.
 */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  let attempt = 0;
  let last: Response | undefined;

  while (attempt <= API_FETCH_MAX_RETRIES) {
    try {
      last = await fetch(input, init);
      const transient = isTransientHttpStatus(last.status);
      if (!transient || attempt >= API_FETCH_MAX_RETRIES) return last;
      await new Promise((r) => setTimeout(r, retryDelayMs(attempt, last!.headers.get("Retry-After"))));
      attempt += 1;
      continue;
    } catch (err) {
      if (attempt >= API_FETCH_MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, retryDelayMs(attempt, null)));
      attempt += 1;
    }
  }

  return last!;
}
