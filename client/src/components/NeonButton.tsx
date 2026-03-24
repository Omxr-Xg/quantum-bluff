import { ReactNode } from "react";

interface NeonButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "red" | "blue" | "green" | "brightGreen" | "gold" | "amber";
  className?: string;
  icon?: ReactNode;
}

export function NeonButton({
  children,
  onClick,
  disabled = false,
  variant = "green",
  className = "",
  icon,
}: NeonButtonProps) {
  // Couleurs par variante
  const variantStyles = {
    red: {
      border: "rgb(239, 68, 68)", // red-500
      borderRgba: "239, 68, 68",
      bg: "rgb(239, 68, 68)",
    },
    blue: {
      border: "rgb(59, 130, 246)", // blue-500
      borderRgba: "59, 130, 246",
      bg: "rgb(59, 130, 246)",
    },
    green: {
      border: "rgb(7, 221, 0)", // néon vert original
      borderRgba: "7, 221, 0",
      bg: "rgb(7, 221, 0)",
    },
    brightGreen: {
      border: "rgb(0, 255, 0)", // Vert pur et ultra vif (Lime)
      borderRgba: "0, 255, 0",
      bg: "rgb(0, 255, 0)",
    },
    gold: {
      border: "rgb(251, 191, 36)", // bright gold
      borderRgba: "251, 191, 36",
      bg: "rgb(251, 191, 36)",
    },
    amber: {
      border: "rgb(245, 158, 11)", // amber-500 (variation of gold)
      borderRgba: "245, 158, 11",
      bg: "rgb(245, 158, 11)",
    },
  };

  const style = variantStyles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      // On ajoute le nom de la variante dans la classe pour la rendre unique !
      className={`neon-button-${variant} group ${className} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      style={{
        position: "relative",
        border: `2px solid ${style.border}`,
        background: "transparent",
        color: disabled ? "rgba(255, 255, 255, 0.3)" : "rgba(255, 255, 255, 0.9)",
        overflow: "hidden",
        textTransform: "uppercase",
        fontWeight: "500",
        letterSpacing: "1.5px",
        boxShadow: disabled
          ? "none"
          : `0 0 11px 2px rgba(${style.borderRgba}, 0.6)`,
        transition: "all 0.2s ease-in",
      }}
    >
      <style>{`
        /* On cible spécifiquement la variante dans le CSS */
        .neon-button-${variant}:not(:disabled):hover {
          background: ${style.bg} !important;
          box-shadow: 0 0 30px 5px rgba(${style.borderRgba}, 0.815) !important;
          color: #ffffff !important;
          font-weight: 600 !important;
          transition: all 0.2s ease-out !important;
        }

        .neon-button-${variant}::before {
          content: '';
          display: block;
          width: 0px;
          height: 86%;
          position: absolute;
          top: 7%;
          left: 0%;
          opacity: 0;
          background: #fff;
          box-shadow: 0 0 50px 30px #fff;
          transform: skewX(-20deg);
        }

        .neon-button-${variant}:not(:disabled):hover::before {
          animation: neon-shine-${variant} 0.5s 0s linear;
        }

        @keyframes neon-shine-${variant} {
          from {
            opacity: 0;
            left: 0%;
          }
          50% {
            opacity: 1;
          }
          to {
            opacity: 0;
            left: 100%;
          }
        }

        .neon-button-${variant}:active:not(:disabled) {
          box-shadow: 0 0 0 0 transparent !important;
          transition: box-shadow 0.2s ease-in !important;
        }
      `}</style>
      
      <div className="flex items-center gap-2 justify-center relative z-10">
        {icon}
        {children}
      </div>
    </button>
  );
}