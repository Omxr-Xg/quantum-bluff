import { type CSSProperties, type ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { PokerCard } from "../PokerCard";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { getPlayerAvatar } from "../../utils/avatars";
import { useTableTheme } from "../../contexts/TableThemeContext";
import logoSrc from "../../assets/logo-personnel.png";

export type BjCard = { rank: string; suit: string };

export type BjPhase = "betting" | "player_turn" | "dealer" | "payout";

export interface BjSeatPublic {
  userId: string;
  username: string;
  position: number;
  cards: BjCard[];
  bet: number;
  totalBet: number;
  doubled: boolean;
  playState: string;
  isCurrentTurn: boolean;
  handTotal?: number;
  avatarUrl?: string | null;
}

export interface BjPayoutSummaryRow {
  userId: string;
  username: string;
  payout: number;
  reason: string;
}

export interface BjTableState {
  gameId: string;
  roomId: string;
  phase: BjPhase;
  handNumber: number;
  minBet: number;
  dealerCards: BjCard[];
  dealerHoleHidden: boolean;
  seats: BjSeatPublic[];
  currentSeatUserId: string | null;
  payoutSummary?: BjPayoutSummaryRow[];
}

function mapSuitToPokerCard(s: string): string {
  switch (s) {
    case "h": return "hearts";
    case "d": return "diamonds";
    case "c": return "clubs";
    case "s": return "spades";
    default:
      return "spades";
  }
}

export function handValueFromCards(cards: BjCard[]): { total: number; soft: boolean; bust: boolean } {
  let sum = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.rank === "?" || c.suit === "?") continue;
    if (c.rank === "A") {
      aces++;
      sum += 11;
    } else if (c.rank === "J" || c.rank === "Q" || c.rank === "K" || c.rank === "10") {
      sum += 10;
    } else {
      sum += parseInt(c.rank, 10) || 0;
    }
  }
  while (sum > 21 && aces > 0) {
    sum -= 10;
    aces--;
  }
  const soft = aces > 0 && sum <= 21;
  return { total: sum, soft, bust: sum > 21 };
}

function dealerDisplayTotal(
  cards: BjCard[],
  holeHidden: boolean
): { text: string; sub?: string } {
  if (cards.length === 0) return { text: "—" };
  if (holeHidden && cards.length >= 2) {
    const first = cards[0];
    if (!first || first.rank === "?") return { text: "—" };
    const v = handValueFromCards([first]);
    return { text: `${v.total}`, sub: "+ ?" };
  }
  const v = handValueFromCards(cards);
  if (v.bust) return { text: "BUST", sub: String(v.total) };
  return { text: v.soft ? `S${v.total}` : String(v.total) };
}

const DEAL_STAGGER_SEC = 0.055;

