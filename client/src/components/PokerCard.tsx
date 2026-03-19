import { motion } from "motion/react";
import logoSrc from "../assets/logo-personnel.png";

const SUIT_SYMBOL: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

/** Formes pour mode daltonien : ● Cœur, ◆ Carreau, ■ Trèfle, ▲ Pique */
const SUIT_SHAPE: Record<string, string> = {
  hearts: "●",
  diamonds: "◆",
  clubs: "■",
  spades: "▲",
};

/** Rouge (cœur, carreau) vs noir (trèfle, pique) — standard poker */
const isRedSuit = (suit: string) => suit === "hearts" || suit === "diamonds";
const SUIT_COLOR = (suit: string) =>
  isRedSuit(suit) ? "text-red-600" : "text-gray-900";

type CardSize = "xs" | "sm" | "md" | "lg";

interface PokerCardProps {
  suit: string;
  value: string;
  size?: CardSize;
  faceDown?: boolean;
  highlight?: boolean;
  animated?: boolean;
  animationDelay?: number;
  className?: string;
  colorblindMode?: boolean;
}

const SIZE_MAP: Record<
  CardSize,
  { card: string; value: string; suit: string; corner: string; cornerPos: string }
> = {
  xs: {
    card: "w-10 h-[56px]",
    value: "text-[9px]",
    suit: "text-sm",
    corner: "text-[7px]",
    cornerPos: "top-0.5 left-0.5",
  },
  sm: {
    card: "w-12 h-[68px]",
    value: "text-[10px]",
    suit: "text-base",
    corner: "text-[8px]",
    cornerPos: "top-0.5 left-1",
  },
  md: {
    card: "w-16 h-[88px]",
    value: "text-xs",
    suit: "text-2xl",
    corner: "text-[9px]",
    cornerPos: "top-1 left-1.5",
  },
  lg: {
    card: "w-20 h-[112px] md:w-28 md:h-[156px]",
    value: "text-sm md:text-base",
    suit: "text-4xl md:text-6xl",
    corner: "text-xs md:text-sm",
    cornerPos: "top-1.5 left-2 md:top-2 md:left-2.5",
  },
};

export function PokerCard({
  suit,
  value,
  size = "md",
  faceDown = false,
  highlight = false,
  animated = false,
  animationDelay = 0,
  className = "",
  colorblindMode = false,
}: PokerCardProps) {
  const s = SIZE_MAP[size];
  const colorClass = SUIT_COLOR(suit);
  const symbol = SUIT_SYMBOL[suit] ?? suit;
  const shape = SUIT_SHAPE[suit] ?? "";

  if (faceDown) {
    const Wrapper = animated ? motion.div : "div";
    const animProps = animated
      ? {
          initial: { scale: 0.8, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          transition: { delay: animationDelay, duration: 0.3 },
        }
      : {};
    return (
      <Wrapper
        {...(animProps as Record<string, unknown>)}
        className={`${s.card} rounded-[10px] overflow-hidden shadow-xl
          bg-gradient-to-br from-blue-800 via-blue-900 to-indigo-950
          border-2 border-blue-700/60 relative
          transition transform hover:scale-105 duration-200 ${className}`}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 6px,
              rgba(255,255,255,0.03) 6px,
              rgba(255,255,255,0.03) 7px
            )`,
          }}
        />
        <div className="absolute inset-[4px] rounded-lg border border-white/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src={logoSrc}
            alt=""
            className="w-1/2 h-1/2 object-contain opacity-50"
          />
        </div>
        <div className="absolute inset-0 rounded-[8px] border border-blue-400/20" />
      </Wrapper>
    );
  }

  const Wrapper = animated ? motion.div : "div";
  const animProps = animated
    ? {
        initial: { rotateY: 180, opacity: 0 },
        animate: { rotateY: 0, opacity: 1 },
        transition: { delay: animationDelay, duration: 0.4, type: "spring", stiffness: 200 },
      }
    : {};

  return (
    <Wrapper
      {...(animProps as Record<string, unknown>)}
      className={`${s.card} rounded-[10px] overflow-hidden relative
        bg-[#faf8f5] shadow-[0_4px_14px_rgba(0,0,0,0.15)]
        ${highlight ? "ring-2 ring-amber-400 shadow-amber-400/40 scale-105" : ""}
        border border-gray-300/80
        transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02]
        ${className}`}
    >
      {/* Texture papier fin */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #333 0.5px, transparent 0.5px)",
          backgroundSize: "6px 6px",
        }}
      />

      {/* Bordure intérieure style carte à jouer */}
      <div className="absolute inset-[3px] rounded-[7px] border border-gray-200/60" />

      {/* Index coin haut-gauche */}
      <div className={`absolute ${s.cornerPos} flex flex-col items-center leading-[0.9]`}>
        <span className={`${s.corner} font-bold ${colorClass}`}>{value}</span>
        <span className={`${s.corner} ${colorClass} -mt-px`}>{symbol}{colorblindMode && shape ? <span className="ml-0.5 opacity-90">{shape}</span> : ""}</span>
      </div>

      {/* Centre : symbole principal (style Bicycle) */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`${s.suit} ${colorClass} font-medium drop-shadow-sm`}>{symbol}{colorblindMode && shape ? <span className="ml-0.5 text-[0.6em] opacity-90 align-middle">{shape}</span> : ""}</span>
      </div>

      {/* Index coin bas-droit (inversé) */}
      <div
        className={`absolute ${s.cornerPos.replace("top", "bottom").replace("left", "right")} flex flex-col items-center leading-[0.9] rotate-180`}
      >
        <span className={`${s.corner} font-bold ${colorClass}`}>{value}</span>
        <span className={`${s.corner} ${colorClass} -mt-px`}>{symbol}{colorblindMode && shape ? <span className="ml-0.5 opacity-90 rotate-180 inline-block">{shape}</span> : ""}</span>
      </div>
    </Wrapper>
  );
}

/** Placeholder carte vide */
export function PokerCardSlot({ size = "md", className = "" }: { size?: CardSize; className?: string }) {
  const s = SIZE_MAP[size];
  return (
    <div
      className={`${s.card} rounded-[10px] border-2 border-dashed border-white/20 bg-white/5 ${className}`}
    />
  );
}
