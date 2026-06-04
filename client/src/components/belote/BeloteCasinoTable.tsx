import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { useTableTheme } from "../../contexts/TableThemeContext";
import { BeloteSeatAvatar } from "./BeloteSeatAvatar";
import tableNappeImage from "../../assets/nappe/NA1.png";
import { BelotePlayingCard } from "./BelotePlayingCard";
import { BELOTE_SUIT_LABEL } from "../../features/belote/beloteCardUtils";
import type { BeloteSanitizedState } from "../../features/belote/useBeloteSocket";

const DEAL_STAGGER_SEC = 0.05;

/** 0 = bas (vous), 1 = gauche, 2 = haut, 3 = droite */
export function visualSeatIndex(logicalPos: number, myPos: number): number {
  return (logicalPos - myPos + 4) % 4;
}

const SEAT_POS: Record<number, string> = {
  0: "absolute bottom-[6%] left-1/2 z-20 -translate-x-1/2",
  1: "absolute left-[3%] top-[42%] z-10 -translate-y-1/2 sm:left-[5%]",
  2: "absolute top-[10%] left-1/2 z-10 -translate-x-1/2 sm:top-[12%]",
  3: "absolute right-[3%] top-[42%] z-10 -translate-y-1/2 sm:right-[5%]",
};

function phaseLabelKey(phase: string): string {
  switch (phase) {
    case "BIDDING_ROUND_1":
    case "BIDDING_ROUND_2":
      return "belote.phaseBidding";
    case "PLAYING":
      return "belote.phasePlaying";
    case "DEAL_END":
      return "belote.phaseDealEnd";
    case "GAME_END":
      return "belote.gameOver";
    default:
      return "belote.phasePlaying";
  }
}

