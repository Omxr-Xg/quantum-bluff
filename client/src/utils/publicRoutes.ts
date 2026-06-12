const PUBLIC_MARKETING_PATHS = [
  "/discover",
  "/downloads",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/news",
  "/play-poker-online",
  "/online-belote",
  "/online-blackjack",
  "/online-roulette",
  "/online-slots",
  "/online-crash-game",
  "/online-mines-game",
] as const;

export function isPublicMarketingPath(pathname: string): boolean {
  return PUBLIC_MARKETING_PATHS.some(
    (p) => pathname === p || (p === "/news" && pathname.startsWith("/news/")),
  );
}

export function isPublicShellPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/auth" ||
    pathname === "/auth/set-password" ||
    pathname === "/auth/admin" ||
    isPublicMarketingPath(pathname)
  );
}
