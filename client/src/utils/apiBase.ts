/**
 * Résout l’URL du backend HTTP.
 *
 * - `VITE_API_URL` si défini (mobile Capacitor, prod dédiée).
 * - Navigateur sur `localhost` / `127.0.0.1` sans env → `http://localhost:3000`
 *   pour éviter les 404 quand `/api` n’est pas proxifié (ex. `vite preview`).
 * - Sinon chaîne vide → requêtes relatives `/api/...` (même origine, nginx, etc.).
 *
 * Ne pas utiliser le fallback `localhost:3000` pour `capacitor:` / `file:` :
 * dans ce cas il faut obligatoirement `VITE_API_URL`.
 */
export function getApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_URL ?? "").toString().replace(/\/$/, "").trim();
  if (fromEnv) return fromEnv;
  if (typeof window === "undefined") return "";
  const { hostname, protocol } = window.location;
  if (protocol === "capacitor:" || protocol === "ionic:" || protocol === "file:") return "";
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return "http://localhost:3000";
  }
  return "";
}

/** Ex. `apiUrl("/api/auth/balance")` → `http://localhost:3000/api/auth/balance` en local sans env. */
export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (base) return `${base}${p}`;
  return p;
}
