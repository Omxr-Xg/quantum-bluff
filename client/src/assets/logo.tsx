// Logo Quantum Bluff - Style Luxury Champagne/Rolex
export const QuantumBluffLogo = ({ className = "w-12 h-12" }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Gradient definitions */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#FFD700", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "#FFA500", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#FF8C00", stopOpacity: 1 }} />
        </linearGradient>
        <radialGradient id="shimmer" cx="50%" cy="50%" r="50%">
          <stop offset="0%" style={{ stopColor: "#FFFFFF", stopOpacity: 0.4 }} />
          <stop offset="100%" style={{ stopColor: "#FFD700", stopOpacity: 0 }} />
        </radialGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer circle - Gold ring */}
      <circle
        cx="50"
        cy="50"
        r="48"
        stroke="url(#goldGradient)"
        strokeWidth="3"
        fill="none"
        filter="url(#glow)"
      />

      {/* Inner decorative circle */}
      <circle
        cx="50"
        cy="50"
        r="42"
        stroke="url(#goldGradient)"
        strokeWidth="1"
        fill="none"
        opacity="0.5"
      />

      {/* Quantum symbol - Stylized Q */}
      <path
        d="M 50 20 Q 65 20 65 35 Q 65 45 55 50 L 60 58 M 45 50 Q 35 45 35 35 Q 35 20 50 20"
        stroke="url(#goldGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
        filter="url(#glow)"
      />

      {/* Poker suits decorative elements */}
      {/* Spade top */}
      <path
        d="M 50 23 L 52 28 L 48 28 Z"
        fill="url(#goldGradient)"
        opacity="0.8"
      />

      {/* Diamond right */}
      <path
        d="M 67 50 L 69 52 L 67 54 L 65 52 Z"
        fill="url(#goldGradient)"
        opacity="0.8"
      />

      {/* Club bottom */}
      <circle cx="48" cy="70" r="2" fill="url(#goldGradient)" opacity="0.8" />
      <circle cx="52" cy="70" r="2" fill="url(#goldGradient)" opacity="0.8" />
      <circle cx="50" cy="67" r="2" fill="url(#goldGradient)" opacity="0.8" />

      {/* Heart left */}
      <path
        d="M 33 50 Q 31 48 33 46 Q 35 48 33 50 Z"
        fill="url(#goldGradient)"
        opacity="0.8"
      />

      {/* Center glow effect */}
      <circle cx="50" cy="50" r="15" fill="url(#shimmer)" opacity="0.3" />

      {/* Letter B for Bluff */}
      <text
        x="50"
        y="78"
        fontFamily="serif"
        fontSize="24"
        fontWeight="bold"
        fill="url(#goldGradient)"
        textAnchor="middle"
        filter="url(#glow)"
      >
        B
      </text>
    </svg>
  );
};

// Export logo as data URL for use in img tags
export const logoDataUrl = 'data:image/svg+xml,%3Csvg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3ClinearGradient id="g" x1="0%25" y1="0%25" x2="100%25" y2="100%25"%3E%3Cstop offset="0%25" style="stop-color:%23FFD700"/%3E%3Cstop offset="50%25" style="stop-color:%23FFA500"/%3E%3Cstop offset="100%25" style="stop-color:%23FF8C00"/%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx="50" cy="50" r="48" stroke="url(%23g)" stroke-width="3" fill="none"/%3E%3Ccircle cx="50" cy="50" r="42" stroke="url(%23g)" stroke-width="1" fill="none" opacity="0.5"/%3E%3Cpath d="M 50 20 Q 65 20 65 35 Q 65 45 55 50 L 60 58 M 45 50 Q 35 45 35 35 Q 35 20 50 20" stroke="url(%23g)" stroke-width="4" stroke-linecap="round" fill="none"/%3E%3Cpath d="M 50 23 L 52 28 L 48 28 Z" fill="url(%23g)" opacity="0.8"/%3E%3Cpath d="M 67 50 L 69 52 L 67 54 L 65 52 Z" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="48" cy="70" r="2" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="52" cy="70" r="2" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="50" cy="67" r="2" fill="url(%23g)" opacity="0.8"/%3E%3Cpath d="M 33 50 Q 31 48 33 46 Q 35 48 33 50 Z" fill="url(%23g)" opacity="0.8"/%3E%3Ccircle cx="50" cy="50" r="15" fill="white" opacity="0.1"/%3E%3Ctext x="50" y="78" font-family="serif" font-size="24" font-weight="bold" fill="url(%23g)" text-anchor="middle"%3EB%3C/text%3E%3C/svg%3E';

// Export as default avatar placeholder
export const defaultAvatarUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2310b981;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23059669;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Ccircle cx='50' cy='50' r='50' fill='url(%23grad)'/%3E%3Cpath d='M50 45 C40 45 35 35 35 35 C35 25 40 20 50 20 C60 20 65 25 65 35 C65 35 60 45 50 45 Z M50 50 C35 50 25 60 25 70 L25 80 L75 80 L75 70 C75 60 65 50 50 50 Z' fill='white' opacity='0.9'/%3E%3C/svg%3E";