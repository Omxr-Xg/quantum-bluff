import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bomb,
  Brain,
  Cherry,
  Crown,
  Flame,
  Gem,
  Handshake,
  Landmark,
  Laugh,
  Loader,
  Meh,
  PartyPopper,
  Rocket,
  Shield,
  Skull,
  Sparkles,
  Spade,
  Target,
  ThumbsUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";

/** Préfixe des réactions envoyées au chat (remplace les caractères emoji). */
export const CHAT_REACTION_PREFIX = "reaction:" as const;

const REACTION_ICONS: Record<string, LucideIcon> = {
  cards: Spade,
  casino: Landmark,
  money: Wallet,
  onFire: Flame,
  cool: Laugh,
  thinking: Brain,
  nervous: Meh,
  king: Crown,
  fast: Zap,
  precise: Target,
  gg: Handshake,
  strong: Shield,
  luck: Cherry,
  diamond: Gem,
  trophy: Trophy,
  party: PartyPopper,
  shocked: Skull,
  mindBlown: Bomb,
  cold: Loader,
  rich: Wallet,
};

const REACTION_CLASS = "h-10 w-10 shrink-0 text-amber-200/95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)]";

/** Icônes pour les messages rapides (liste messages). */
export const QUICK_MESSAGE_ICONS: Record<string, LucideIcon> = {
  wellPlayed: ThumbsUp,
  allIn: Rocket,
  bluffing: Spade,
  whatAHand: Flame,
  luckyShot: Sparkles,
  heatingUp: Flame,
  impressive: Trophy,
  ggWp: Handshake,
  risky: Shield,
  easy: Laugh,
  oops: Meh,
  incredible: Sparkles,
};

export function isChatReactionId(content: string): boolean {
  return content.startsWith(CHAT_REACTION_PREFIX);
}

export function ChatReactionIcon({
  content,
  className = REACTION_CLASS,
}: {
  content: string;
  className?: string;
}): ReactNode {
  if (!content.startsWith(CHAT_REACTION_PREFIX)) {
    return (
      <span className={`inline-block text-2xl leading-none ${className}`}>{content}</span>
    );
  }
  const key = content.slice(CHAT_REACTION_PREFIX.length);
  const Icon = REACTION_ICONS[key];
  if (!Icon) {
    return <span className="text-sm font-medium text-white/70">{content}</span>;
  }
  return <Icon className={className} aria-hidden />;
}
