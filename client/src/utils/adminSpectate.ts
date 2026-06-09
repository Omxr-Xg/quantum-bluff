/** Routes joueur où un admin connecté peut ouvrir une partie en spectateur (?spectate=1). */
export function isAdminSpectateRoute(pathname: string, search: string): boolean {
  if (new URLSearchParams(search).get("spectate") !== "1") return false;

  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  let path = pathname;
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;

  return (
    path === "/game" ||
    path.startsWith("/blackjack/table/") ||
    path.startsWith("/belote/game")
  );
}
