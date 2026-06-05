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
    <div className="relative isolate min-h-[100dvh] w-full overflow-x-hidden font-sans">
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <img
          src={isBac2 ? bac2Bg : bacBg}
          alt=""
          className="h-full w-full object-cover"
        />
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            isBac2
              ? "from-slate-950/45 via-slate-900/20 to-amber-950/40"
              : "from-slate-950/50 via-slate-900/25 to-blue-950/45"
          }`}
        />
        <div
          className={`absolute inset-0 ${
            isBac2
              ? "bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.12),transparent_60%)]"
              : "bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_60%)]"
          }`}
        />
        <div
          className={`absolute -left-24 top-1/4 h-72 w-72 rounded-full blur-[90px] ${
            isBac2 ? "bg-amber-500/15" : "bg-blue-500/12"
          }`}
        />
        <div
          className={`absolute -right-16 bottom-1/4 h-80 w-80 rounded-full blur-[100px] ${
            isBac2 ? "bg-yellow-500/12" : "bg-cyan-500/12"
          }`}
        />
      </div>
      <div
        className={`relative z-10 flex min-h-[100dvh] w-full flex-col items-center justify-center ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
