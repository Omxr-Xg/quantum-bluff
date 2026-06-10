import type { ComponentType } from "react";

export type SymbolId = "seven" | "bar" | "crown" | "diamond" | "cherry" | "bell";

interface SymbolProps {
  size?: number;
  lit?: boolean;
}

export function SevenSymbol({ size = 72, lit }: SymbolProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="s7bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#2a0505" />
          <stop offset="100%" stopColor="#0f0202" />
        </radialGradient>
        {lit && (
          <filter id="s7glow">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        )}
      </defs>
      <rect width="72" height="72" rx="6" fill="url(#s7bg)" />
      <path d="M16 16H56L34 60" stroke={lit ? "#ff4444" : "#c0392b"} strokeWidth="9" strokeLinecap="round" strokeLinejoin="bevel" filter={lit ? "url(#s7glow)" : undefined} />
      <path d="M16 16H56L34 60" stroke="#ff9090" strokeWidth="3" strokeLinecap="round" strokeLinejoin="bevel" opacity={lit ? 0.7 : 0.3} />
      <line x1="16" y1="30" x2="46" y2="30" stroke="#d4a843" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function BarSymbol({ size = 72, lit }: SymbolProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sbarbg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0e0e1c" />
          <stop offset="100%" stopColor="#060610" />
        </linearGradient>
        <linearGradient id="sbar1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0d060" />
          <stop offset="100%" stopColor="#a07820" />
        </linearGradient>
      </defs>
      <rect width="72" height="72" rx="6" fill="url(#sbarbg)" />
      <rect x="8" y="20" width="56" height="9" rx="3" fill="url(#sbar1)" opacity={lit ? 1 : 0.9} />
      <rect x="8" y="33" width="56" height="9" rx="3" fill="url(#sbar1)" opacity={lit ? 0.75 : 0.6} />
      <rect x="8" y="46" width="56" height="7" rx="3" fill="url(#sbar1)" opacity={lit ? 0.5 : 0.35} />
      <text x="36" y="16" textAnchor="middle" fill="#c8a030" fontSize="9" fontFamily="'Roboto Slab',serif" fontWeight="700" letterSpacing="3">BAR</text>
    </svg>
  );
}

export function CrownSymbol({ size = 72, lit }: SymbolProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="scrbg" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#181000" />
          <stop offset="100%" stopColor="#080600" />
        </radialGradient>
        <linearGradient id="scrfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f8e080" />
          <stop offset="50%" stopColor="#d4a843" />
          <stop offset="100%" stopColor="#7a5010" />
        </linearGradient>
        {lit && <filter id="scrglow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>}
      </defs>
      <rect width="72" height="72" rx="6" fill="url(#scrbg)" />
      <polygon points="36,12 47,32 62,18 56,50 16,50 10,18 25,32" fill="url(#scrfill)" stroke="#f8e080" strokeWidth="1" strokeLinejoin="round" filter={lit ? "url(#scrglow)" : undefined} />
      <rect x="16" y="52" width="40" height="8" rx="2" fill="#b88820" />
      <rect x="16" y="52" width="40" height="3" rx="2" fill="#f0d060" opacity="0.4" />
      <circle cx="36" cy="12" r="3.5" fill="#fff" opacity="0.95" />
      <circle cx="62" cy="18" r="3" fill="#fff" opacity="0.95" />
      <circle cx="10" cy="18" r="3" fill="#fff" opacity="0.95" />
    </svg>
  );
}

export function DiamondSymbol({ size = 72, lit }: SymbolProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sdmbg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#00070f" />
          <stop offset="100%" stopColor="#000408" />
        </radialGradient>
        <linearGradient id="sdmfill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8ae8ff" />
          <stop offset="40%" stopColor="#2090d8" />
          <stop offset="100%" stopColor="#062858" />
        </linearGradient>
        {lit && <filter id="sdmglow"><feGaussianBlur stdDeviation="4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>}
      </defs>
      <rect width="72" height="72" rx="6" fill="url(#sdmbg)" />
      <polygon points="36,8 64,36 36,64 8,36" fill="url(#sdmfill)" filter={lit ? "url(#sdmglow)" : undefined} />
      <polygon points="36,8 64,36 36,64 8,36" fill="none" stroke="#8ae8ff" strokeWidth="1.5" opacity="0.5" />
      <polygon points="36,16 56,36 36,56 16,36" fill="none" stroke="#fff" strokeWidth="0.75" opacity="0.2" />
      <polygon points="22,30 36,8 50,30" fill="#fff" opacity="0.12" />
      <line x1="8" y1="36" x2="64" y2="36" stroke="#fff" strokeWidth="0.5" opacity="0.15" />
    </svg>
  );
}

export function CherrySymbol({ size = 72, lit }: SymbolProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="schbg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#0f0006" />
          <stop offset="100%" stopColor="#060004" />
        </radialGradient>
        <radialGradient id="schfill" cx="35%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#ff6060" />
          <stop offset="100%" stopColor="#8b0000" />
        </radialGradient>
        {lit && <filter id="schglow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>}
      </defs>
      <rect width="72" height="72" rx="6" fill="url(#schbg)" />
      <path d="M36 22 C32 14 20 12 16 18" stroke="#2e7a18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M36 22 C42 12 54 14 56 22" stroke="#2e7a18" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <ellipse cx="24" cy="10" rx="6" ry="4" fill="#2e7a18" transform="rotate(-20 24 10)" />
      <line x1="36" y1="22" x2="20" y2="48" stroke="#3a9020" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="36" y1="22" x2="52" y2="48" stroke="#3a9020" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="56" r="12" fill="url(#schfill)" filter={lit ? "url(#schglow)" : undefined} />
      <circle cx="52" cy="56" r="12" fill="url(#schfill)" filter={lit ? "url(#schglow)" : undefined} />
      <circle cx="16" cy="52" r="4" fill="#fff" opacity="0.3" />
      <circle cx="48" cy="52" r="4" fill="#fff" opacity="0.3" />
    </svg>
  );
}

export function BellSymbol({ size = 72, lit }: SymbolProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sblbg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#120e00" />
          <stop offset="100%" stopColor="#070500" />
        </radialGradient>
        <linearGradient id="sblfill" x1="0" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#f8e070" />
          <stop offset="100%" stopColor="#906010" />
        </linearGradient>
        {lit && <filter id="sblglow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>}
      </defs>
      <rect width="72" height="72" rx="6" fill="url(#sblbg)" />
      <path d="M36 10 C36 10 32 10 32 14 C22 16 14 26 14 42 L8 50 L64 50 L58 42 C58 26 50 16 40 14 C40 10 36 10 36 10Z" fill="url(#sblfill)" filter={lit ? "url(#sblglow)" : undefined} />
      <rect x="8" y="50" width="56" height="5" rx="2.5" fill="#b08020" />
      <path d="M32 56 Q36 62 40 56" stroke="#c89820" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="26" cy="30" rx="5" ry="8" fill="#fff" opacity="0.15" transform="rotate(-15 26 30)" />
    </svg>
  );
}

const MAP: Record<SymbolId, ComponentType<SymbolProps>> = {
  seven: SevenSymbol, bar: BarSymbol, crown: CrownSymbol,
  diamond: DiamondSymbol, cherry: CherrySymbol, bell: BellSymbol,
};

export function SlotSymbol({ id, size, lit }: { id: SymbolId; size?: number; lit?: boolean }) {
  const C = MAP[id];
  return <C size={size} lit={lit} />;
}
