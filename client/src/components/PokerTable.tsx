import { ReactNode } from "react";
import { logoDataUrl } from "../assets/logo";
import logoSrc from "../assets/logo-personnel.png";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";

interface Card {
  suit: string;
  value: string;
}

interface Player {
  id: number | string;
  name: string;
  chips: number;
  bet: number;
  position: number;
  isActive: boolean;
  isDealer?: boolean;
  cards?: Card[];
  isConnected?: boolean;
  hasFolded?: boolean;
  /** Dernière action affichée à côté de l'avatar (ex: "a checké", "s'est couché") */
  lastAction?: string | null;
}

interface PokerTableProps {
  players: Player[];
  children?: ReactNode;
  communitySafeZone?: number;
  phase?: string;
}

export function PokerTable({
  players,
  children,
  communitySafeZone: _communitySafeZone = 180,
  phase,
}: PokerTableProps) {

  const isShowdown = phase === "showdown";

  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  const getPlayerPosition = (position: number, total: number) => {
    const tableWidth = isMobile ? 320 : isTablet ? 650 : 950;
    const tableHeight = isMobile ? 180 : isTablet ? 300 : 420;

    const radiusX = tableWidth / 2;
    const radiusY = tableHeight / 2;

    const startAngle = Math.PI / 2; // Position 0 en bas
    const angleStep = (2 * Math.PI) / total;

    const angle = startAngle + (position * angleStep);

    // On utilise "let" car on va ajuster ces valeurs
    let x = radiusX * Math.cos(angle);
    let y = radiusY * Math.sin(angle);

    // 📱 FIX MOBILE : L'éclatement des joueurs pour éviter qu'ils ne se montent dessus
    if (position === 0) {
      // Toi (tout en bas) : On te garde bien bas pour dégager le Flop
      y = y + (isMobile ? 75 : isTablet ? 85 : 95);
    } else {
      // 1. Écartement Horizontal (Gauche / Droite)
      // Si le joueur n'est pas pile au centre (haut/bas), on l'écarte vers les bords de l'écran
      if (Math.abs(x) > 10) {
        x = x * (isMobile ? 1.15 : 1.1); // Pousse de 15% vers l'extérieur sur mobile
      }

      // 2. Écartement Vertical (Haut / Bas)
      if (y < -10) {
        // Zone Haute (Bot Beta, Gamma, Delta) -> On les tire fortement vers le HAUT
        y = y - (isMobile ? 55 : isTablet ? 65 : 75);
      } else if (y > 10) {
        // Zone Basse (Bot Alpha, Epsilon) -> On les tire fortement vers le BAS
        y = y + (isMobile ? 40 : 30);
      }
    }

    return { x, y };
  };

  const getSuitSymbol = (suit: string) => {
    const suits: { [key: string]: string } = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    };
    return suits[suit] || "";
  };

  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-gray-900";
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{
        perspective: isMobile
          ? "800px"
          : isTablet
          ? "1000px"
          : "1200px",
      }}
    >

      {/* TABLE */}
      <div
        className={`relative ${
          isMobile
            ? "w-[320px] h-[180px]"
            : isTablet
            ? "w-[650px] h-[300px]"
            : "w-[950px] h-[420px]"
        } rounded-full border-8 border-amber-900/80`}
        style={{
          background:
            "radial-gradient(ellipse at center, #0d9660 0%, #0a7c4a 35%, #065a36 70%, #043d24 100%)",
          transform: `rotateX(${
            isMobile ? "20deg" : isTablet ? "22deg" : "25deg"
          })`,
          boxShadow:
            "inset 0 8px 24px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.4)",
        }}
      >

        {/* Logo central en reflet sur le tapis */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden="true"
        >
          <div
            className="rounded-full overflow-hidden"
            style={{
              width: isMobile ? 120 : isTablet ? 180 : 220,
              height: isMobile ? 120 : isTablet ? 180 : 220,
              opacity: 0.12,
              filter: "blur(1px) grayscale(100%)",
              transform: "translateY(10px)",
            }}
          >
            <img
              src={logoSrc}
              alt="Quantum Bluff"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Community cards */}
        <div
          className={`absolute ${
            isMobile ? "top-8" : isTablet ? "top-12" : "top-16"
          } left-1/2 -translate-x-1/2 flex justify-center`}
        >
          {children}
        </div>

      </div>

      {/* PLAYERS */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">

        {players.map((player) => {

          const pos = getPlayerPosition(player.position, players.length);

          return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px)`,
              }}
            >

              <div className="flex flex-col items-center gap-2">

                {/* TURN INDICATOR */}
                {player.isActive && (
                  <div className="inline-flex items-center gap-1 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    <Clock className="w-3 h-3 animate-pulse" />
                    SON TOUR
                  </div>
                )}

                {/* AVATAR */}
                <div
                  className={`${
                    player.position === 0
                      ? "w-20 h-20"
                      : "w-14 h-14"
                  } rounded-full overflow-hidden border-2 transition relative
                  ${player.hasFolded ? "bg-red-900/60 border-red-500 grayscale" : "bg-blue-500 border-white"}
                  ${player.isActive ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                >

                  {getPlayerAvatar(player.name) ? (
                    <ImageWithFallback
                      src={getPlayerAvatar(player.name)}
                      alt={player.name}
                      className={`w-full h-full object-cover ${player.hasFolded ? "blur-[2px] opacity-40 brightness-50" : ""}`}
                    />
                  ) : (
                    <div className={`flex items-center justify-center h-full font-bold ${player.hasFolded ? "text-red-300 blur-[1px] opacity-50" : "text-white"}`}>
                      {player.name.charAt(0)}
                    </div>
                  )}

                  {player.hasFolded && (
                    <div className="absolute inset-0 bg-red-600/30 rounded-full" />
                  )}

                </div>

                {/* NAME */}
                <div className={`text-xs px-2 py-1 rounded font-medium ${player.hasFolded ? "bg-red-900/80 text-red-300 line-through" : "bg-black/90 text-white"}`}>
                  {player.name}
                </div>

                {/* LAST ACTION - à côté de l'avatar */}
                {player.lastAction && (
                  <div className="bg-emerald-600/95 text-white text-xs px-2 py-1 rounded border border-emerald-400/50 shadow-lg whitespace-nowrap max-w-[120px] truncate" title={player.lastAction}>
                    {player.lastAction}
                  </div>
                )}

                {/* CHIPS */}
                <div className="flex items-center gap-1 text-white text-sm font-bold transition hover:scale-105">

                  <img
                    src={logoDataUrl}
                    alt="token"
                    className="w-4 h-4"
                  />

                  {player.chips.toLocaleString()}

                </div>

                {/* PLAYER CARDS - hidden for hero (shown in PlayerDashboard), hidden when folded */}
                {player.cards && player.cards.length > 0 && !player.hasFolded && (player.position !== 0 && player.name !== "Vous") && (
                  <div className="flex gap-1">
                    {player.cards.map((card, index) => {
                      const showFaceUp = isShowdown;
                      if (showFaceUp) {
                        return (
                          <div
                            key={index}
                            className="w-10 h-14 bg-white rounded border flex flex-col justify-between p-1 shadow-md
                            transition transform hover:scale-110 hover:-translate-y-1 duration-200"
                          >
                            <div className={`text-xs font-bold ${getSuitColor(card.suit)}`}>{card.value}</div>
                            <div className={`text-lg text-center ${getSuitColor(card.suit)}`}>{getSuitSymbol(card.suit)}</div>
                            <div className={`text-xs font-bold rotate-180 ${getSuitColor(card.suit)}`}>{card.value}</div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={index}
                          className="w-10 h-14 bg-gradient-to-br from-red-800 to-red-950 rounded border-2 border-yellow-500/30 flex items-center justify-center shadow-md overflow-hidden
                          transition transform hover:scale-105 duration-200"
                        >
                          <img src={logoSrc} alt="card back" className="w-8 h-8 object-contain opacity-80" />
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </div>
          );

        })}

      </div>
    </div>
  );
}