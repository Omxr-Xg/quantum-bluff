import type { Ref } from "react";
import { motion } from "motion/react";
import { QuantumBluffLogo } from "../assets/logo";
import { useDeviceType } from "./ui/use-mobile";
import { PokerCard, PokerCardSlot } from "./PokerCard";
import { cardHighlightKey } from "../utils/cards";

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
  highlightCardKeys?: Set<string>;
}

export function CommunityCards({ cards, pot, sidePots, colorblindMode = false, potRef, boardRef, highlightCardKeys }: CommunityCardsProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";
  const boardCardWidth = isTablet ? 56 : 56;
  const boardGap = isTablet ? 6 : 6;
  const labelGap = isMobile ? 2 : isTablet ? 4 : 6;
  
  return (
    <div className="relative flex justify-center">
      <div className="relative flex flex-col items-center">
        {/* POT */}
        <div
          ref={potRef}
          className={`absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/40 backdrop-blur-sm ${
            isMobile ? "px-2 py-0.5" : isTablet ? "px-2.5 py-0.5" : "px-3 py-1"
          } shadow-[0_0_8px_rgba(0,0,0,0.45)]`}
        >
          <div
            className={`flex items-center justify-center ${
                isMobile ? "gap-1" : isTablet ? "gap-1" : "gap-1.5"
            }`}
          >
            <div
              className={`${
                isMobile ? "text-[9px]" : isTablet ? "text-[10px]" : "text-[11px]"
              } text-gray-300 font-bold tracking-wider`}
            >
              POT
            </div>

            <div
              className={`${
                isMobile ? "h-4 w-4" : isTablet ? "h-[1.125rem] w-[1.125rem]" : "h-5 w-5"
              } shrink-0 drop-shadow-md`}
            >
              <QuantumBluffLogo className="h-full w-full object-contain" />
            </div>

            <div
              className={`${
                isMobile ? "text-xs" : isTablet ? "text-sm" : "text-base"
              } font-extrabold tracking-tight text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]`}
            >
              {pot.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Side pots indicator */}
        {sidePots && sidePots.length > 1 && (
          <div className={`absolute bottom-full left-1/2 z-20 mb-11 flex -translate-x-1/2 flex-wrap justify-center ${isMobile ? "gap-1.5" : "gap-2.5"}`}>
            {sidePots.map((sp, i) => (
              <div
                key={i}
                className={`flex items-center rounded-full border border-white/10 bg-black/30 backdrop-blur-sm ${
                  isMobile ? "gap-1.5 px-2 py-1" : "gap-2 px-3 py-1"
                }`}
              >
                <span className={`font-bold text-amber-300 ${isMobile ? "text-[11px]" : "text-[13px]"}`}>
                  {i === 0 ? "Main" : `Side ${i}`}
                </span>
                <span className={`font-bold text-white ${isMobile ? "text-xs" : "text-sm"}`}>
                  {sp.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* COMMUNITY CARDS + labels (board) */}
        <div
          ref={boardRef}
          className={`place-items-center ${isMobile ? "flex flex-col items-center gap-2" : "grid"}`}
          style={
            isMobile
              ? undefined
              : {
                  display: "grid",
                  gridTemplateColumns: `repeat(5, ${boardCardWidth}px)`,
                  columnGap: `${boardGap}px`,
                  rowGap: `${labelGap}px`,
                }
          }
        >
          {isMobile ? (
            <>
              <div className="flex shrink-0 flex-row justify-center gap-x-1.5 px-2">
                {cards.map((card, index) => (
                  <motion.div
                    key={index}
                    className="flex shrink-0 items-center justify-center"
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
                        size="sm"
                        colorblindMode={colorblindMode}
                        highlight={Boolean(
                          highlightCardKeys?.size && highlightCardKeys.has(cardHighlightKey(card)),
                        )}
                      />
                    ) : (
                      <PokerCardSlot size="sm" />
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="mt-0.5 grid w-full max-w-[min(86vw,calc(100vw-2rem))] grid-cols-5 place-items-center text-[8px] font-semibold text-white/70">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={`phase-mobile-${i}`} className="px-px text-center">
                    {i <= 2 ? "FLOP" : i === 3 ? "TURN" : "RIVER"}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              {cards.map((card, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-center"
                  style={{ gridColumn: index + 1, gridRow: 1 }}
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
                      size={isTablet ? "sm" : "board"}
                      colorblindMode={colorblindMode}
                      highlight={Boolean(
                        highlightCardKeys?.size && highlightCardKeys.has(cardHighlightKey(card)),
                      )}
                    />
                  ) : (
                    <PokerCardSlot size={isTablet ? "sm" : "board"} />
                  )}
                </motion.div>
              ))}

              {[1, 2, 3].map((column) => (
                <span
                  key={`flop-${column}`}
                  className={`text-center font-semibold text-white/70 ${isTablet ? "text-[9px]" : "text-[10px]"}`}
                  style={{ gridColumn: column, gridRow: 2 }}
                >
                  FLOP
                </span>
              ))}
              <span
                className={`text-center font-semibold text-white/70 ${isTablet ? "text-[9px]" : "text-[10px]"}`}
                style={{ gridColumn: 4, gridRow: 2 }}
              >
                TURN
              </span>
              <span
                className={`text-center font-semibold text-white/70 ${isTablet ? "text-[9px]" : "text-[10px]"}`}
                style={{ gridColumn: 5, gridRow: 2 }}
              >
                RIVER
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
