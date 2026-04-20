/**
 * Résout l’URL du backend HTTP.
 *
 * - `VITE_API_URL` si défini (mobile Capacitor, prod dédiée).
 * - Chemin relatif type `/vmProjet...` : OK pour le **web** déployé (même origine qu’Electron prod).
 *   Sous **Capacitor** (`capacitor://localhost`), un chemin seul ne cible pas la VM : utiliser soit
 *   une URL `https://.../vm...` complète, soit `VITE_DEPLOY_ORIGIN=https://hôte` + même chemin relatif
 *   que `.env.production` (voir `.env.capacitor.example`).
 * - Navigateur sur `localhost` / `127.0.0.1` sans env → `http://localhost:3000`
 *   pour éviter les 404 quand `/api` n’est pas proxifié (ex. `vite preview`).
 * - Sinon chaîne vide → requêtes relatives `/api/...` (même origine, nginx, etc.).
 *
 * Ne pas utiliser le fallback `localhost:3000` pour `capacitor:` / `file:` :
 * dans ce cas il faut obligatoirement une base résolue (URL absolue ou DEPLOY_ORIGIN + chemin).
 */
export function getApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_API_URL ?? "").toString().replace(/\/$/, "").trim();
  let fromEnv = raw;

  if (raw.startsWith("/")) {
    const isNativeShell =
      typeof window !== "undefined" &&
      (window.location.protocol === "capacitor:" ||
        window.location.protocol === "ionic:" ||
        window.location.protocol === "file:");
    const deployOrigin = (import.meta.env.VITE_DEPLOY_ORIGIN ?? "")
      .toString()
      .replace(/\/$/, "")
      .trim();
    if (isNativeShell) {
      if (deployOrigin) {
        fromEnv = `${deployOrigin}${raw}`;
      } else {
        fromEnv = "";
        if (import.meta.env.MODE === "capacitor") {
          console.warn(
            `[Quantum Bluff] VITE_API_URL est relatif (${raw}). ` +
              "Sur l’app native, les requêtes ne vont pas vers la VM : définis une URL https complète pour VITE_API_URL, " +
              "ou VITE_DEPLOY_ORIGIN (origine du site web, comme pour Electron) + ce même chemin.",
          );
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
