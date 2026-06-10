interface RocketIconProps {
  size?: number;
  className?: string;
  glowing?: boolean;
}

export function RocketIcon({ size = 32, className = "", glowing = false }: RocketIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glowing ? { filter: "drop-shadow(0 0 8px #60efff) drop-shadow(0 0 16px #7c3aed)" } : undefined}
    >
      <ellipse cx="20" cy="46" rx="5" ry="9" fill="url(#crashFlameL)" transform="rotate(-18 20 46)" />
      <ellipse cx="44" cy="46" rx="5" ry="9" fill="url(#crashFlameR)" transform="rotate(18 44 46)" />
      <ellipse cx="32" cy="50" rx="6" ry="13" fill="url(#crashFlameMain)" />
      <path
        d="M32 4 C20 4 14 18 14 32 L14 46 Q32 52 50 46 L50 32 C50 18 44 4 32 4Z"
        fill="url(#crashBodyGrad)"
      />
      <path d="M15 36 Q32 40 49 36 L49 40 Q32 44 15 40Z" fill="url(#crashStripe)" opacity="0.7" />
      <circle cx="32" cy="26" r="8" fill="url(#crashWindowGrad)" />
      <circle cx="32" cy="26" r="6" fill="url(#crashWindowInner)" />
      <circle cx="29.5" cy="23.5" r="2" fill="white" opacity="0.6" />
      <circle cx="32" cy="26" r="8" stroke="#60efff" strokeWidth="1.5" fill="none" opacity="0.8" />
      <path d="M14 40 L4 52 L14 48 Z" fill="url(#crashFinL)" />
      <path d="M50 40 L60 52 L50 48 Z" fill="url(#crashFinR)" />
      <path d="M32 4 C28 10 26 16 26 22 L38 22 C38 16 36 10 32 4Z" fill="url(#crashNoseGrad)" />
      <path d="M32 4 L30 12 L34 12 Z" fill="white" opacity="0.3" />
      <circle cx="22" cy="34" r="1.5" fill="white" opacity="0.4" />
      <circle cx="42" cy="34" r="1.5" fill="white" opacity="0.4" />
      <circle cx="22" cy="42" r="1.5" fill="white" opacity="0.4" />
      <circle cx="42" cy="42" r="1.5" fill="white" opacity="0.4" />
      <path
        d="M26 10 C24 16 23 24 23.5 36 L27 36 C26.5 24 27 16 29 10Z"
        fill="white"
        opacity="0.12"
      />
      <defs>
        <linearGradient id="crashBodyGrad" x1="14" y1="4" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="40%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#3730a3" />
        </linearGradient>
        <linearGradient id="crashNoseGrad" x1="26" y1="4" x2="38" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>
        <linearGradient id="crashFinL" x1="4" y1="40" x2="14" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="crashFinR" x1="60" y1="40" x2="50" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#4c1d95" />
        </linearGradient>
        <linearGradient id="crashStripe" x1="15" y1="38" x2="49" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60efff" stopOpacity="0" />
          <stop offset="50%" stopColor="#60efff" />
          <stop offset="100%" stopColor="#60efff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="crashWindowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="100%" stopColor="#0c4a6e" />
        </radialGradient>
        <radialGradient id="crashWindowInner" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#075985" />
        </radialGradient>
        <radialGradient id="crashFlameMain" cx="50%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="40%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="crashFlameL" cx="60%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="60%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="crashFlameR" cx="40%" cy="20%" r="80%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="60%" stopColor="#ea580c" />
          <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}
