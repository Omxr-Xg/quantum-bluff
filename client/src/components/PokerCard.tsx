import { motion } from "motion/react";
import logoSrc from "../assets/logo-personnel.png";

const SUIT_SYMBOL: Record<string, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

const SUIT_COLOR: Record<string, { text: string; bg: string; glow: string }> = {
  hearts:   { text: "text-rose-500",    bg: "bg-rose-500/8",   glow: "shadow-rose-500/20" },
  diamonds: { text: "text-blue-500",    bg: "bg-blue-500/8",   glow: "shadow-blue-500/20" },
  clubs:    { text: "text-emerald-600", bg: "bg-emerald-600/8", glow: "shadow-emerald-600/20" },
  spades:   { text: "text-slate-800",   bg: "bg-slate-800/8",  glow: "shadow-slate-800/20" },
};

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
}

const SIZE_MAP: Record<CardSize, { card: string; value: string; suit: string; corner: string; cornerPos: string }> = {
  xs: {
    card: "w-9 h-[52px]",
    value: "text-[10px]",
    suit: "text-base",
    corner: "text-[8px]",
    cornerPos: "top-0.5 left-0.5",
  },
  sm: {
    card: "w-11 h-[60px]",
    value: "text-xs",
    suit: "text-lg",
    corner: "text-[9px]",
    cornerPos: "top-0.5 left-1",
  },
  md: {
    card: "w-14 h-20",
    value: "text-sm",
    suit: "text-2xl",
    corner: "text-[10px]",
    cornerPos: "top-1 left-1.5",
  },
  lg: {
    card: "w-16 h-24 md:w-32 md:h-48",
    value: "text-base md:text-2xl",
    suit: "text-3xl md:text-6xl",
    corner: "text-xs md:text-base",
    cornerPos: "top-1 left-1 md:top-1.5 md:left-2",
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
}: PokerCardProps) {
  const s = SIZE_MAP[size];
  const color = SUIT_COLOR[suit] ?? SUIT_COLOR.spades;
  const symbol = SUIT_SYMBOL[suit] ?? suit;

  if (faceDown) {
    const Wrapper = animated ? motion.div : "div";
    const animProps = animated
      ? { initial: { scale: 0.8, opacity: 0 }, animate: { scale: 1, opacity: 1 }, transition: { delay: animationDelay, duration: 0.3 } }
      : {};
    return (
      <Wrapper
        {...(animProps as Record<string, unknown>)}
        className={`${s.card} rounded-lg overflow-hidden shadow-lg
          bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950
          border border-amber-500/40 relative
          transition transform hover:scale-105 duration-200 ${className}`}
      >
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 4px, white 4px, white 5px)" }}
        />
        <div className="absolute inset-[3px] rounded-md border border-amber-400/20" />
        <div className="flex items-center justify-center h-full relative">
          <img src={logoSrc} alt="" className="w-2/3 h-2/3 object-contain opacity-60 drop-shadow-md" />
        </div>
      </Wrapper>
    );
  }

  const Wrapper = animated ? motion.div : "div";
  const animProps = animated
    ? { initial: { rotateY: 180, opacity: 0 }, animate: { rotateY: 0, opacity: 1 }, transition: { delay: animationDelay, duration: 0.4, type: "spring", stiffness: 200 } }
    : {};

  return (
    <Wrapper
      {...(animProps as Record<string, unknown>)}
      className={`${s.card} rounded-lg overflow-hidden relative
        bg-gradient-to-br from-white via-gray-50 to-gray-100
        shadow-lg ${highlight ? `shadow-yellow-400/40 border-2 border-yellow-400 ring-2 ring-yellow-400/30` : `${color.glow} border border-gray-200/80`}
        transition transform hover:scale-105 hover:-translate-y-0.5 duration-200
        ${className}`}
    >
      {/* Subtle texture */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, black 0.5px, transparent 0.5px)", backgroundSize: "8px 8px" }}
      />

      {/* Inner border */}
      <div className={`absolute inset-[2px] rounded-md border ${highlight ? "border-yellow-300/40" : "border-gray-200/50"}`} />

      {/* Top-left corner */}
      <div className={`absolute ${s.cornerPos} flex flex-col items-center leading-none`}>
        <span className={`${s.corner} font-black ${color.text}`}>{value}</span>
        <span className={`${s.corner} ${color.text} -mt-0.5`}>{symbol}</span>
      </div>

      {/* Center suit */}
      <div className={`flex items-center justify-center h-full relative ${color.bg} rounded-lg`}>
        <span className={`${s.suit} ${color.text} drop-shadow-sm`}>{symbol}</span>
      </div>

      {/* Bottom-right corner (rotated) */}
      <div className={`absolute ${s.cornerPos.replace("top", "bottom").replace("left", "right")} flex flex-col items-center leading-none rotate-180`}>
        <span className={`${s.corner} font-black ${color.text}`}>{value}</span>
        <span className={`${s.corner} ${color.text} -mt-0.5`}>{symbol}</span>
      </div>
    </Wrapper>
  );
}

/** Empty card placeholder */
export function PokerCardSlot({ size = "md", className = "" }: { size?: CardSize; className?: string }) {
  const s = SIZE_MAP[size];
  return (
    <div className={`${s.card} rounded-lg border-2 border-dashed border-white/15 bg-white/5 ${className}`} />
  );
}
