import { type ReactNode, useMemo } from "react";
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
  0: "absolute bottom-[3%] left-1/2 z-20 -translate-x-1/2",
  1: "absolute left-[2%] top-[42%] z-10 -translate-y-1/2",
  2: "absolute top-[4%] left-1/2 z-10 -translate-x-1/2",
  3: "absolute right-[2%] top-[42%] z-10 -translate-y-1/2",
};

export function BeloteCasinoTable({
  state,
  userId,
  presentUserIds = [],
  turnTimeLeft = null,
}: {
  state: BeloteSanitizedState;
  userId: string;
  presentUserIds?: string[];
  turnTimeLeft?: number | null;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const { feltGradient, feltBorder, feltBackgroundUrl } = useTableTheme();

  const me = state.players.find((p) => p.userId === userId);
  const myPos = me?.position ?? 0;
  const heroTeam = me?.team;
  const sortedPlayers = useMemo(
    () => [...state.players].sort((a, b) => a.position - b.position),
    [state.players],
  );

  const turnPos =
    state.phase === "PLAYING"
      ? state.deal.currentPlayerPosition
      : state.biddingTurnPosition;

  const turnDuration = state.turnTimeLimitSec ?? 30;
  const presentSet = new Set(presentUserIds);

  return (
    <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center px-1 py-0.5 sm:px-2">
      <div className="relative mx-auto h-full max-h-full w-auto max-w-[min(100%,32rem)] aspect-[5/4] sm:aspect-[6/5]">
        <div
          className="relative h-full overflow-hidden rounded-[1.25rem] border-[6px] p-1 shadow-[0_20px_50px_rgba(0,0,0,0.65)] sm:rounded-[1.5rem] sm:border-[8px] sm:p-1.5"
          style={{
            background:
              "linear-gradient(145deg, rgba(2,6,23,0.98) 0%, rgba(12,18,32,0.98) 45%, rgba(15,40,30,0.94) 100%)",
            borderColor: "rgba(16, 185, 129, 0.35)",
          }}
        >
          <div
            className="relative h-full min-h-[11rem] overflow-hidden rounded-[1rem] border-[3px] sm:rounded-[1.15rem] sm:border-[4px]"
            style={{
              backgroundImage: `
                radial-gradient(ellipse 115% 78% at 50% 18%, rgba(255,255,255,0.08) 0%, transparent 50%),
                radial-gradient(ellipse 85% 55% at 50% 100%, rgba(0,0,0,0.48) 0%, transparent 52%),
                ${feltGradient},
                url(${feltBackgroundUrl})
              `,
              backgroundSize: "auto, auto, cover, cover",
              backgroundPosition: "center, center, center, center",
              backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
              borderColor: feltBorder,
              borderStyle: "solid",
            }}
          >
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit] opacity-[0.12] saturate-0"
              aria-hidden
            >
              <img src={tableNappeImage} alt="" className="h-full w-full object-cover" />
            </div>

            {state.deal.trump ? (
              <div className="pointer-events-none absolute bottom-[4%] right-[3%] z-30 sm:bottom-[5%] sm:right-[4%]">
                <div className="flex min-w-[3.25rem] flex-col items-center rounded-xl border-2 border-amber-400/55 bg-black/65 px-2 py-1.5 shadow-lg shadow-black/50 backdrop-blur-md sm:min-w-[3.75rem] sm:px-2.5 sm:py-2">
                  <span className="text-[8px] font-bold uppercase tracking-wider text-amber-200/90 sm:text-[9px]">
                    {t("belote.trump")}
                  </span>
                  <span
                    className="mt-0.5 leading-none font-bold text-amber-50 drop-shadow-sm sm:mt-1"
                    style={{ fontSize: "clamp(1.5rem, 5vw, 2.25rem)" }}
                  >
                    {BELOTE_SUIT_LABEL[state.deal.trump] ?? state.deal.trump}
                  </span>
                  {state.contractPoints != null &&
                  (state.phase === "CONTREE_ROUND" ||
                    state.phase === "PLAYING" ||
                    state.phase === "DEAL_END") ? (
                    <span className="mt-1 max-w-[5.5rem] text-center text-[7px] font-semibold leading-tight text-amber-200/75 sm:text-[8px]">
                      {state.contractPoints >= 250
                        ? t("belote.contractCapot")
                        : t("belote.contractLine", { points: state.contractPoints })}
                      {(state.contreeLevel ?? 0) >= 2
                        ? ` · ${t("belote.surcontree")}`
                        : (state.contreeLevel ?? 0) >= 1
                          ? ` · ${t("belote.contree")}`
                          : ""}
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="absolute left-1/2 top-[38%] z-[15] flex min-h-[2.75rem] -translate-x-1/2 items-center justify-center">
              {state.deal.currentTrick.length === 0 ? (
                <div className="rounded-full border border-dashed border-white/15 px-3 py-1.5 text-[10px] text-white/25">
                  {t("belote.trickEmpty")}
                </div>
              ) : (
                <div className="flex items-center justify-center pl-1">
                  {state.deal.currentTrick.map((tr, i) => (
                    <motion.div
                      key={`trick-${i}-${tr.card.rank}-${tr.card.suit}`}
                      className="-ml-2 first:ml-0 sm:-ml-2.5"
                      style={{ zIndex: i }}
                      initial={{ opacity: 0, scale: 0.9, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: i * DEAL_STAGGER_SEC, duration: 0.22 }}
                    >
                      <BelotePlayingCard card={tr.card} size="sm" />
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {sortedPlayers.map((p) => {
              const vis = visualSeatIndex(p.position, myPos);
              const isYou = p.userId === userId;
              const isPartner =
                !isYou && heroTeam != null && p.team != null && p.team === heroTeam;
              const isTurn = turnPos === p.position;
              const isPresent = presentSet.has(p.userId) || p.userId === userId;
              const seatTurnLeft = isTurn ? turnTimeLeft : null;

              if (isYou) {
                return (
                  <div
                    key={p.userId}
                    className={`${SEAT_POS[vis]} flex max-w-[9rem] flex-col items-center`}
                  >
                    <BeloteSeatAvatar
                      username={p.username}
                      userId={p.userId}
                      heroUserId={userId}
                      avatarUrl={p.avatarUrl}
                      team={p.team === "B" ? "B" : "A"}
                      isYou
                      isTurn={isTurn}
                      turnTimeLeft={seatTurnLeft}
                      turnDuration={turnDuration}
                      disconnectedAt={p.disconnectedAt}
                      disconnectDeadline={p.disconnectDeadline}
                      forfeited={p.forfeited}
                      isPresent={isPresent}
                      size="sm"
                    />
                    <span className="mt-0.5 max-w-[7rem] truncate text-[10px] font-bold text-amber-200">
                      {p.username}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={p.userId}
                  className={`${SEAT_POS[vis]} w-[min(5.5rem,24vw)] max-w-[6.5rem]`}
                >
                  <div
                    className={`rounded-xl border px-1 py-1 shadow-lg transition-all ${
                      isTurn
                        ? "border-amber-300/80 bg-amber-500/15"
                        : "border-white/10 bg-black/35"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <BeloteSeatAvatar
                        username={p.username}
                        userId={p.userId}
                        heroUserId={userId}
                        avatarUrl={p.avatarUrl}
                        team={p.team === "B" ? "B" : "A"}
                        isPartner={isPartner}
                        isTurn={isTurn}
                        turnTimeLeft={seatTurnLeft}
                        turnDuration={turnDuration}
                        disconnectedAt={p.disconnectedAt}
                        disconnectDeadline={p.disconnectDeadline}
                        forfeited={p.forfeited}
                        isPresent={isPresent}
                        size="sm"
                      />
                      <span className="max-w-full truncate text-[9px] font-bold text-white/90">
                        {p.username}
                      </span>
                      <div className="flex justify-center pl-0.5">
                        {Array.from({ length: Math.min(p.handCount, 4) }).map((_, ci) => (
                          <div
                            key={`${p.userId}-back-${ci}`}
                            className="-ml-1.5 first:ml-0"
                            style={{ zIndex: ci }}
                          >
                            <BelotePlayingCard hidden size="xs" animationDelay={ci * 0.02} />
                          </div>
                        ))}
                        {p.handCount > 4 ? (
                          <span className="ml-0.5 text-[8px] text-emerald-200/50">+{p.handCount - 4}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
