import { Heart, Diamond, Club, Spade } from "lucide-react";

export type SuitLucideProp =
  | "hearts"
  | "diamonds"
  | "clubs"
  | "spades"
  | "heart"
  | "diamond"
  | "club"
  | "spade";

function suitKey(suit: SuitLucideProp | string): "h" | "d" | "c" | "s" | null {
  switch (suit) {
    case "hearts":
    case "heart":
      return "h";
    case "diamonds":
    case "diamond":
      return "d";
    case "clubs":
    case "club":
      return "c";
    case "spades":
    case "spade":
      return "s";
    default:
      return null;
  }
}

type SuitLucideIconProps = {
  suit: SuitLucideProp | string;
  className?: string;
  strokeWidth?: number;
};

export function SuitLucideIcon({ suit, className, strokeWidth = 2 }: SuitLucideIconProps) {
  const k = suitKey(suit);
  const common = { className, strokeWidth, "aria-hidden": true as const };
  switch (k) {
    case "h":
      return <Heart {...common} />;
    case "d":
      return <Diamond {...common} />;
    case "c":
      return <Club {...common} />;
    case "s":
      return <Spade {...common} />;
    default:
      return null;
  }
}
