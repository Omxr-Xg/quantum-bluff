import type { ReactNode } from "react";
import badminBg from "../assets/background/BADMIN.png";

export const adminLanguageButtonClass =
  "flex aspect-square h-9 min-h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-amber-200/20 bg-slate-950/70 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.35)] backdrop-blur-md transition hover:border-amber-300/40 hover:bg-slate-900/80 md:h-11 md:min-h-11 md:w-11 md:min-w-11";

export const adminGlassPanelClass =
  "rounded-2xl border border-amber-200/12 bg-slate-950/50 shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl";

export const adminGlassCardClass =
  "rounded-2xl border border-amber-200/15 bg-slate-950/55 shadow-[0_8px_32px_rgba(0,0,0,0.22)] backdrop-blur-xl";

type Props = {
  children: ReactNode;
};

export function AdminShellBackground({ children }: Props) {
  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden font-sans">
      <img
        src={badminBg}
        alt=""
        className="pointer-events-none fixed inset-0 h-full w-full object-cover"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-gradient-to-br from-slate-950/92 via-slate-900/80 to-amber-950/74"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.14),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-24 top-1/4 h-72 w-72 rounded-full bg-amber-500/10 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-16 bottom-1/4 h-80 w-80 rounded-full bg-orange-600/10 blur-[100px]"
        aria-hidden
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
