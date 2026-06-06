import logoSrc from "../assets/logo-personnel.webp";

interface ChipIconProps {
  /** Taille : sm (16px), md (20px), lg (24px) */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_MAP = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };

/** Icône jeton utilisant le logo du jeu (Quantum Bluff) pour tous les affichages de jetons/chips */
export function ChipIcon({ size = "md", className = "" }: ChipIconProps) {
  return (
    <img
      src={logoSrc}
      alt=""
      className={`inline-block object-contain ${SIZE_MAP[size]} ${className}`}
      aria-hidden
    />
  );
}
