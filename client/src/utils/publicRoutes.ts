const PUBLIC_MARKETING_PATHS = [
  "/discover",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms-of-service",
  "/news",
  "/play-poker-online",
  "/online-belote",
  "/online-blackjack",
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
    pathname === "/auth/admin" ||
    isPublicMarketingPath(pathname)
  );
}
