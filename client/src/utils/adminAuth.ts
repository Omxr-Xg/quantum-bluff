import { getAuthItem, removeAuthItem, setAuthItem } from "./authStorage";

/** JWT émis par POST /api/auth/admin/login (ne pas confondre avec le jeton joueur). */
export function getAdminAuthToken(): string | null {
  const dedicated = getAuthItem("adminToken");
  if (dedicated) return dedicated;
  if (getAuthItem("role") === "admin") {
    return getAuthItem("token");
  }
  return null;
}

export function isAdminAuthSession(): boolean {
  return getAuthItem("role") === "admin" && Boolean(getAdminAuthToken());
}

export function adminAuthHeaders(): HeadersInit {
  const token = getAdminAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function setAdminAuthSession(opts: {
  token: string;
  userId: string;
  username: string;
}): void {
  setAuthItem("adminToken", opts.token);
  setAuthItem("role", "admin");
  setAuthItem("adminUserId", opts.userId);
  setAuthItem("adminUsername", opts.username);
}

/** Déconnecte la console admin sans effacer la session joueur éventuelle. */
export function clearAdminAuthSession(): void {
  removeAuthItem("adminToken");
  removeAuthItem("role");
  removeAuthItem("adminUserId");
  removeAuthItem("adminUsername");
  window.dispatchEvent(new Event("auth-changed"));
}

/**
 * Anciennes sessions : le JWT admin était stocké dans `token` et écrasait le jeton joueur.
 * Déplace-le vers `adminToken` pour rétablir les routes joueur si un token subsiste ailleurs.
 */
export function migrateLegacyAdminTokenInPlayerSlot(): void {
  if (getAuthItem("role") !== "admin") return;
  if (getAuthItem("adminToken")) return;
  const legacy = getAuthItem("token");
  if (!legacy) return;
  setAuthItem("adminToken", legacy);
  removeAuthItem("token");
  removeAuthItem("userId");
  removeAuthItem("userid");
  removeAuthItem("username");
}
