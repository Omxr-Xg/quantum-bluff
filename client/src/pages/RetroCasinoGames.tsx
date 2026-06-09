import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { ArrowLeft, Clover, Disc, SquareStack } from "lucide-react";
import { DiscreteAdSlot } from "../components/ads/DiscreteAdSlot";

type RetroGameCard = {
  id: "roulette" | "slots" | "lucky-number";
  titleKey: string;
  blurbKey: string;
  icon: typeof Disc;
  href?: string;
  badgeKey?: string;
  carpet: string;
  glow: string;
  marquee: string;
  iconFrame: string;
};

const RETRO_GAMES: RetroGameCard[] = [
  {
    id: "roulette",
    titleKey: "minigames.rouletteTitle",
    blurbKey: "minigames.rouletteBlurb",
    icon: Disc,
    href: "/minigames?game=roulette",
    carpet:
      "bg-[repeating-conic-gradient(from_0deg_at_50%_50%,rgba(127,29,29,0.22)_0deg_90deg,rgba(15,23,42,0.28)_90deg_180deg,rgba(127,29,29,0.22)_180deg_270deg,rgba(15,23,42,0.28)_270deg_360deg)]",
    glow: "shadow-[0_0_40px_rgba(217,119,6,0.22)]",
    marquee: "from-amber-200 via-yellow-100 to-amber-300",
    iconFrame: "border-amber-500/45 bg-red-950/55",
  },
  {
    id: "slots",
    titleKey: "minigames.slotTitle",
    blurbKey: "minigames.slotBlurb",
    icon: SquareStack,
    href: "/minigames?game=slots",
    carpet:
      "bg-[linear-gradient(135deg,rgba(154,52,18,0.2)_25%,transparent_25%,transparent_50%,rgba(154,52,18,0.2)_50%,rgba(154,52,18,0.2)_75%,transparent_75%)] bg-[size:18px_18px]",
    glow: "shadow-[0_0_40px_rgba(251,146,60,0.2)]",
    marquee: "from-orange-200 via-amber-100 to-orange-300",
    iconFrame: "border-orange-500/40 bg-stone-950/60",
  },
  {
    id: "lucky-number",
    titleKey: "minigames.luckyNumberTitle",
    blurbKey: "minigames.luckyNumberBlurb",
    icon: Clover,
    href: "/minigames/lucky-number",
    badgeKey: "minigames.quickSoloNew",
    carpet:
      "bg-[radial-gradient(circle_at_1px_1px,rgba(212,175,55,0.12)_1px,transparent_0)] bg-[size:20px_20px]",
    glow: "shadow-[0_0_36px_rgba(220,38,38,0.22)]",
    marquee: "from-red-200 via-amber-100 to-yellow-200",
    iconFrame: "border-red-600/40 bg-red-950/55",
  },
];

export function RetroCasinoGames() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="relative flex h-[100dvh] min-h-0 w-full flex-col overflow-hidden bg-[#140a08]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        aria-hidden
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        }}
      />

      <button
        type="button"
        onClick={() => navigate("/lobby?tab=minigames")}
        className="absolute left-3 top-[calc(env(safe-area-inset-top,0px)+0.75rem)] z-30 inline-flex items-center gap-2 rounded-sm border-2 border-amber-700/50 bg-[#1a100c]/90 px-3 py-2 text-sm font-bold uppercase tracking-wider text-amber-100 shadow-[inset_0_1px_0_rgba(251,191,36,0.15),0_4px_16px_rgba(0,0,0,0.45)] transition hover:border-amber-500/60 hover:bg-[#241610] sm:left-5"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("minigames.retroCasinoBack")}
      </button>

      <header className="relative z-20 shrink-0 border-b-2 border-amber-800/35 bg-[#1a100c]/85 px-4 pb-3 pt-[calc(env(safe-area-inset-top,0px)+3.25rem)] text-center backdrop-blur-sm sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-amber-600/90">{t("minigames.retroCasinoEyebrow")}</p>
        <h1 className="mt-1 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 bg-clip-text text-xl font-black uppercase tracking-[0.2em] text-transparent sm:text-2xl">
          {t("minigames.retroCasinoTitle")}
        </h1>
      </header>

      <DiscreteAdSlot placement="games-hub" className="relative z-20 mx-4 mb-2 shrink-0 sm:mx-6" />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        {RETRO_GAMES.map((game, index) => {
          const Icon = game.icon;
          const clickable = Boolean(game.href);
          return (
            <motion.section
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => navigate(game.href!) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate(game.href!);
                      }
                    }
                  : undefined
              }
              className={`group relative flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden border-amber-900/30 px-5 py-7 text-center ${
                index > 0 ? "border-t-2" : ""
              } ${clickable ? "cursor-pointer transition hover:bg-amber-950/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50" : "opacity-90"}`}
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#1c120e]/80 via-[#140a08]/60 to-[#0c0604]/90" aria-hidden />
              <div className={`pointer-events-none absolute inset-0 opacity-50 ${game.carpet}`} aria-hidden />
              <div className="pointer-events-none absolute inset-3 rounded-sm border border-amber-700/20" aria-hidden />
              <div className="pointer-events-none absolute inset-5 rounded-sm border border-dashed border-amber-600/15" aria-hidden />

              <div className="relative z-10 flex max-w-md flex-col items-center gap-3">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-sm border-2 ${game.iconFrame} ${game.glow} transition duration-300 group-hover:scale-105`}
                >
                  <Icon className="h-8 w-8 text-amber-100" strokeWidth={2} />
                </div>

                <span
                  className={`rounded-sm border px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] ${
                    game.badgeKey
                      ? "border-stone-500/40 bg-stone-900/70 text-stone-300"
                      : "border-amber-600/45 bg-amber-950/60 text-amber-200"
                  }`}
                >
                  {t(game.badgeKey ?? "minigames.retroClassic")}
                </span>

                <h2
                  className={`bg-gradient-to-r ${game.marquee} bg-clip-text font-serif text-2xl font-black uppercase tracking-[0.12em] text-transparent sm:text-3xl`}
                  style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
                >
                  {t(game.titleKey)}
                </h2>

                <p className="max-w-sm text-sm leading-relaxed text-amber-100/75 sm:text-base">{t(game.blurbKey)}</p>

                {clickable ? (
                  <span className="mt-1 rounded-sm border border-amber-600/35 bg-amber-950/50 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em] text-amber-200 transition group-hover:border-amber-400/50 group-hover:bg-amber-900/55">
                    {t("minigames.play")}
                  </span>
                ) : null}
              </div>
            </motion.section>
          );
        })}
      </div>
    </div>
  );
}
