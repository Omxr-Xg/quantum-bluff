import { ReactNode } from "react";
import { logoDataUrl } from "../assets/logo";
import logoSrc from "../assets/logo-personnel.png";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { PokerCard } from "./PokerCard";
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
  /** Nombre de cartes brûlées à afficher face cachée dans le conteneur dédié */
  burnedCardsCount?: number;
}

// Dimensions de base (référence pour le calcul des positions)
const BASE_TABLE_WIDTH = 950;
const BASE_TABLE_HEIGHT = 420;

export function PokerTable({
  players,
  children,
  communitySafeZone: _communitySafeZone = 180,
  phase,
  burnedCardsCount = 0,
}: PokerTableProps) {

  const isShowdown = phase === "showdown";

  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  const getPlayerPosition = (position: number, total: number) => {
    if (total <= 0) return { x: 0, y: 0 };
    const tableWidth = BASE_TABLE_WIDTH;
    const tableHeight = BASE_TABLE_HEIGHT;

    const radiusX = tableWidth / 2;
    const radiusY = tableHeight / 2;

    const startAngle = Math.PI / 2; // Position 0 en bas
    const angleStep = (2 * Math.PI) / total;

    const angle = startAngle + (position * angleStep);

    let x = radiusX * Math.cos(angle);
    let y = radiusY * Math.sin(angle);

    // Ajustements pour éviter que les joueurs se chevauchent
    if (position === 0) {
      y = y + (isMobile ? 75 : isTablet ? 85 : 95);
    } else {
      if (Math.abs(x) > 10) {
        x = x * (isMobile ? 1.15 : 1.1);
      }
      if (y < -10) {
        y = y - (isMobile ? 55 : isTablet ? 65 : 75);
      } else if (y > 10) {
        y = y + (isMobile ? 40 : 30);
      }
    }

    return { x, y };
  };

  return (
    <div
      className="relative w-full h-full flex items-center justify-center min-h-0"
      style={{
        perspective: isMobile ? "800px" : isTablet ? "1000px" : "1200px",
      }}
    >
      {/* Wrapper proportionnel : clamp(min, préféré, max) pour PC, tablette, téléphone */}
      <div
        className="relative flex items-center justify-center"
        style={{
          width: "clamp(280px, 85vw, 950px)",
          aspectRatio: `${BASE_TABLE_WIDTH} / ${BASE_TABLE_HEIGHT}`,
        }}
      >
        {/* Conteneur cartes brûlées - à gauche de la table, face cachée */}
        {burnedCardsCount > 0 && (
          <div
            className="absolute right-full mr-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none"
            title="Cartes brûlées"
            aria-label={`${burnedCardsCount} carte(s) brûlée(s)`}
          >
            <span className="text-[10px] md:text-xs text-amber-200/90 font-medium uppercase tracking-wide">Brûlées</span>
            <div className="flex -space-x-2 md:-space-x-3">
              {Array.from({ length: Math.min(burnedCardsCount, 5) }).map((_, i) => (
                <PokerCard
                  key={i}
                  suit="hearts"
                  value="A"
                  size="xs"
                  faceDown
                  className="shadow-md"
                />
              ))}
              {burnedCardsCount > 5 && (
                <span className="text-amber-200/80 text-[10px] self-center pl-1">+{burnedCardsCount - 5}</span>
              )}
            </div>
          </div>
        )}

        {/* TABLE - remplit le wrapper */}
        <div
          className="relative w-full h-full rounded-full border-[clamp(3px,1vw,8px)] border-amber-900/80"
          style={{
            background:
              "radial-gradient(ellipse at center, #0d9660 0%, #0a7c4a 35%, #065a36 70%, #043d24 100%)",
            transform: `rotateX(${isMobile ? "20deg" : isTablet ? "22deg" : "25deg"})`,
            boxShadow:
              "inset 0 8px 24px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Logo central - proportionnel */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div
              className="rounded-full overflow-hidden w-[25%] aspect-square max-w-[220px] max-h-[220px]"
              style={{
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
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 flex justify-center">
            {children}
          </div>
        </div>

        {/* PLAYERS - positions en % pour scaling proportionnel (offset = rayon * factor) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {players.map((player) => {
            const pos = getPlayerPosition(player.position, players.length);
            const radiusX = BASE_TABLE_WIDTH / 2;
            const radiusY = BASE_TABLE_HEIGHT / 2;
            const xPercent = (pos.x / radiusX) * 50;
            const yPercent = (pos.y / radiusY) * 50;

            return (
              <div
                key={player.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{
                  left: `calc(50% + ${xPercent}%)`,
                  top: `calc(50% + ${yPercent}%)`,
                }}
              >

              <div className="flex flex-col items-center gap-2">

                {/* DEALER BUTTON - simple marqueur de position (disque blanc avec D) */}
                {player.isDealer && (
                  <div
                    className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-bold text-xs md:text-sm shadow-md"
                    title="Dealer"
                  >
                    D
                  </div>
                )}

                {/* TURN INDICATOR */}
                {player.isActive && (
                  <div className="inline-flex items-center gap-1 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                    <Clock className="w-3 h-3 animate-pulse" />
                    SON TOUR
                  </div>
                )}

                {/* AVATAR - taille proportionnelle (clamp pour mobile/tablette/PC) */}
                <div
                  className={`rounded-full overflow-hidden border-2 transition relative
                  ${player.position === 0 ? "w-[clamp(3rem,10vw,5rem)] h-[clamp(3rem,10vw,5rem)]" : "w-[clamp(2.5rem,8vw,3.5rem)] h-[clamp(2.5rem,8vw,3.5rem)]"}
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

                  {/* Indicateur connexion (vert = actif, rouge = déconnecté) - multijoueur */}
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${
                      player.isConnected !== false ? "bg-green-500 animate-pulse" : "bg-red-500"
                    }`}
                    title={player.isConnected !== false ? "En ligne" : "Hors ligne"}
                    aria-hidden="true"
                  />

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
                    {player.cards.map((card, index) => (
                      <PokerCard
                        key={index}
                        suit={card.suit}
                        value={card.value}
                        size="sm"
                        faceDown={!isShowdown}
                      />
                    ))}
                  </div>
                )}

              </div>
            </div>
          );

        })}

        </div>
      </div>
    </div>
  );
}