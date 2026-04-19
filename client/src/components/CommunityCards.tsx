import type { Ref } from "react";
import { motion } from "motion/react";
import { QuantumBluffLogo } from "../assets/logo";
import { useDeviceType } from "./ui/use-mobile";
import { PokerCard, PokerCardSlot } from "./PokerCard";

interface Card {
  suit: string;
  value: string;
}

interface CommunityCardsProps {
  cards: (Card | null)[];
  pot: number;
  sidePots?: { amount: number; eligibleIds: string[] }[];
  colorblindMode?: boolean;
  /** Ref sur la pastille POT (tutoriel) */
  potRef?: Ref<HTMLDivElement>;
  /** Ref sur cartes communes + libellés Flop/Turn/River (tutoriel) */
  boardRef?: Ref<HTMLDivElement>;
}

export function CommunityCards({ cards, pot, sidePots, colorblindMode = false, potRef, boardRef }: CommunityCardsProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  
  return (
    <div
      className={`absolute ${
        isMobile ? "top-[38%]" : isTablet ? "top-9" : "top-12"
      } left-0 right-0 flex justify-center`}
    >
      <div
        className={`flex flex-col items-center ${
          isMobile ? "gap-3" : isTablet ? "gap-4" : "gap-6"
        }`}
      >
        {/* POT */}
        <div
          ref={potRef}
          className={`bg-black/40 backdrop-blur-sm rounded-full ${
            isMobile ? "px-2 py-1" : isTablet ? "px-2.5 py-1" : "px-3 py-1.5"
          } shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-white/10`}
        >
          <div
            className={`flex items-center justify-center ${
              isMobile ? "gap-1" : isTablet ? "gap-1.5" : "gap-2"
            }`}
          >
            <div
              className={`${
                isMobile ? "text-[8px]" : isTablet ? "text-[9px]" : "text-[10px]"
              } text-gray-300 font-bold tracking-wider`}
            >
              POT
            </div>

            <div
              className={`${
                isMobile ? "w-4 h-4" : isTablet ? "w-5 h-5" : "w-6 h-6"
              } flex-shrink-0 drop-shadow-md`}
            >
              <QuantumBluffLogo className="w-full h-full object-contain" />
            </div>

            <div
              className={`${
                isMobile ? "text-xs" : isTablet ? "text-sm" : "text-base"
              } text-white font-extrabold tracking-tight drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]`}
            >
              {pot.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Side pots indicator */}
        {sidePots && sidePots.length > 1 && (
          <div className={`flex ${isMobile ? 'gap-1' : 'gap-2'} flex-wrap justify-center`}>
            {sidePots.map((sp, i) => (
              <div
                key={i}
                className={`bg-black/30 backdrop-blur-sm rounded-full ${
                  isMobile ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
                } border border-white/10 flex items-center gap-1`}
              >
                <span className={`${isMobile ? 'text-[7px]' : 'text-[9px]'} text-amber-300 font-bold`}>
                  {i === 0 ? "Main" : `Side ${i}`}
                </span>
                <span className={`${isMobile ? 'text-[8px]' : 'text-[10px]'} text-white font-bold`}>
                  {sp.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* COMMUNITY CARDS + labels (board) */}
        <div
          ref={boardRef}
          className={`flex flex-col items-center ${isMobile ? "gap-1" : isTablet ? "gap-1.5" : "gap-2"}`}
        >
        <div className={`flex ${isMobile ? "gap-0.5" : isTablet ? "gap-1.5" : "gap-2"} items-center justify-center`}>
          {cards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ scale: 0, rotateY: 180, opacity: 0 }}
              animate={
                card
                  ? { scale: 1, rotateY: 0, opacity: 1 }
                  : { scale: 1, opacity: 1 }
              }
              transition={{
                duration: 0.5,
                ease: "easeOut",
                type: "spring",
                stiffness: 200,
                delay: card ? index * 0.1 : 0,
              }}
            >
              {card ? (
                <PokerCard
                  suit={card.suit}
                  value={card.value}
                  size={isMobile ? "xs" : isTablet ? "sm" : "md"}
                  colorblindMode={colorblindMode}
                />
              ) : (
                <PokerCardSlot size={isMobile ? "xs" : isTablet ? "sm" : "md"} />
              )}
            </motion.div>
          ))}
        </div>

        {/* PHASE LABELS */}
        <div
          className={`flex ${
            isMobile ? "gap-1" : isTablet ? "gap-1.5" : "gap-2"
          } ${
            isMobile ? "text-[8px]" : isTablet ? "text-[9px]" : "text-[10px]"
          } text-white/70 font-semibold`}
        >
          <span className={`${isMobile ? "w-9" : isTablet ? "w-10" : "w-12"} text-center`}>FLOP</span>
          <span className={`${isMobile ? "w-9" : isTablet ? "w-10" : "w-12"} text-center`}>FLOP</span>
          <span className={`${isMobile ? "w-9" : isTablet ? "w-10" : "w-12"} text-center`}>FLOP</span>
          <span className={`${isMobile ? "w-9" : isTablet ? "w-10" : "w-12"} text-center`}>TURN</span>
          <span className={`${isMobile ? "w-9" : isTablet ? "w-10" : "w-12"} text-center`}>RIVER</span>
        </div>
        </div>
      </div>
    </div>
  );
}
