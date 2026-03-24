import { motion } from "motion/react";
import logoSrc from "../assets/logo-personnel.png";

/** Formes pour mode daltonien : ● Cœur, ◆ Carreau, ■ Trèfle, ▲ Pique */
const SUIT_SHAPE: Record<string, string> = {
  hearts: "●",
  diamonds: "◆",
  clubs: "■",
  spades: "▲",
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
  colorblindMode?: boolean;
}

const SIZE_MAP: Record<CardSize, { card: string }> = {
  xs: { card: "w-10 h-[56px]" },
  sm: { card: "w-12 h-[68px]" },
  md: { card: "w-16 h-[88px]" },
  lg: { card: "w-20 h-[112px] md:w-28 md:h-[156px]" },
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
  const shape = SUIT_SHAPE[suit.toLowerCase()] ?? "";

  // ==========================================
  // 1. LE DOS DE LA CARTE (Design original gardé)
  // ==========================================
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
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.03) 6px, rgba(255,255,255,0.03) 7px)`,
          }}
        />
        <div className="absolute inset-[4px] rounded-lg border border-white/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img src={logoSrc} alt="Dos de carte" className="w-1/2 h-1/2 object-contain opacity-50" />
        </div>
        <div className="absolute inset-0 rounded-[8px] border border-blue-400/20" />
      </Wrapper>
    );
  }

  // ==========================================
  // 2. LA CARTE FACE VISIBLE (Avec tes assets)
  // ==========================================
  const Wrapper = animated ? motion.div : "div";
  const animProps = animated
    ? {
        initial: { rotateY: 180, opacity: 0 },
        animate: { rotateY: 0, opacity: 1 },
        transition: { delay: animationDelay, duration: 0.4, type: "spring", stiffness: 200 },
      }
    : {};

  // ⚠️ CHANGER ICI L'EXTENSION SI BESOIN (.png ou .svg)
  const IMAGE_EXTENSION = ".svg"; 
  let fileName = "";

  // On sécurise les données (ex: "hearts" devient "hearts", "k" devient "K")
  const safeSuit = suit.toLowerCase();
  const safeValue = value.toUpperCase();

  // Gestion des jokers (au cas où votre jeu les utilise)
  if (safeValue === "JOKER") {
    fileName = safeSuit === "red" ? "red_joker" : "black_joker";
  } else {
    // Format exact de ta liste : hearts_K, clubs_10, etc.
    fileName = `${safeSuit}_${safeValue}`;
  }

  const imageSrc = `${import.meta.env.BASE_URL}cards/${fileName}${IMAGE_EXTENSION}`;

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
      {/* 1. L'image de la carte complète (en fond) */}
      <img 
        src={imageSrc} 
        alt={`Carte ${safeValue} de ${safeSuit}`} 
        className="w-full h-full object-contain relative z-10"
        draggable={false}
      />

      {/* TÂCHE 2 : Textures pour les Daltoniens (Hachures ou Points) */}
      {colorblindMode && (
        <div 
          className="absolute inset-0 z-20 pointer-events-none mix-blend-multiply opacity-20"
          style={{
            // Cœurs/Carreaux (Rouge) = Hachures diagonales | Trèfles/Piques (Noir) = Petits points
            backgroundImage: (safeSuit === 'hearts' || safeSuit === 'diamonds') 
              ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, #000 4px, #000 5px)'
              : 'radial-gradient(circle, #000 1.5px, transparent 1.5px)',
            backgroundSize: (safeSuit === 'hearts' || safeSuit === 'diamonds') ? 'auto' : '8px 8px'
          }}
        />
      )}

      {/* Le filtre d'accessibilité (La petite forme en haut à droite) */}
      {colorblindMode && shape && (
        <div className="absolute top-1 right-1 bg-white/90 rounded px-1.5 py-0.5 text-xs font-bold text-gray-800 shadow-sm border border-gray-200 z-30">
          {shape}
        </div>
      )}
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

