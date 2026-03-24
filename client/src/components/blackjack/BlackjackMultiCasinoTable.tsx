import { type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

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
}

function suitSymbol(s: string): string {
  switch (s) {
    case "h":
      return "♥";
    case "d":
      return "♦";
    case "c":
      return "♣";
    case "s":
      return "♠";
    default:
      return s;
  }
}

function isRedSuit(s: string): boolean {
  return s === "h" || s === "d";
}

/** Valeur affichage pour coin de carte */
function rankCorner(rank: string): string {
  if (rank === "10") return "10";
  return rank;
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
  if (hidden || !card || card.suit === "?" || card.rank === "?") {
    return (
      <div
        className={`relative aspect-[63/88] w-[min(4.5rem,22vw)] shrink-0 overflow-hidden rounded-xl border-[3px] border-[#1a0a0f] shadow-[0_8px_24px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] ${className}`}
        style={style}
      >
        <div
          className="absolute inset-0 bg-[linear-gradient(145deg,#5c0a1e_0%,#2d0612_40%,#1a0508_100%)]"
          aria-hidden
        />
        <div
          className="absolute inset-[5px] rounded-lg opacity-90"
          style={{
            backgroundImage: `
              repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212,175,55,0.12) 4px, rgba(212,175,55,0.12) 5px),
              repeating-linear-gradient(-45deg, transparent, transparent 4px, rgba(212,175,55,0.08) 4px, rgba(212,175,55,0.08) 5px)
            `,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-[42%] w-[42%] rounded-full border-2 border-[#c9a227]/50 bg-[#3d0a14]/80 shadow-inner" />
        </div>
        <div className="absolute bottom-1.5 left-0 right-0 text-center font-serif text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]/70">
          ♠ ♣
        </div>
      </div>
    );
  }

  const red = isRedSuit(card.suit);
  const sym = suitSymbol(card.suit);
  const rc = rankCorner(card.rank);

  return (
    <div
      className={`relative aspect-[63/88] w-[min(4.5rem,22vw)] shrink-0 rounded-xl border-[2px] border-white bg-gradient-to-br from-white via-white to-[#f0ebe3] shadow-[0_10px_28px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,1),inset_0_-2px_6px_rgba(0,0,0,0.06)] ${className}`}
      style={style}
    >
      <div
        className={`absolute left-1 top-1 flex flex-col items-center leading-none ${red ? "text-[#c41e3a]" : "text-[#0d0d0d]"}`}
      >
        <span className="font-serif text-[11px] font-black tracking-tight">{rc}</span>
        <span className="font-serif text-[13px] leading-none">{sym}</span>
      </div>
      <div
        className={`absolute bottom-1 right-1 flex rotate-180 flex-col items-center leading-none ${red ? "text-[#c41e3a]" : "text-[#0d0d0d]"}`}
      >
        <span className="font-serif text-[11px] font-black tracking-tight">{rc}</span>
        <span className="font-serif text-[13px] leading-none">{sym}</span>
      </div>
      <div className="flex h-full items-center justify-center pb-3 pt-5">
        <span
          className={`select-none font-serif text-[clamp(1.75rem,8vw,2.75rem)] leading-none ${red ? "text-[#c41e3a]" : "text-[#0d0d0d]"}`}
        >
          {sym}
        </span>
      </div>
    </div>
  );
}

function ChipStack({ amount }: { amount: number }) {
  if (amount <= 0) return null;
  return (
    <div className="relative flex h-9 w-14 items-end justify-center">
      <div className="absolute bottom-0 h-7 w-7 rounded-full border-2 border-amber-200/80 bg-gradient-to-br from-rose-500 via-rose-700 to-rose-950 shadow-[0_4px_8px_rgba(0,0,0,0.5)]" />
      <div className="absolute bottom-1 h-7 w-7 rounded-full border-2 border-amber-200/60 bg-gradient-to-br from-slate-600 via-slate-800 to-slate-950 shadow-[0_4px_8px_rgba(0,0,0,0.45)]" />
      <div className="absolute bottom-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-100 bg-gradient-to-br from-amber-600 via-yellow-700 to-amber-950 text-[10px] font-black text-amber-100 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
        $
      </div>
      <span className="absolute -bottom-0.5 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-100 shadow">
        {amount}
      </span>
    </div>
  );
}

export function BlackjackMultiCasinoTable({
  state,
  userId,
  children,
}: {
  state: BjTableState;
  userId: string | null;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  const phaseKey = `bjMulti.phase_${state.phase}` as const;
  const phaseLabel = t(phaseKey, { defaultValue: state.phase });

  const sortedSeats = [...state.seats].sort((a, b) => a.position - b.position);

  const dealerTot = dealerDisplayTotal(state.dealerCards, state.dealerHoleHidden);

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-6 sm:px-4">
      {/* Tapis + bordure bois/doré */}
      <div className="relative overflow-hidden rounded-[2rem] border-[10px] border-[#3d2914] bg-[#2a1810] p-2 shadow-[0_32px_80px_rgba(0,0,0,0.75),inset_0_2px_0_rgba(255,255,255,0.06)] sm:rounded-[2.5rem] sm:border-[12px] sm:p-3">
        <div
          className="relative min-h-[min(72vh,640px)] overflow-hidden rounded-[1.35rem] shadow-[inset_0_0_100px_rgba(0,0,0,0.35)] sm:rounded-[1.75rem]"
          style={{
            background: `
              radial-gradient(ellipse 120% 80% at 50% 30%, rgba(30,120,85,0.45) 0%, transparent 55%),
              radial-gradient(ellipse 90% 60% at 50% 100%, rgba(0,40,25,0.9) 0%, transparent 50%),
              linear-gradient(180deg, #0f5132 0%, #0a3d28 35%, #062a1a 100%)
            `,
          }}
        >
          {/* Texture feutre */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
            style={{
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          {/* Liseré intérieur doré */}
          <div className="pointer-events-none absolute inset-3 rounded-[1rem] border border-[#c9a227]/25 shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] sm:inset-4 sm:rounded-[1.35rem]" />

          {/* Bandeau infos */}
          <div className="relative z-10 flex flex-col items-center gap-1 px-4 pt-5 text-center sm:pt-6">
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
            <p className="text-[11px] text-emerald-200/70">
              {t("bjMulti.minBetLabel")} <span className="font-mono text-amber-200">{state.minBet}</span>
            </p>
          </div>

          {/* Croupier */}
          <div className="relative z-10 mt-4 flex flex-col items-center sm:mt-6">
            <div className="mb-2 flex items-center gap-2">
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
            <div className="flex justify-center pl-4">
              {state.dealerCards.map((c, i) => (
                <div
                  key={`d-${i}-${c.rank}-${c.suit}`}
                  className="-ml-4 first:ml-0 sm:-ml-5"
                  style={{
                    transform: `rotate(${-8 + i * 6}deg) translateY(${i * 2}px)`,
                    zIndex: i,
                  }}
                >
                  <PlayingCard
                    card={c}
                    hidden={state.dealerHoleHidden && i === 1}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Zone joueurs — arc */}
          <div className="relative z-10 mx-auto mt-6 flex max-w-5xl flex-wrap items-end justify-center gap-3 px-2 pb-4 sm:mt-10 sm:gap-4 sm:px-4">
            {sortedSeats.map((s, idx) => {
              const isYou = s.userId === userId;
              const hv =
                typeof s.handTotal === "number"
                  ? s.handTotal
                  : handValueFromCards(s.cards).total;
              const showTotal = s.cards.length > 0 && s.cards[0]?.rank !== "?";
              const turn = s.isCurrentTurn;

              return (
                <div
                  key={s.userId}
                  className={`flex min-w-[140px] max-w-[200px] flex-1 flex-col items-center sm:min-w-[160px] ${
                    turn ? "z-20" : "z-10 opacity-95"
                  }`}
                  style={{
                    transform: `perspective(800px) rotateX(4deg) translateY(${Math.abs(idx - (sortedSeats.length - 1) / 2) * 3}px)`,
                  }}
                >
                  <div
                    className={`relative mb-2 w-full rounded-2xl border-2 px-2 pb-3 pt-2 shadow-xl transition-all ${
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
                    <div className="mb-1 flex items-center justify-center gap-2 text-center">
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
                    <div className="flex justify-center">
                      <ChipStack amount={s.totalBet > 0 ? s.totalBet : s.bet} />
                    </div>
                    <div className="mt-2 flex min-h-[4.5rem] justify-center pl-3 sm:min-h-[5rem] sm:pl-4">
                      {s.cards.map((c, ci) => (
                        <div key={`${s.userId}-c-${ci}`} className="-ml-3 first:ml-0 sm:-ml-3.5">
                          <PlayingCard card={c} />
                        </div>
                      ))}
                    </div>
                    {showTotal && s.playState !== "no_bet" ? (
                      <div className="mt-1 text-center font-mono text-[11px] font-bold text-emerald-200/95">
                        {hv}
                        {s.playState === "bust" ? (
                          <span className="ml-1 text-rose-300">{t("bjMulti.bust")}</span>
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

          {/* Reflet bas */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      </div>

      {/* Rail de contrôle */}
      <div className="relative z-20 -mt-2 mx-auto max-w-3xl rounded-b-2xl border border-[#3d2914]/80 border-t-0 bg-gradient-to-b from-[#1f1410] to-[#120c0a] px-4 py-5 shadow-[0_16px_40px_rgba(0,0,0,0.5)] sm:px-8">
        {children}
      </div>
    </div>
  );
}
