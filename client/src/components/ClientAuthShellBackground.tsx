import type { ReactNode } from "react";
import bacBg from "../assets/background/BAC.png";
import bac2Bg from "../assets/background/BAC2.png";

type BackgroundVariant = "bac" | "bac2";

type Props = {
  children: ReactNode;
  className?: string;
  /** `bac2` pour l’écran d’accueil (/), `bac` (défaut) pour /auth. */
  background?: BackgroundVariant;
};

/** Fond client — écran d’accueil (/) et connexion (/auth). */
export function ClientAuthShellBackground({
  children,
  className = "",
  background = "bac",
}: Props) {
  const isBac2 = background === "bac2";

  return (
    <div className={`relative min-h-[100dvh] w-full overflow-x-hidden font-sans ${className}`}>
      <img
        src={isBac2 ? bac2Bg : bacBg}
        alt=""
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed inset-0 bg-gradient-to-br ${
          isBac2
            ? "from-slate-950/78 via-slate-900/58 to-amber-950/72"
            : "from-slate-950/86 via-slate-900/72 to-blue-950/80"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed inset-0 ${
          isBac2
            ? "bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.14),transparent_55%)]"
            : "bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.16),transparent_55%)]"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed -left-24 top-1/4 h-72 w-72 rounded-full blur-[90px] ${
          isBac2 ? "bg-amber-500/10" : "bg-blue-500/10"
        }`}
        aria-hidden
      />
      <div
        className={`pointer-events-none fixed -right-16 bottom-1/4 h-80 w-80 rounded-full blur-[100px] ${
          isBac2 ? "bg-yellow-500/10" : "bg-cyan-500/10"
        }`}
        aria-hidden
      />
      {children}
    </div>
  );
}