export function PlayingCard({
  card,
  hidden,
  className = "",
  style,
}: {
  card?: BjCard;
  hidden?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const responsiveClasses = `!w-[min(3.3rem,16vw)] sm:!w-[min(4rem,20vw)] !h-auto aspect-[63/88] shrink-0 ${className}`;

  if (hidden || !card || card.suit === "?" || card.rank === "?") {
    return (
      <div style={style}>
        <PokerCard 
          suit="spades"
          value="A" 
          faceDown={true} 
          animated={true}
          cardEnter="soft"
          className={responsiveClasses} 
        />
      </div>
    );
  }

  return (
    <div style={style}>
      <PokerCard
        suit={mapSuitToPokerCard(card.suit)}
        value={card.rank}
        faceDown={false}
        animated={true}
        cardEnter="soft"
        className={responsiveClasses}
      />
    </div>
  );
}

function ChipStack({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <div className="relative flex h-8 w-12 items-end justify-center sm:h-9 sm:w-14">
      <div className="absolute bottom-0 h-7 w-7 rounded-full border-2 border-amber-200/80 bg-gradient-to-br from-amber-600 via-amber-800 to-amber-950 shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
      <div className="absolute bottom-1 h-7 w-7 rounded-full border-2 border-amber-200/60 bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950 shadow-[0_4px_8px_rgba(0,0,0,0.45)]" />
      <div className="absolute bottom-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-100 bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-950 text-[10px] font-black text-amber-100 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        $
      </div>
      <span className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-100 shadow">
        {amount}
      </span>
    </div>
  );
}

export function BlackjackMultiCasinoTable({
  state,
  userId,
  playerEffectiveMaxBet,
  children,
}: {
  state: BjTableState;
  userId: string | null;
  playerEffectiveMaxBet: number;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const { feltGradient, feltBorder } = useTableTheme();
  const [containerStyle, setContainerStyle] = useState<CSSProperties>({});

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const updateScale = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        let newScale = 1;
        if (width < 640) {
          newScale = 0.85;
        } else if (width < 1024) {
          newScale = 0.95;
        } else {
          newScale = 1;
        }
        // Écrans "desktop compacts" (ex: MacBook Air 13") : on réduit légèrement même si la largeur est grande.
        if (height < 900) newScale = Math.min(newScale, 0.96);
        if (height < 820) newScale = Math.min(newScale, 0.92);
        if (height < 760) newScale = Math.min(newScale, 0.88);

        /** Chrome : zoom réduit la boîte ; Safari/WebKit : transform:scale() ne la réduit pas → débordement. */
        const zoomSupported = (() => {
          if (typeof document === "undefined") return false;
          try {
            const el = document.createElement("div");
            el.style.setProperty("zoom", "0.5");
            return el.style.zoom === "0.5";
          } catch {
            return false;
          }
        })();

        if (zoomSupported) {
          setContainerStyle({ zoom: newScale });
        } else {
          // Safari/WebKit: fallback équivalent à zoom via transform.
          setContainerStyle({
            transform: `scale(${newScale})`,
            transformOrigin: "top center",
          });
        }
      }, 100);
    };

    updateScale();
    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
      if (timeout !== undefined) clearTimeout(timeout);
    };
  }, []);

  const phaseKey = `bjMulti.phase_${state.phase}` as const;
  const phaseLabel = t(phaseKey, { defaultValue: state.phase });

  const sortedSeats = [...state.seats].sort((a, b) => a.position - b.position);

  const dealerTot = dealerDisplayTotal(state.dealerCards, state.dealerHoleHidden);

  return (
    <div className="relative w-full overflow-x-hidden">
      <div 
        className="mx-auto w-[min(100%,54rem)] min-w-0 px-3 pb-6 sm:px-4"
        style={containerStyle}
      >
        <div
          className="relative overflow-hidden rounded-[2.4rem] border-[10px] p-2 shadow-[0_32px_80px_rgba(0,0,0,0.75),inset_0_2px_0_rgba(255,255,255,0.08)] sm:rounded-[3rem] sm:border-[12px] sm:p-3"
          style={{
            background:
              "linear-gradient(145deg, rgba(2,6,23,0.98) 0%, rgba(12,18,32,0.98) 45%, rgba(50,35,15,0.94) 100%)",
            borderColor: "rgba(212, 175, 55, 0.28)",
          }}
        >
          <div
            className="relative h-[clamp(27rem,min(80dvh,92svh),40rem)] overflow-hidden rounded-[2rem] border-[clamp(3px,0.8vw,8px)] shadow-[inset_0_0_110px_rgba(0,0,0,0.38),inset_0_12px_32px_rgba(255,255,255,0.045)] sm:h-[clamp(23rem,62dvh,35rem)] sm:rounded-[2.5rem]"
            style={{
              background: `
                radial-gradient(ellipse 115% 78% at 50% 18%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(ellipse 85% 55% at 50% 100%, rgba(0,0,0,0.48) 0%, transparent 52%),
                linear-gradient(90deg, rgba(0,0,0,0.28), transparent 18%, transparent 82%, rgba(0,0,0,0.28)),
                ${feltGradient}
              `,
              borderColor: feltBorder,
              borderStyle: "solid",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
              style={{
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />
            <div className="pointer-events-none absolute inset-3 rounded-[1rem] border border-[#c9a227]/25 shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] sm:inset-4 sm:rounded-[1.35rem]" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
              <img
                src={logoSrc}
                alt=""
                className="h-[34%] max-h-44 w-auto opacity-[0.075] saturate-0"
              />
            </div>

            <div className="relative z-10 flex flex-col items-center gap-0.5 px-4 pt-2 text-center sm:gap-1 sm:pt-6">
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#c9a227]/40 bg-black/35 px-4 py-1.5 shadow-lg backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#d4af37]/90">
                    {t("bjMulti.tableBrand")}
                  </span>
                  <span className="h-3 w-px bg-[#c9a227]/40" />
                  <span className="font-mono text-xs text-emerald-100/90">
                    {t("bjMulti.handLabel", { n: state.handNumber })}
                  </span>
                  <span className="h-3 w-px bg-[#c9a227]/40" />
                  <span className="rounded-md bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    {phaseLabel}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-200/70">
                {t("bjMulti.betLimitsLine", {
                  min: state.minBet,
                  max: playerEffectiveMaxBet,
                })}
              </p>
            </div>

            <div className="relative z-10 mt-1 flex flex-col items-center sm:mt-5 md:mt-6">
              <div className="mb-1 flex items-center gap-2 sm:mb-2">
                <span className="rounded-md border border-white/20 bg-black/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white/90 shadow">
                  {t("bjMulti.dealer")}
                </span>
                <div className="flex min-h-[2rem] min-w-[3rem] items-center justify-center rounded-lg border border-emerald-400/40 bg-black/40 px-3 font-mono text-lg font-bold text-white shadow-inner">
                  <span>{dealerTot.text}</span>
                  {dealerTot.sub ? (
                    <span className="ml-1 text-sm font-normal text-emerald-300/80">{dealerTot.sub}</span>
                  ) : null}
                </div>
              </div>
              <div className="flex min-h-[4.25rem] items-center justify-center pl-3 sm:min-h-[5.75rem] sm:pl-4">
                {state.dealerCards.length === 0 ? (
                  <div className="pointer-events-none opacity-0" aria-hidden>
                    <PlayingCard hidden />
                  </div>
                ) : (
                  state.dealerCards.map((c, i) => (
                    <motion.div
                      key={`${state.handNumber}-d-${i}-${c.rank}-${c.suit}`}
                      className="-ml-4 first:ml-0 sm:-ml-5"
                      style={{ zIndex: i }}
                      initial={{
                        opacity: 0,
                        y: -16,
                        scale: 0.96,
                        rotate: -3 + i * 2.5,
                      }}
                      animate={{
                        opacity: 1,
                        y: i * 2,
                        scale: 1,
                        rotate: -3 + i * 2.5,
                      }}
                      transition={{
                        delay: i * DEAL_STAGGER_SEC,
                        duration: 0.28,
                        ease: [0.25, 0.1, 0.25, 1],
                      }}
                    >
                      <PlayingCard
                        card={c}
                        hidden={state.dealerHoleHidden && i === 1}
                      />
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="relative z-10 mx-auto mt-2 flex w-full min-w-0 max-w-full flex-wrap md:flex-nowrap overflow-x-auto md:overflow-visible items-end justify-center gap-1.5 px-1.5 pb-10 sm:mt-7 sm:gap-4 sm:px-2 sm:pb-6 md:mt-9 lg:mt-10 scroll-smooth snap-x snap-mandatory scrollbar-hide">
              {sortedSeats.map((s) => {
                const isYou = s.userId === userId;
                const seatAvatar = getPlayerAvatar(s.username, s.userId, userId, s.avatarUrl);
                const hv =
                  typeof s.handTotal === "number"
                    ? s.handTotal
                    : handValueFromCards(s.cards).total;
                const showTotal = s.cards.length > 0 && s.cards[0]?.rank !== "?";
                const turn = s.isCurrentTurn;

                return (
                  <div
                    key={s.userId}
                    className={`flex min-w-[126px] max-w-[188px] flex-1 flex-col items-center snap-center sm:min-w-[160px] ${
                      turn ? "z-20" : "z-10 opacity-95"
                    }`}
                    style={{
                      transform: "perspective(800px) rotateX(2deg)",
                      willChange: "transform",
                    }}
                  >
                    <div
                      className={`relative mb-1.5 w-full rounded-2xl border-2 px-2 pb-2.5 pt-1.5 shadow-xl transition-all ${
                        turn
                          ? "border-amber-300/90 bg-gradient-to-b from-amber-500/25 to-transparent shadow-[0_0_40px_rgba(251,191,36,0.35)]"
                          : "border-white/10 bg-black/25"
                      }`}
                    >
                      {turn ? (
                        <div className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-slate-900 shadow">
                          {isYou ? t("bjMulti.turnYou") : t("bjMulti.turnPlayer")}
                        </div>
                      ) : null}
                      <div className="mb-1 flex flex-col items-center gap-1.5">
                        <div
                          className={`h-9 w-9 shrink-0 overflow-hidden rounded-full border-2 shadow-lg sm:h-10 sm:w-10 ${
                            isYou
                              ? "border-amber-300/90 ring-2 ring-amber-500/35"
                              : "border-white/30"
                          }`}
                        >
                          <ImageWithFallback
                            src={seatAvatar}
                            alt={s.username}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-2 text-center">
                          <span
                            className={`max-w-[7rem] truncate text-xs font-bold sm:text-sm ${
                              isYou ? "text-amber-200" : "text-white/95"
                            }`}
                          >
                            {s.username}
                            {isYou ? (
                              <span className="ml-1 text-[10px] font-normal text-amber-300/90">
                                ({t("bjMulti.you")})
                              </span>
                            ) : null}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-center">
                        <ChipStack amount={s.totalBet > 0 ? s.totalBet : s.bet} />
                      </div>
                      <div className="mt-1.5 flex min-h-[4rem] justify-center pl-2 sm:min-h-[5rem] sm:pl-4">
                        {s.cards.map((c, ci) => (
                          <motion.div
                            key={`${state.handNumber}-${s.userId}-c-${ci}-${c.rank}-${c.suit}`}
                            className="-ml-1.5 first:ml-0 sm:-ml-3 md:-ml-3.5"
                            initial={{ opacity: 0, y: 12, scale: 0.97, rotate: -1 }}
                            animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
                            transition={{
                              delay: ci * DEAL_STAGGER_SEC + 0.03,
                              duration: 0.26,
                              ease: [0.25, 0.1, 0.25, 1],
                            }}
                          >
                            <PlayingCard card={c} />
                          </motion.div>
                        ))}
                      </div>
                      {showTotal && s.playState !== "no_bet" ? (
                        <div className="mt-1 text-center font-mono text-[11px] font-bold text-emerald-200/95">
                          {hv}
                          {s.playState === "bust" ? (
                            <span className="ml-1 text-red-300">{t("bjMulti.bust")}</span>
                          ) : null}
                          {s.playState === "blackjack_natural" ? (
                            <span className="ml-1 text-amber-300">{t("bjMulti.naturalBj")}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/45 to-transparent sm:h-24" />
          </div>
        </div>

        <div className="relative z-20 mx-auto mt-4 max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/55 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:mt-6 sm:py-4 sm:px-8">
          {children}
        </div>
      </div>
    </div>
  );
}
