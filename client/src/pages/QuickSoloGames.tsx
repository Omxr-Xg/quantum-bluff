import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { ArrowLeft, Bomb, CircleDot, TrendingUp } from "lucide-react";
import { DiscreteAdSlot } from "../components/ads/DiscreteAdSlot";

type QuickGameCard = {
  id: "crash" | "wheel" | "mines";
  titleKey: string;
  blurbKey: string;
  icon: typeof TrendingUp;
  accent: string;
  glow: string;
  mesh: string;
  pattern: string;
  href?: string;
  badgeKey?: string;
};

const QUICK_GAMES: QuickGameCard[] = [
  {
    id: "crash",
    titleKey: "minigames.quickSoloCrashTitle",
    blurbKey: "minigames.quickSoloCrashBlurb",
    icon: TrendingUp,
    accent: "from-rose-500 via-orange-500 to-amber-400",
    glow: "shadow-[0_0_48px_rgba(244,63,94,0.35)]",
    mesh: "bg-[radial-gradient(ellipse_90%_80%_at_20%_20%,rgba(244,63,94,0.28),transparent_55%),radial-gradient(ellipse_70%_60%_at_85%_75%,rgba(251,146,60,0.18),transparent_50%),linear-gradient(160deg,#1a0810_0%,#12060c_45%,#0a0408_100%)]",
    pattern:
      "bg-[linear-gradient(90deg,rgba(251,113,133,0.08)_1px,transparent_1px),linear-gradient(rgba(251,113,133,0.08)_1px,transparent_1px)] bg-[size:28px_28px]",
    href: "/minigames/crash",
    badgeKey: "minigames.quickSoloNew",
  },
  {
    id: "wheel",
    titleKey: "minigames.quickSoloWheelTitle",
    blurbKey: "minigames.quickSoloWheelBlurb",
    icon: CircleDot,
    accent: "from-violet-400 via-fuchsia-400 to-amber-300",
    glow: "shadow-[0_0_48px_rgba(168,85,247,0.32)]",
    mesh: "bg-[radial-gradient(ellipse_85%_70%_at_50%_0%,rgba(168,85,247,0.26),transparent_58%),radial-gradient(ellipse_60%_55%_at_100%_100%,rgba(245,158,11,0.16),transparent_52%),linear-gradient(165deg,#140818_0%,#0c0612_50%,#06040a_100%)]",
    pattern:
      "bg-[conic-gradient(from_0deg_at_50%_50%,rgba(251,191,36,0.06)_0deg,transparent_30deg,transparent_60deg,rgba(192,132,252,0.08)_90deg,transparent_120deg,transparent_180deg,rgba(251,191,36,0.06)_210deg,transparent_240deg,transparent_300deg,rgba(192,132,252,0.08)_330deg)]",
    href: "/minigames/wheel",
    badgeKey: "minigames.quickSoloNew",
  },
  {
    id: "mines",
    titleKey: "minigames.quickSoloMinesTitle",
    blurbKey: "minigames.quickSoloMinesBlurb",
    icon: Bomb,
    accent: "from-emerald-400 via-teal-300 to-cyan-300",
    glow: "shadow-[0_0_48px_rgba(16,185,129,0.28)]",
    mesh: "bg-[radial-gradient(ellipse_80%_70%_at_80%_15%,rgba(16,185,129,0.22),transparent_55%),radial-gradient(ellipse_70%_60%_at_10%_90%,rgba(20,184,166,0.14),transparent_50%),linear-gradient(165deg,#041210_0%,#061816_48%,#030a09_100%)]",
    pattern:
      "bg-[radial-gradient(circle_at_1px_1px,rgba(52,211,153,0.14)_1px,transparent_0)] bg-[size:24px_24px]",
    href: "/minigames/mines",
    badgeKey: "minigames.quickSoloNew",
  },
];

export function QuickSoloGames() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[#020716]">
      <button
        type="button"
        onClick={() => navigate("/lobby?tab=minigames")}
        className="absolute left-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-30 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 shadow-lg backdrop-blur-md transition hover:border-white/25 hover:bg-slate-900/80 sm:left-5"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("minigames.quickSoloBack")}
      </button>

      <DiscreteAdSlot
        placement="games-hub"
        className="relative z-20 mx-4 mb-2 mt-[calc(env(safe-area-inset-top,0px)+3.25rem)] shrink-0 sm:mx-6"
      />

      <div className="flex min-h-0 flex-1 flex-col">
        {QUICK_GAMES.map((game, index) => {
          const Icon = game.icon;
          return (
            <motion.section
              key={game.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              role={game.href ? "button" : undefined}
              tabIndex={game.href ? 0 : undefined}
              onClick={game.href ? () => navigate(game.href!) : undefined}
              onKeyDown={
                game.href
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(game.href!);
                      }
                    }
                  : undefined
              }
              className={`group relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden border-white/10 px-6 py-8 text-center ${
                index > 0 ? "border-t" : ""
              } ${game.href ? "cursor-pointer transition hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60" : ""}`}
            >
              <div className={`pointer-events-none absolute inset-0 ${game.mesh}`} aria-hidden />
              <div className={`pointer-events-none absolute inset-0 opacity-60 ${game.pattern}`} aria-hidden />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(2,7,22,0.55)_100%)]" aria-hidden />

              <div className="relative z-10 flex max-w-lg flex-col items-center gap-3">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-black/35 backdrop-blur-md transition duration-300 group-hover:scale-105 ${game.glow}`}
                >
                  <Icon className="h-8 w-8 text-white" strokeWidth={2.2} />
                </div>

                <span
                  className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] ${
                    game.badgeKey === "minigames.quickSoloNew"
                      ? "border-orange-300/40 bg-orange-500/20 text-orange-100"
                      : "border-white/15 bg-white/10 text-slate-200/90"
                  }`}
                >
                  {t(game.badgeKey ?? "minigames.quickSoloComingSoon")}
                </span>

                <h2
                  className={`bg-gradient-to-r ${game.accent} bg-clip-text text-2xl font-black uppercase tracking-[0.14em] text-transparent sm:text-3xl`}
                >
                  {t(game.titleKey)}
                </h2>

                <p className="max-w-md text-sm leading-relaxed text-slate-300/90 sm:text-base">
                  {t(game.blurbKey)}
                </p>

                <div className="mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-70" />
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
