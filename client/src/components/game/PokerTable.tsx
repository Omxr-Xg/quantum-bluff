import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChipIcon } from "../ChipIcon";
import { getPlayerAvatar } from "@/utils/avatars";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { Clock } from "lucide-react";
import { useDeviceType } from "../ui/use-mobile";
import { calculatePlayerPositions } from "../../utils/tablePositions";

const getPlayerCountryCode = (playerId: number): string => {
  const countryCodes = ["us", "gb", "ca", "de", "fr", "es", "it", "nl", "au", "br", "mx", "at"];
  return countryCodes[playerId % countryCodes.length];
};

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
  avatar?: string;
}

interface PokerTableProps {
  players: Player[];
  children?: ReactNode;
  heroSeatId?: string | number | null;
}

export function PokerTable({ players, children, heroSeatId = null }: PokerTableProps) {
  const { t } = useTranslation();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  
  const allPositions = calculatePlayerPositions(players.length > 0 ? players.length : 1, isMobile, isTablet);

  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
    
      {/* SCALE WRAPPER */}
      <div className={`${isMobile ? 'scale-[0.75]' : isTablet ? 'scale-[0.85]' : 'scale-100'} origin-top`}>
      
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{ perspective: isMobile ? '800px' : isTablet ? '1000px' : '1200px' }}
        >
          {/* Poker table with 3D effect */}
          <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
            
            {/* 1. Table base */}
            <div 
              className={`absolute ${isMobile ? 'w-[320px] h-[180px]' : isTablet ? 'w-[650px] h-[300px]' : 'w-[950px] h-[420px]'} rounded-full`}
              style={{
                background: '#0a0a0a',
                transform: `rotateX(${isMobile ? '20deg' : isTablet ? '22deg' : '25deg'}) translateZ(-${isMobile ? '20px' : isTablet ? '30px' : '40px'})`,
                boxShadow: isMobile 
                  ? '0 20px 40px -10px rgba(0, 0, 0, 0.9)' 
                  : '0 45px 80px -15px rgba(0, 0, 0, 0.95)',
                zIndex: 1
              }}
            />

            {/* 2. Outer leather cushion */}
            <div 
              className={`${isMobile ? 'w-[320px] h-[180px]' : isTablet ? 'w-[650px] h-[300px]' : 'w-[950px] h-[420px]'} rounded-full relative`}
              style={{
                background: 'linear-gradient(180deg, #2c2f33 0%, #111214 100%)',
                transform: `rotateX(${isMobile ? '20deg' : isTablet ? '22deg' : '25deg'})`,
                boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.1), 0 10px 20px rgba(0,0,0,0.5)',
                zIndex: 2
              }}
            >
              {/* 3. Copper trim */}
              <div 
                className="absolute rounded-full"
                style={{
                  inset: isMobile ? '12px' : isTablet ? '22px' : '30px',
                  background: 'linear-gradient(180deg, #d39364 0%, #7d441c 100%)',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.8)'
                }}
              >
                {/* 4. Green felt */}
                <div 
                  className="absolute rounded-full overflow-hidden"
                  style={{
                    inset: isMobile ? '3px' : isTablet ? '6px' : '8px',
                    background: 'radial-gradient(ellipse at center, #1b8c47 0%, #0b4522 100%)',
                    boxShadow: 'inset 0 6px 15px rgba(0,0,0,0.7)'
                  }}
                >
                  <div 
                    className="absolute rounded-full border-[1.5px] border-white/20" 
                    style={{ inset: isMobile ? '15px' : isTablet ? '30px' : '45px' }}
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_60%)] pointer-events-none" />

                  {/* Community cards */}
                  <div 
                    className={`absolute ${isMobile ? 'top-10' : isTablet ? 'top-12' : 'top-16'} left-1/2 -translate-x-1/2 w-full flex justify-center`} 
                    style={{ zIndex: 5 }}
                  >
                    {children}
                  </div>
                </div>
              </div>
            </div>
          </div> {/* preserve-3d */}
        </div> {/* perspective container */}
      </div> {/* scale wrapper */}

      {/* Players around the table */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 50 }}>
        
        {/* Player bets */}
        {players.map((player) => {
          if (player.bet <= 0) return null;
          
          const betEllipseRadiusX = isMobile ? 80 : isTablet ? 190 : 280;
          const betEllipseRadiusY = isMobile ? 40 : isTablet ? 90 : 130;
          
          const startAngle = Math.PI / 2; 
          const angleStep = (2 * Math.PI) / players.length;
          const angle = startAngle + (player.position * angleStep);
          
          const betX = betEllipseRadiusX * Math.cos(angle);
          const betY = betEllipseRadiusY * Math.sin(angle);
          
          return (
            <div
              key={`bet-${player.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{ left: `calc(50% + ${betX}px)`, top: `calc(50% + ${betY}px)`, zIndex: 60 }}
            >
              <div className="flex items-center gap-1.5">
                <div className={`relative ${isMobile ? 'w-5 h-5' : isTablet ? 'w-6 h-6' : 'w-7 h-7'} drop-shadow-md`}>
                  <div className="absolute inset-0 bg-[#5c1616] rounded-full translate-y-[3px]" />
                  <div className="absolute inset-0 z-10">
                    <ChipIcon size="md" className="w-full h-full" />
                  </div>
                </div>
                <div className={`text-white font-bold ${isMobile ? 'text-[10px]' : isTablet ? 'text-[11px]' : 'text-xs'} whitespace-nowrap drop-shadow-md`}>
                  {player.bet.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Player avatars */}
        {players.map((player) => {
          const pos = allPositions[player.position]; 

          return (
            <div
              key={player.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{
                left: `calc(50% + ${pos.x}px)`,
                top: `calc(50% + ${pos.y}px)`,
                zIndex: player.position === 0 ? 100 : 50, 
              }}
            >
              <div className={`flex items-center ${isMobile ? 'gap-2' : isTablet ? 'gap-2.5' : 'gap-3'}`}>
                <div className="flex flex-col items-center gap-1 relative">
                  {player.isActive && player.position !== 0 && (
                    <div className="whitespace-nowrap mb-0.5">
                      <div className={`inline-flex items-center ${isMobile ? 'gap-1' : 'gap-1.5'} bg-yellow-400 text-gray-900 ${isMobile ? 'px-1.5 py-0.5' : isTablet ? 'px-1.5 py-0.5' : 'px-2 py-0.5'} rounded-full font-bold ${isMobile ? 'text-[9px]' : isTablet ? 'text-[10px]' : 'text-xs'} shadow-xl`}>
                        <Clock className={`${isMobile ? 'w-2.5 h-2.5' : isTablet ? 'w-2.5 h-2.5' : 'w-3 h-3'} animate-pulse`} />
                        <span>{t('game.theirTurn')}</span>
                      </div>
                    </div>
                  )}

                  <div className="relative z-10">
                    <div className={`${
                      player.position === 0 
                        ? (isMobile ? 'w-14 h-14' : isTablet ? 'w-16 h-16' : 'w-20 h-20')
                        : (isMobile ? 'w-11 h-11' : isTablet ? 'w-13 h-13' : 'w-16 h-16')
                    } rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl transition-all ${
                      player.isActive ? "border-2 border-yellow-300 scale-105" : "border-2 border-white"
                    }`}>
                      {getPlayerAvatar(player.name, player.id, heroSeatId, player.avatar) ? (
                        <ImageWithFallback
                          src={getPlayerAvatar(player.name, player.id, heroSeatId, player.avatar) || ''}
                          alt={`${player.name}'s avatar`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className={`text-white font-bold ${
                          player.position === 0 ? (isMobile ? 'text-xl' : 'text-3xl') : 'text-lg'
                        }`}>
                          {player.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    
                    {player.position !== 0 && (
                      <div 
                        className={`absolute bottom-0 right-0 ${isMobile ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-white shadow-xl flex items-center justify-center border-2 border-gray-300 overflow-hidden`}
                        style={{ transform: 'translate(-20%, -10%)', zIndex: 35 }}
                      >
                        <img 
                          src={`https://flagcdn.com/w40/${getPlayerCountryCode(player.id)}.png`} 
                          className="w-full h-full object-cover" 
                          alt={`Flag of player ${player.id}`}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}