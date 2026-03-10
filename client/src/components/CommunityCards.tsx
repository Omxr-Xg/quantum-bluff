import { ChipStack } from "./ChipStack";
import { motion } from "motion/react";
import { QuantumBluffLogo } from "../assets/logo";
import { useDeviceType } from "./ui/use-mobile";

interface Card {
  suit: string;
  value: string;
}

interface CommunityCardsProps {
  cards: (Card | null)[];
  pot: number;
  colorblindMode?: boolean;
}

export function CommunityCards({ cards, pot, colorblindMode = false }: CommunityCardsProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  
  const getSuitSymbol = (suit: string) => {
    const suits: { [key: string]: string } = {
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣',
      spades: '♠',
    };
    return suits[suit] || '';
  };

  const getSuitColor = (suit: string) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
  };

  // Mode daltonien : formes/motifs différents
  const getSuitShape = (suit: string) => {
    if (!colorblindMode) return null;
    
    const shapes: { [key: string]: string } = {
      hearts: '●',     // Cercle plein pour Cœur
      diamonds: '◆',   // Losange plein pour Carreau
      clubs: '■',      // Carré plein pour Trèfle
      spades: '▲',     // Triangle pour Pique
    };
    return shapes[suit] || '';
  };

  return (
    <div className={`absolute ${isMobile ? 'top-6' : isTablet ? 'top-9' : 'top-12'} left-0 right-0 flex justify-center`}>
      <div className={`flex flex-col items-center ${isMobile ? 'gap-3' : isTablet ? 'gap-4' : 'gap-6'}`}>
        
        {/* Pot total - Transparent, noirci sans jaune, avec jeton LOGO PURE */}
        <div className={`bg-black/40 backdrop-blur-sm rounded-full ${isMobile ? 'px-2 py-1' : isTablet ? 'px-2.5 py-1' : 'px-3 py-1.5'} shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/10`}>
          <div className={`flex items-center justify-center ${isMobile ? 'gap-1' : isTablet ? 'gap-1.5' : 'gap-2'}`}>
            {/* POT */}
            <div className={`${isMobile ? 'text-[8px]' : isTablet ? 'text-[9px]' : 'text-[10px]'} text-gray-300 font-bold tracking-wider`}>POT</div>
            
            {/* Jeton pure (Juste l'image du logo) - Rétabli ici */}
            <div className={`${isMobile ? 'w-4 h-4' : isTablet ? 'w-5 h-5' : 'w-6 h-6'} flex-shrink-0 drop-shadow-md`}>
              <QuantumBluffLogo 
                className="w-full h-full object-contain"
              />
            </div>
            
            {/* Montant - Blanc éclatant */}
            <div className={`${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-base'} text-white font-extrabold tracking-tight drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]`}>
              {pot.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Cartes communes - Réalistes avec animations */}
        <div className={`flex ${isMobile ? 'gap-1' : isTablet ? 'gap-1.5' : 'gap-2'}`}>
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, rotateY: 180, opacity: 0 }}
              animate={card ? { 
                scale: 1, 
                rotateY: 0, 
                opacity: 1 
              } : { scale: 1, opacity: 1 }}
              transition={{ 
                duration: 0.5, 
                ease: "easeOut",
                type: "spring",
                stiffness: 200,
                delay: card ? index * 0.1 : 0
              }}
              className={`relative ${isMobile ? 'w-9 h-13' : isTablet ? 'w-10 h-15' : 'w-12 h-18'} rounded flex flex-col items-center justify-center ${isMobile ? 'p-0.5' : 'p-1'} ${
                card 
                  ? 'bg-white border-2 border-gray-300 shadow-md' // Carte réaliste
                  : 'bg-black/10 border-white/20 border-dashed border-2' // Emplacement vide
              }`}
            >
              {card ? (
                <>
                  {/* Valeur en haut - Responsive */}
                  <div className={`${isMobile ? 'text-sm' : isTablet ? 'text-sm' : 'text-base'} font-bold ${getSuitColor(card.suit)} absolute ${isMobile ? 'top-0.5 left-1' : 'top-1 left-1.5'}`}>
                    {card.value}
                    {colorblindMode && (
                      <span className={`ml-0.5 ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}>{getSuitShape(card.suit)}</span>
                    )}
                  </div>
                  
                  {/* Symbole au centre - Responsive */}
                  <div className={`${isMobile ? 'text-xl' : isTablet ? 'text-xl' : 'text-2xl'} ${getSuitColor(card.suit)}`}>
                    {getSuitSymbol(card.suit)}
                  </div>
                  
                  {/* Valeur en bas (inversée) - Responsive */}
                  <div className={`${isMobile ? 'text-sm' : isTablet ? 'text-sm' : 'text-base'} font-bold ${getSuitColor(card.suit)} rotate-180 absolute ${isMobile ? 'bottom-0.5 right-1' : 'bottom-1 right-1.5'}`}>
                    {card.value}
                    {colorblindMode && (
                      <span className={`ml-0.5 ${isMobile ? 'text-[8px]' : 'text-[10px]'} rotate-180 inline-block`}>{getSuitShape(card.suit)}</span>
                    )}
                  </div>
                </>
              ) : null}
            </motion.div>
          ))}
        </div>

        {/* Labels des phases - Responsive */}
        <div className={`flex ${isMobile ? 'gap-1' : isTablet ? 'gap-1.5' : 'gap-2'} ${isMobile ? 'text-[8px]' : isTablet ? 'text-[9px]' : 'text-[10px]'} text-white/70 font-semibold`}>
          <span className={`${isMobile ? 'w-9' : isTablet ? 'w-10' : 'w-12'} text-center`}>FLOP</span>
          <span className={`${isMobile ? 'w-9' : isTablet ? 'w-10' : 'w-12'} text-center`}>FLOP</span>
          <span className={`${isMobile ? 'w-9' : isTablet ? 'w-10' : 'w-12'} text-center`}>FLOP</span>
          <span className={`${isMobile ? 'w-9' : isTablet ? 'w-10' : 'w-12'} text-center`}>TURN</span>
          <span className={`${isMobile ? 'w-9' : isTablet ? 'w-10' : 'w-12'} text-center`}>RIVER</span>
        </div>
      </div>
    </div>
  );
}