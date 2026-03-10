import { ReactNode } from "react";
import { logoDataUrl } from "../assets/logo";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";

interface Card {
  suit: string;
  value: string;
}

interface Player {
  id: number;
  name: string;
  chips: number;
  bet: number;
  position: number;
  isActive: boolean;
  isDealer?: boolean;
  cards?: Card[];
  isConnected?: boolean;
}

interface PokerTableProps {
  players: Player[];
  children?: ReactNode;
  communitySafeZone?: number;
}

export function PokerTable({
  players,
  children,
  communitySafeZone: _communitySafeZone = 180,
}: PokerTableProps) {

  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  
  const getPlayerPosition = (position: number, total: number) => {

    const tableWidth = isMobile ? 320 : isTablet ? 650 : 950;
    const tableHeight = isMobile ? 180 : isTablet ? 300 : 420;

    const radiusX = tableWidth / 2;
    const radiusY = tableHeight / 2;

    const startAngle = Math.PI / 2;
    const angleStep = (2 * Math.PI) / total;

    const angle = startAngle + (position * angleStep);

    const x = radiusX * Math.cos(angle);
    let y = radiusY * Math.sin(angle);

    if (position === 0) {
      y = y + (isMobile ? 20 : isTablet ? 30 : 40);
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
        } rounded-full`}
        style={{
          background:
            "radial-gradient(ellipse at center,#1b8c47 0%,#0b4522 100%)",
          transform: `rotateX(${
            isMobile ? "20deg" : isTablet ? "22deg" : "25deg"
          })`,
          boxShadow: "inset 0 6px 15px rgba(0,0,0,0.7)",
        }}
      >

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
                  <div className="inline-flex items-center gap-1 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold">
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
                  } rounded-full overflow-hidden bg-blue-500 border-2 border-white`}
                >

                  {getPlayerAvatar(player.name) ? (
                    <ImageWithFallback
                      src={getPlayerAvatar(player.name)}
                      alt={player.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-white font-bold">
                      {player.name.charAt(0)}
                    </div>
                  )}

                </div>

                {/* NAME */}
                <div className="bg-black text-white text-xs px-2 py-1 rounded">
                  {player.name}
                </div>

                {/* CHIPS */}
                <div className="flex items-center gap-1 text-white text-sm font-bold">

                  <img
                    src={logoDataUrl}
                    alt="token"
                    className="w-4 h-4"
                  />

                  {player.chips.toLocaleString()}

                </div>

                {/* PLAYER CARDS */}
                {player.cards && player.cards.length > 0 && (
                  <div className="flex gap-1">

                    {player.cards.map((card, index) => (
                      <div
                        key={index}
                        className="w-10 h-14 bg-white rounded border flex flex-col justify-between p-1"
                      >

                        <div className={`text-xs font-bold ${getSuitColor(card.suit)}`}>
                          {card.value}
                        </div>

                        <div className={`text-lg text-center ${getSuitColor(card.suit)}`}>
                          {getSuitSymbol(card.suit)}
                        </div>

                        <div
                          className={`text-xs font-bold rotate-180 ${getSuitColor(card.suit)}`}
                        >
                          {card.value}
                        </div>

                      </div>
                    ))}

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