import { motion } from "motion/react";
import cardBackSrc from "../assets/cards/back.png";

/** Formes pour mode daltonien : ● Cœur, ◆ Carreau, ■ Trèfle, ▲ Pique */
const SUIT_SHAPE: Record<string, string> = {
  hearts: "●",
  diamonds: "◆",
  clubs: "■",
  spades: "▲",
};

type CardSize = "xs" | "sm" | "md" | "board" | "lg";

interface PokerCardProps {
  suit: string;
  value: string;
  size?: CardSize;
  faceDown?: boolean;
  highlight?: boolean;
  animated?: boolean;
  animationDelay?: number;
  /** `flip` = retournement 3D (poker). `soft` = fade + léger glissement (ex. blackjack). */
  cardEnter?: "flip" | "soft";
  className?: string;
  colorblindMode?: boolean;
}

/** Hold’em / tailles par défaut : sous md, board (xs) calculé pour 5 cartes avec léger overlap. Facteur −25 % vs état précédent. */
const SIZE_MAP: Record<CardSize, { card: string }> = {
  xs: {
    card:
      "w-[30px] h-[42px] max-md:!aspect-[63/88] max-md:!h-auto max-md:!w-[calc(((min(86vw,calc(100vw-2rem))+3.5rem)/5)*0.75)]",
  },
  sm: {
    card:
      "w-9 h-[51px] max-md:!aspect-[63/88] max-md:!h-auto max-md:!w-[min(4.6875rem,min(32.25vw,7.21875rem))]",
  },
  md: {
    card:
      "w-12 h-[66px] max-md:!aspect-[63/88] max-md:!h-auto max-md:!w-[min(6rem,min(31.5vw,7.875rem))]",
  },
  board: {
    card:
      "w-14 h-[78px] max-md:!aspect-[63/88] max-md:!h-auto max-md:!w-[min(6rem,min(31.5vw,7.875rem))]",
  },
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
  cardEnter = "flip",
  className = "",
  colorblindMode = false,
}: PokerCardProps) {
  const s = SIZE_MAP[size];
  const shape = SUIT_SHAPE[suit.toLowerCase()] ?? "";

  // ==========================================
  // 1. LE DOS DE LA CARTE
  // ==========================================
  if (faceDown) {
    const Wrapper = animated ? motion.div : "div";
    const animProps = animated
      ? cardEnter === "soft"
        ? {
            initial: { scale: 0.96, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            transition: { delay: animationDelay, duration: 0.18, ease: [0.25, 0.1, 0.25, 1] },
          }
        : {
            initial: { scale: 0.8, opacity: 0 },
            animate: { scale: 1, opacity: 1 },
            transition: { delay: animationDelay, duration: 0.3 },
          }
      : {};
    return (
      <Wrapper
        {...(animProps as Record<string, unknown>)}
        className={`${s.card} relative bg-transparent transition-transform duration-200 hover:scale-105 ${className}`}
      >
        <img
          src={cardBackSrc}
          alt="Dos de carte"
          className="h-full w-full object-contain"
          draggable={false}
        />
      </Wrapper>
    );
  }

  // ==========================================
  // 2. LA CARTE FACE VISIBLE (Avec tes assets)
  // ==========================================
  const Wrapper = animated ? motion.div : "div";
  const animProps = animated
    ? cardEnter === "soft"
      ? {
          initial: { opacity: 0, y: 5, scale: 0.98 },
          animate: { opacity: 1, y: 0, scale: 1 },
          transition: { delay: animationDelay, duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
        }
      : {
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
      className={`${s.card} relative bg-transparent rounded-[6px]
        ${
          highlight
            ? "qb-winning-card isolate z-[241] brightness-110 drop-shadow-[0_0_12px_rgba(251,191,36,0.72)]"
            : ""
        }
        transition-transform duration-200 hover:-translate-y-0.5 hover:scale-[1.02]
        ${className}`}
    >
      {highlight && (
        <>
          <div className="qb-winning-card-aura pointer-events-none absolute -inset-1.5 -z-10 rounded-xl bg-amber-300/18 blur-md" />
          <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden rounded-[inherit]">
            <div className="qb-winning-card-shimmer absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-white/55 to-transparent" />
          </div>
        </>
      )}

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
      className={`${s.card} rounded-[5px] border-2 border-dashed border-white/20 bg-white/5 ${className}`}
    />
  );
}
