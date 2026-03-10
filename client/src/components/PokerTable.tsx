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

export function PokerTable({ players, children, communitySafeZone = 180 }: PokerTableProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  
  const getPlayerCountryCode = (playerId: number) => {
    const countryCodes = ["us", "gb", "ca", "de", "fr", "es", "it", "nl", "au", "br", "mx", "at"];
    return countryCodes[playerId % countryCodes.length];
  };

  const getPlayerPosition = (position: number, total: number) => {
    const tableWidth = isMobile ? 320 : isTablet ? 650 : 950;
    const tableHeight = isMobile ? 180 : isTablet ? 300 : 420;
    const radiusX = tableWidth / 2;
    const radiusY = tableHeight / 2;
    
    const startAngle = Math.PI / 2; 
    const angleStep = (2 * Math.PI) / total; 
    
    const angle = startAngle + (position * angleStep);
    
    let x = radiusX * Math.cos(angle);
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
    <div className="relative w-full h-full flex items-center justify-center" style={{ perspective: isMobile ? '800px' : isTablet ? '1000px' : '1200px' }}>
      {/* Table de poker (Forme Pilule) avec effet 3D */}
      <div className="relative" style={{ transformStyle: 'preserve-3d' }}>
        
        {/* 1. Épaisseur 3D de la table (La base très sombre en dessous) */}
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
        ></div>

        {/* 2. Le Rebord extérieur en cuir noir (Cushion) */}
        <div 
          className={`${isMobile ? 'w-[320px] h-[180px]' : isTablet ? 'w-[650px] h-[300px]' : 'w-[950px] h-[420px]'} rounded-full relative`}
          style={{
            background: 'linear-gradient(180deg, #2c2f33 0%, #111214 100%)',
            transform: `rotateX(${isMobile ? '20deg' : isTablet ? '22deg' : '25deg'})`,
            boxShadow: 'inset 0 4px 6px rgba(255,255,255,0.1), 0 10px 20px rgba(0,0,0,0.5)',
            zIndex: 2
          }}
        >
          {/* 3. L'anneau métallique / cuivré intérieur (Copper Trim) */}
          <div 
            className="absolute rounded-full"
            style={{
              inset: isMobile ? '12px' : isTablet ? '22px' : '30px',
              background: 'linear-gradient(180deg, #d39364 0%, #7d441c 100%)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.8)'
            }}
          >
            {/* 4. Le Tapis Vert (Felt) */}
            <div 
              className="absolute rounded-full overflow-hidden"
              style={{
                inset: isMobile ? '3px' : isTablet ? '6px' : '8px', // Épaisseur de l'anneau métallique
                background: 'radial-gradient(ellipse at center, #1b8c47 0%, #0b4522 100%)',
                boxShadow: 'inset 0 6px 15px rgba(0,0,0,0.7)'
              }}
            >
              {/* Ligne blanche de mise (Racetrack) */}
              <div 
                className="absolute rounded-full border-[1.5px] border-white/20"
                style={{
                  inset: isMobile ? '15px' : isTablet ? '30px' : '45px',
                }}
              ></div>

              {/* Spotlight central discret */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1)_0%,transparent_60%)] pointer-events-none"></div>

              {/* Cartes communes au centre */}
              <div className={`absolute ${isMobile ? 'top-8' : isTablet ? 'top-12' : 'top-16'} left-1/2 -translate-x-1/2 w-full flex justify-center`} style={{ zIndex: 5 }}>
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Joueurs autour de la table */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 50 }}>
        {/* Mises des joueurs */}
        {players.map((player) => {
          if (player.bet <= 0) return null;
          
          const betEllipseRadiusX = isMobile ? 100 : isTablet ? 190 : 280;
          const betEllipseRadiusY = isMobile ? 50 : isTablet ? 90 : 130;
          
          const startAngle = Math.PI / 2; 
          const angleStep = (2 * Math.PI) / players.length;
          const angle = startAngle + (player.position * angleStep);
          
          const betX = betEllipseRadiusX * Math.cos(angle);
          const betY = betEllipseRadiusY * Math.sin(angle);
          
          return (
            <div
              key={`bet-${player.id}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
              style={{
                left: `calc(50% + ${betX}px)`,
                top: `calc(50% + ${betY}px)`,
                zIndex: 60,
              }}
            >
              <div className="flex items-center gap-1.5">
                {/* Jeton 3D - BORDEAUX FONCÉ */}
                <div className={`relative ${isMobile ? 'w-5 h-5' : isTablet ? 'w-6 h-6' : 'w-7 h-7'} drop-shadow-md`}>
                  {/* Tranche du jeton (Épaisseur 3D Bordeaux) */}
                  <div className="absolute inset-0 bg-[#5c1616] rounded-full translate-y-[3px]"></div>
                  
                  {/* Face du jeton (Le Logo) */}
                  <div className="absolute inset-0 z-10">
                    <img 
                      src={logoDataUrl} 
                      alt="Jeton" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                
                {/* Montant */}
                <div className={`text-white font-bold ${isMobile ? 'text-[10px]' : isTablet ? 'text-[11px]' : 'text-xs'} whitespace-nowrap drop-shadow-md`}>
                  {player.bet.toLocaleString()}
                </div>
              </div>
            </div>
          );
        })}
        
        {players.map((player) => {
          const pos = getPlayerPosition(player.position, players.length);
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
                {/* Info du joueur */}
                <div className="flex flex-col items-center gap-1 relative">
                  {/* Badge "SON TOUR" */}
                  {player.isActive && player.position !== 0 && (
                    <div className="whitespace-nowrap mb-0.5">
                      <div className={`inline-flex items-center ${isMobile ? 'gap-1' : 'gap-1.5'} bg-yellow-400 text-gray-900 ${isMobile ? 'px-1.5 py-0.5' : isTablet ? 'px-1.5 py-0.5' : 'px-2 py-0.5'} rounded-full font-bold ${isMobile ? 'text-[9px]' : isTablet ? 'text-[10px]' : 'text-xs'} shadow-xl`}>
                        <Clock className={`${isMobile ? 'w-2.5 h-2.5' : isTablet ? 'w-2.5 h-2.5' : 'w-3 h-3'} animate-pulse`} />
                        <span>SON TOUR</span>
                      </div>
                    </div>
                  )}

                  {/* Avatar */}
                  <div className="relative z-10">
                    {player.isActive && (() => {
                      const radius = player.position === 0 ? (isMobile ? 26 : isTablet ? 30 : 38) : (isMobile ? 20 : isTablet ? 24 : 30);
                      const circumference = 2 * Math.PI * radius;
                      return (
                        <svg
                          className={`absolute inset-0 ${
                            player.position === 0 
                              ? (isMobile ? 'w-14 h-14' : isTablet ? 'w-16 h-16' : 'w-20 h-20')
                              : (isMobile ? 'w-11 h-11' : isTablet ? 'w-13 h-13' : 'w-16 h-16')
                          } -rotate-90 pointer-events-none`}
                          style={{ zIndex: 100 }}
                        >
                          <circle
                            cx="50%"
                            cy="50%"
                            r={radius}
                            fill="none"
                            stroke="rgba(251, 191, 36, 0.3)"
                            strokeWidth={isMobile ? '2' : '3'}
                          />
                          <circle
                            cx="50%"
                            cy="50%"
                            r={radius}
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth={isMobile ? '2' : '3'}
                            strokeDasharray={circumference}
                            strokeDashoffset="0"
                            className="timer-progress"
                            style={{
                              animation: `timer-countdown 8s linear infinite`,
                            }}
                          />
                        </svg>
                      );
                    })()}
                    <div className={`${
                      player.position === 0 
                        ? (isMobile ? 'w-14 h-14' : isTablet ? 'w-16 h-16' : 'w-20 h-20')
                        : (isMobile ? 'w-11 h-11' : isTablet ? 'w-13 h-13' : 'w-16 h-16')
                    } rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-xl transition-all ${
                      player.isActive ? "border-2 border-yellow-300 scale-105" : "border-2 border-white"
                    }`}>
                      {getPlayerAvatar(player.name) ? (
                        <ImageWithFallback
                          src={getPlayerAvatar(player.name)}
                          alt={`${player.name}'s avatar`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className={`text-white font-bold ${
                          player.position === 0 
                            ? (isMobile ? 'text-xl' : isTablet ? 'text-2xl' : 'text-3xl')
                            : (isMobile ? 'text-lg' : isTablet ? 'text-xl' : 'text-2xl')
                        }`}>
                          {player.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    
                    {/* Indicateur de pays */}
                    {player.position !== 0 && (
                      <div 
                        className={`absolute bottom-0 right-0 ${isMobile ? 'w-4 h-4' : isTablet ? 'w-4.5 h-4.5' : 'w-5 h-5'} rounded-full bg-white shadow-xl flex items-center justify-center ${isMobile ? 'border' : 'border-2'} border-gray-300 overflow-hidden`}
                        style={{
                          transform: 'translate(-20%, -10%)',
                          zIndex: 35
                        }}
                      >
                        <img 
                          src={`https://flagcdn.com/w40/${getPlayerCountryCode(player.id)}.png`}
                          alt={`Drapeau ${getPlayerCountryCode(player.id)}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Cartes pour Diana (position 0) */}
                  {player.position === 0 && player.cards && player.cards.length > 0 && (
                    <div className={`flex gap-0 justify-center relative z-30 ${isMobile ? '-mt-4' : isTablet ? '-mt-5' : '-mt-6'}`}>
                      {player.cards.map((card, index) => (
                        <div
                          key={index}
                          className={`relative ${isMobile ? 'w-10 h-14' : isTablet ? 'w-12 h-17' : 'w-14 h-20'} rounded border-2 flex flex-col items-center justify-between ${isMobile ? 'p-0.5' : 'p-1'} bg-white border-yellow-400 shadow-lg transition-transform`}
                          style={{
                            transform: `rotate(${index === 0 ? -8 : 8}deg)`,
                            marginLeft: index > 0 ? (isMobile ? '-12px' : isTablet ? '-15px' : '-18px') : '0'
                          }}
                        >
                          <div className={`${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-sm'} font-bold ${getSuitColor(card.suit)}`}>
                            {card.value}
                          </div>
                          <div className={`${isMobile ? 'text-xl' : isTablet ? 'text-xl' : 'text-2xl'} ${getSuitColor(card.suit)}`}>
                            {getSuitSymbol(card.suit)}
                          </div>
                          <div
                            className={`${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-sm'} font-bold ${getSuitColor(card.suit)} rotate-180`}
                          >
                            {card.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cadre Nom et Solde */}
                  <div className={`relative flex flex-col z-40 ${player.position === 0 ? '-mt-1' : '-mt-2'}`}>
                    {/* Indicateur de connexion - En bas à droite du cadre */}
                    <div
                      className={`absolute -bottom-1.5 -right-1.5 ${isMobile ? 'w-2.5 h-2.5' : isTablet ? 'w-3 h-3' : 'w-3.5 h-3.5'} rounded-full border border-slate-950 shadow-lg ${
                        player.isConnected !== false ? "bg-green-500" : "bg-red-500"
                      } z-50`}
                      title={player.isConnected !== false ? "Connecté" : "Déconnecté"}
                    ></div>

                    {/* Cadre Principal divisé (Haut Noir, Bas Gris) */}
                    <div className={`flex flex-col rounded-lg overflow-hidden shadow-2xl border ${
                      player.isActive
                        ? "border-yellow-400 ring-1 ring-yellow-400/50"
                        : "border-slate-800/80"
                      } ${isMobile ? 'min-w-[90px]' : isTablet ? 'min-w-[110px]' : 'min-w-[130px]'}`}
                    >
                      {/* Partie Haute : Nom du joueur */}
                      <div className={`w-full text-center bg-black/90 ${isMobile ? 'py-0.5' : 'py-1'}`}>
                        <div className={`text-gray-300 ${isMobile ? 'text-[10px]' : isTablet ? 'text-xs' : 'text-sm'} font-normal tracking-wide truncate px-2`}>
                          {player.name}
                        </div>
                      </div>

                      {/* Partie Basse : Solde avec icône (Fond gris clair) */}
                      <div className={`w-full flex items-center justify-center bg-slate-700/90 ${isMobile ? 'gap-1 py-1' : 'gap-1.5 py-1.5'} px-2`}>
                        {/* Logo Jeton (sans fond, direct sur le gris) */}
                        <div className={`${isMobile ? 'w-3.5 h-3.5' : isTablet ? 'w-4 h-4' : 'w-4.5 h-4.5'} flex-shrink-0`}>
                          <img 
                            src={logoDataUrl} 
                            alt="Token" 
                            className="w-full h-full object-contain drop-shadow-md"
                          />
                        </div>
                        
                        {/* Solde en blanc */}
                        <div className={`text-white ${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-base'} font-bold tracking-tight`}>
                          {player.chips.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cartes du joueur (dos de cartes) */}
                {player.position !== 0 && player.cards && player.cards.length > 0 && (
                  <div className={`flex gap-0 ${isMobile ? '-ml-10' : isTablet ? '-ml-12' : '-ml-14'} relative z-0 ${isMobile ? '-mt-6' : isTablet ? '-mt-7' : '-mt-8'}`}>
                    {player.cards.map((_, index) => (
                      <div
                        key={index}
                        className={`${isMobile ? 'w-7 h-10' : isTablet ? 'w-8 h-12' : 'w-10 h-14'} bg-gradient-to-br from-red-600 via-red-700 to-red-900 rounded border-2 border-white shadow-lg relative overflow-hidden transition-transform`}
                        style={{
                          transform: `rotate(${index === 0 ? -8 : 8}deg)`,
                          marginLeft: index > 0 ? (isMobile ? '-10px' : isTablet ? '-12px' : '-14px') : '0'
                        }}
                      >
                        <div className={`absolute inset-0 flex items-center justify-center ${isMobile ? 'p-0.5' : 'p-1'}`}>
                          <img 
                            src={logoDataUrl} 
                            alt="Quantum Bluff" 
                            className="w-full h-full object-contain opacity-60"
                          />
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