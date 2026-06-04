import { motion } from "motion/react";
import { PokerCard } from "../PokerCard";
import { mapBeloteRank, mapBeloteSuit } from "../../features/belote/beloteCardUtils";
import type { BeloteCard } from "../../features/belote/useBeloteSocket";

type CardSize = "xs" | "sm" | "md" | "board" | "lg";

export function BelotePlayingCard({
  card,
  hidden = false,
  size = "md",
  highlight = false,
  animated = true,
  animationDelay = 0,
  className = "",
}: {
  card?: BeloteCard;
  hidden?: boolean;
  size?: CardSize;
  highlight?: boolean;
  animated?: boolean;
  animationDelay?: number;
  className?: string;
}) {
  if (hidden || !card) {
    return (
      <PokerCard
        suit="spades"
        value="A"
        size={size}
        faceDown
        animated={animated}
        animationDelay={animationDelay}
        cardEnter="soft"
        className={className}
      />
    );
  }

  const inner = (
    <PokerCard
      suit={mapBeloteSuit(card.suit)}
      value={mapBeloteRank(card.rank)}
      size={size}
      highlight={highlight}
      animated={animated}
      animationDelay={animationDelay}
      cardEnter="soft"
      className={className}
    />
  );

  if (!animated) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: animationDelay,
        duration: 0.24,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      {inner}
    </motion.div>
  );
}