export function BeloteCasinoTable({
  state,
  userId,
  presentUserIds = [],
  turnTimeLeft = null,
  children,
  rootClassName = "",
}: {
  state: BeloteSanitizedState;
  userId: string;
  presentUserIds?: string[];
  turnTimeLeft?: number | null;
  children: ReactNode;
  rootClassName?: string;
}) {
  const { t } = useTranslation();
  const { feltGradient, feltBorder, feltBackgroundUrl } = useTableTheme();
  const [containerStyle, setContainerStyle] = useState<CSSProperties>({});

  const me = state.players.find((p) => p.userId === userId);
  const myPos = me?.position ?? 0;
  const myTeam = me?.team ?? "A";

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const updateScale = () => {
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const headerReserve = w < 640 ? 118 : w < 900 ? 150 : 190;
        const availableWidth = Math.max(280, w - 16);
        const availableHeight = Math.max(300, h - headerReserve);
        const narrowPhone = w < 480;
        const isPhoneWidth = w < 640;
        const baseSceneWidth = narrowPhone ? 700 : isPhoneWidth ? 820 : 980;
        const baseSceneHeight = narrowPhone ? 680 : isPhoneWidth ? 760 : 880;
        const widthScale = availableWidth / baseSceneWidth;
        const heightScale = availableHeight / baseSceneHeight;
        const newScale = Math.max(0.52, Math.min(1.05, widthScale, heightScale));

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
          const spacerBottom = `${Math.max(0, Math.round((baseSceneHeight - availableHeight / newScale) * 0.32))}px`;
          setContainerStyle({
            transform: `scale(${newScale})`,
            transformOrigin: "top center",
            marginBottom: spacerBottom,
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

  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => a.position - b.position),
    [state.players],
  );

  const turnPos =
    state.phase === "PLAYING"
      ? state.deal.currentPlayerPosition
      : state.biddingTurnPosition;

  const turnDuration = state.turnTimeLimitSec ?? 30;
  const phaseLabel = t(phaseLabelKey(state.phase));
  const presentSet = new Set(presentUserIds);

  return (
    <div className={`relative flex min-h-0 w-full flex-1 flex-col overflow-x-hidden ${rootClassName}`}>
      <div
        className="mx-auto w-full min-h-0 min-w-0 max-w-none flex-1 px-1 pb-3 sm:px-3 sm:pb-6 md:px-4 md:pb-8"
        style={containerStyle}
      >
        <div
          className="relative overflow-hidden rounded-[2rem] border-[clamp(8px,2.2vw,10px)] p-1.5 shadow-[0_32px_80px_rgba(0,0,0,0.75),inset_0_2px_0_rgba(255,255,255,0.08)] sm:rounded-[3rem] sm:border-[12px] sm:p-3"
          style={{
            background:
              "linear-gradient(145deg, rgba(2,6,23,0.98) 0%, rgba(12,18,32,0.98) 45%, rgba(15,40,30,0.94) 100%)",
            borderColor: "rgba(16, 185, 129, 0.35)",
          }}
        >
          <div
            className="relative h-[max(26rem,min(94dvh,96svh,calc(100dvh-10rem)))] min-h-[26rem] overflow-hidden rounded-[2rem] border-[clamp(3px,0.8vw,8px)] shadow-[inset_0_0_110px_rgba(0,0,0,0.38),inset_0_12px_32px_rgba(255,255,255,0.045)] sm:rounded-[2.5rem] [@media_(min-width:1024px)_and_(max-height:820px)]:h-[max(24rem,min(88dvh,calc(100dvh-9rem)))]"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 115% 78% at 50% 18%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(ellipse 85% 55% at 50% 100%, rgba(0,0,0,0.48) 0%, transparent 52%),
                linear-gradient(90deg, rgba(0,0,0,0.28), transparent 18%, transparent 82%, rgba(0,0,0,0.28)),
                ${feltGradient},
                url(${feltBackgroundUrl})
              `,
              backgroundSize: "auto, auto, auto, cover, cover",
              backgroundPosition: "center, center, center, center, center",
              backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat, no-repeat",
              borderColor: feltBorder,
              borderStyle: "solid",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[2rem] opacity-[0.12] saturate-0 sm:rounded-[2.5rem]"
              aria-hidden
            >
              <img src={tableNappeImage} alt="" className="h-full w-full object-cover" />
            </div>
            <div
              className="pointer-events-none absolute inset-0 z-[1] opacity-[0.14] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
              }}
            />
            <div className="pointer-events-none absolute inset-3 z-[1] rounded-[1rem] border border-emerald-400/25 shadow-[inset_0_0_40px_rgba(0,0,0,0.2)] sm:inset-4 sm:rounded-[1.35rem]" />

            <div className="relative z-10 flex flex-col items-center gap-0.5 px-4 pt-2 text-center sm:gap-1 sm:pt-5">
              <div className="inline-flex flex-wrap items-center justify-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-black/35 px-4 py-1.5 shadow-lg backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300/90">
                    {t("belote.tableBrand")}
                  </span>
                  <span className="h-3 w-px bg-emerald-500/40" />
                  <span className="rounded-md bg-emerald-950/80 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                    {phaseLabel}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-emerald-200/70">{t("belote.targetLine", { score: state.targetScore })}</p>
            </div>

            <div className="pointer-events-none absolute left-3 top-14 z-20 sm:left-5 sm:top-16">
              <div
                className={`rounded-xl border px-3 py-2 text-center shadow-lg backdrop-blur-sm ${
                  myTeam === "A"
                    ? "border-amber-400/50 bg-amber-950/50"
                    : "border-white/15 bg-black/35"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
                  {t("belote.teamA")}
                </div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">{state.teamScoreA}</div>
              </div>
            </div>
            <div className="pointer-events-none absolute right-3 top-14 z-20 sm:right-5 sm:top-16">
              <div
                className={`rounded-xl border px-3 py-2 text-center shadow-lg backdrop-blur-sm ${
                  myTeam === "B"
                    ? "border-amber-400/50 bg-amber-950/50"
                    : "border-white/15 bg-black/35"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/70">
                  {t("belote.teamB")}
                </div>
                <div className="font-mono text-xl font-bold text-white tabular-nums">{state.teamScoreB}</div>
              </div>
            </div>

            {state.deal.trump ? (
              <div className="pointer-events-none absolute left-1/2 top-[22%] z-20 -translate-x-1/2 sm:top-[24%]">
                <div className="flex flex-col items-center gap-1 rounded-2xl border border-amber-400/45 bg-black/45 px-4 py-2 shadow-lg backdrop-blur-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-200/80">
                    {t("belote.trump")}
                  </span>
                  <span className="text-3xl font-bold text-amber-100">
                    {BELOTE_SUIT_LABEL[state.deal.trump] ?? state.deal.trump}
                  </span>
                </div>
              </div>
            ) : null}

            <div className="absolute left-1/2 top-[38%] z-[15] flex min-h-[5rem] -translate-x-1/2 items-center justify-center sm:top-[40%]">
              {state.deal.currentTrick.length === 0 ? (
                <div className="rounded-full border border-dashed border-white/15 px-6 py-3 text-xs text-white/25">
                  {t("belote.trickEmpty")}
                </div>
              ) : (
                <div className="flex items-center justify-center pl-2">
                  {state.deal.currentTrick.map((tr, i) => (
                    <motion.div
                      key={`trick-${i}-${tr.card.rank}-${tr.card.suit}`}
                      className="-ml-3 first:ml-0 sm:-ml-4"
                      style={{ zIndex: i }}
                      initial={{ opacity: 0, scale: 0.9, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: i * DEAL_STAGGER_SEC, duration: 0.22 }}
                    >
                      <BelotePlayingCard card={tr.card} size="board" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {sortedPlayers.map((p) => {
              const vis = visualSeatIndex(p.position, myPos);
              const isYou = p.userId === userId;
              const isPartner = p.team === myTeam && !isYou;
              const isTurn = turnPos === p.position;
              const isPresent = presentSet.has(p.userId);
              const seatTurnLeft = isTurn ? turnTimeLeft : null;

              return (
                <div key={p.userId} className={`${SEAT_POS[vis]} w-[min(11rem,38vw)] max-w-[12.5rem]`}>
                  <div
                    className={`relative rounded-2xl border-2 px-2 pb-2 pt-1.5 shadow-xl transition-all ${
                      isTurn
                        ? "border-amber-300/90 bg-gradient-to-b from-amber-500/25 to-transparent shadow-[0_0_40px_rgba(251,191,36,0.35)]"
                        : "border-white/10 bg-black/30"
                    }`}
                  >
                    <div className="mb-1 flex flex-col items-center gap-1 pt-2">
                      <BeloteSeatAvatar
                        username={p.username}
                        userId={p.userId}
                        heroUserId={userId}
                        avatarUrl={p.avatarUrl}
                        isYou={isYou}
                        isPartner={isPartner}
                        isTurn={isTurn}
                        turnTimeLeft={seatTurnLeft}
                        turnDuration={turnDuration}
                        disconnectedAt={p.disconnectedAt}
                        disconnectDeadline={p.disconnectDeadline}
                        forfeited={p.forfeited}
                        isPresent={isPresent}
                        size={isYou ? "hero" : "sm"}
                      />
                      <span
                        className={`max-w-[8rem] truncate text-center text-xs font-bold sm:text-sm ${
                          isYou ? "text-amber-200" : "text-white/95"
                        }`}
                      >
                        {p.username}
                        {isYou ? (
                          <span className="ml-1 text-[10px] font-normal text-amber-300/90">
                            ({t("belote.you")})
                          </span>
                        ) : isPartner ? (
                          <span className="ml-1 text-[10px] font-normal text-emerald-300/90">
                            ({t("belote.partner")})
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="flex min-h-[3.25rem] justify-center pl-1 sm:min-h-[4rem] sm:pl-2">
                      {isYou ? (
                        <p className="self-center text-[11px] text-emerald-200/70">
                          {t("belote.cardsInHand", { n: p.handCount })}
                        </p>
                      ) : (
                        Array.from({ length: Math.min(p.handCount, 8) }).map((_, ci) => (
                          <div
                            key={`${p.userId}-back-${ci}`}
                            className="-ml-2 first:ml-0 sm:-ml-2.5"
                            style={{ zIndex: ci }}
                          >
                            <BelotePlayingCard hidden size="sm" animationDelay={ci * 0.02} />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-black/45 to-transparent sm:h-24" />
          </div>
        </div>

        <div className="relative z-30 mx-auto mt-5 max-w-3xl rounded-[2rem] border border-white/10 bg-slate-950/70 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md sm:mt-7 sm:px-8 sm:py-4 [@media_(min-width:1024px)_and_(max-height:820px)]:mt-4">
          {children}
        </div>
      </div>
    </div>
  );
}
