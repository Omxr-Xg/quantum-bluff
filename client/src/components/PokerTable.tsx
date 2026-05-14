import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChipIcon } from "./ChipIcon";
import logoSrc from "../assets/logo-personnel.png";
import { getPokerTableAvatar } from "../utils/avatars";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { PokerCard } from "./PokerCard";
import { Clock } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";
import { useTableTheme } from "../contexts/TableThemeContext";
import { calculatePlayerPositions } from "../utils/tablePositions";
import { cardHighlightKey } from "../utils/cards";

interface Card {
  suit: string;
  value: string;
}

interface Player {
  id: number | string;
  name: string;
  chips: number;
  bet: number;
  position: number;
  isActive: boolean;
  isDealer?: boolean;
  role?: "SB" | "BB" | "PLAYER";
  cards?: Card[];
  isConnected?: boolean;
  hasFolded?: boolean;
  lastAction?: string | null;
  avatar?: string;
}

interface PokerTableProps {
  players: Player[];
  children?: ReactNode;
  communitySafeZone?: number;
  phase?: string;
  burnedCardsCount?: number;
  colorblindMode?: boolean;
  heroSeatId?: string | number | null;
  heroTimerActive?: boolean;
  heroTimerTimeLeft?: number;
  heroTimerDuration?: number;
  /** Clic sur l’avatar d’un adversaire (multijoueur) : menu invitation / message / signalement */
  onOpponentAvatarClick?: (player: Player) => void;
  enableAvatarInteractions?: boolean;
  /** Masque le stack sous l’avatar du héros (solde déjà en header). */
  hideHeroChipStack?: boolean;
  /** Nombre de sièges pour le calcul des positions (ex. spectateur : joueurs + 1 siège vide). */
  layoutSeatCount?: number;
  /** Clés `suit|value` des cartes à mettre en surbrillance (showdown). */
  highlightCardKeys?: Set<string>;
}

// Dimensions de référence — doivent correspondre à tablePositions.ts
const BASE_TABLE_WIDTH  = 950;
const BASE_TABLE_HEIGHT = 420;

export function PokerTable({
  players,
  children,
  communitySafeZone: _communitySafeZone = 180,
  phase,
  burnedCardsCount = 0,
  colorblindMode = false,
  heroSeatId = null,
  heroTimerActive = false,
  heroTimerTimeLeft,
  heroTimerDuration = 30,
  onOpponentAvatarClick,
  enableAvatarInteractions = false,
  hideHeroChipStack = false,
  layoutSeatCount,
  highlightCardKeys,
}: PokerTableProps) {
  const { t } = useTranslation();
  const { feltGradient, feltBorder, feltBackgroundUrl } = useTableTheme();
  const isShowdown = phase === "showdown";

  const deviceType = useDeviceType();
  const isMobile  = deviceType === "mobile";
  const isTablet  = deviceType === "tablet";

  // Positions calculées pour TOUS les sièges (même index = même position)
  const seatCountForLayout =
    typeof layoutSeatCount === "number" && layoutSeatCount > 0
      ? layoutSeatCount
      : players.length > 0
        ? players.length
        : 1;
  const allPositions = calculatePlayerPositions(seatCountForLayout, isMobile, isTablet);

  /**
   * Convertit des coordonnées px (relatives au centre, issues de calculatePlayerPositions)
   * en pourcentages relatifs au wrapper proportionnel.
   *
   * Le wrapper a pour dimensions : clamp(280px, 85vw, 950px) × (height proportionnelle).
   * On divise par la demi-largeur/hauteur de RÉFÉRENCE pour obtenir un ratio,
   * puis on multiplie par 50 pour obtenir un offset en %.
   *
   *   left = 50% + (x / (BASE_TABLE_WIDTH  / 2)) * 50%
   *   top  = 50% + (y / (BASE_TABLE_HEIGHT / 2)) * 50%
   *
   * Grâce à l'aspect-ratio fixe du wrapper, ces % scalent automatiquement
   * sur toutes les tailles d'écran.
   */
  const toPercent = (px: number, half: number) => (px / half) * 50;

  return (
    <div
      className="relative w-full h-full flex items-center justify-center min-h-0"
      style={{
        perspective: isMobile ? "800px" : isTablet ? "1000px" : "1200px",
      }}
    >
      {/* ─── Wrapper proportionnel ─────────────────────────────────────────── */}
      {/*  Le wrapper garde le ratio BASE_TABLE_WIDTH:BASE_TABLE_HEIGHT         */}
      {/*  → tous les % internes scalent de façon cohérente.                   */}
      <div
        className="relative flex items-center justify-center"
        style={isMobile ? {
          width: "90vw",
          maxWidth: "90vw",
          aspectRatio: "2 / 3",
          overflow: "visible",
        } : isTablet ? {
          width: "clamp(400px, 80vw, 700px)",
          aspectRatio: `${BASE_TABLE_WIDTH} / ${BASE_TABLE_HEIGHT}`,
          overflow: "visible",
        } : {
          width: "clamp(600px, 85vw, 950px)",
          aspectRatio: `${BASE_TABLE_WIDTH} / ${BASE_TABLE_HEIGHT}`,
          overflow: "visible",
        }}
      >
        {/* ─── TABLE ───────────────────────────────────────────────────────── */}
        <div
          className={`relative w-full h-full border-[clamp(3px,1vw,8px)] ${isMobile ? "rounded-[40%/25%]" : "rounded-full"}`}
          style={{
            backgroundImage: `${feltGradient}, url(${feltBackgroundUrl})`,
            backgroundSize: "cover, cover",
            backgroundPosition: "center, center",
            backgroundRepeat: "no-repeat, no-repeat",
            borderColor: feltBorder,
            borderStyle: "solid",
            transform: `rotateX(${isMobile ? "20deg" : isTablet ? "22deg" : "25deg"})`,
            boxShadow:
              "inset 0 8px 24px rgba(0,0,0,0.5), inset 0 -2px 8px rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* Logo central */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <div
              className="rounded-full overflow-hidden w-[25%] aspect-square max-w-[220px] max-h-[220px]"
              style={{
                opacity: 0.12,
                filter: "blur(1px) grayscale(100%)",
                transform: "translateY(10px)",
              }}
            >
              <img
                src={logoSrc}
                alt="Quantum Bluff"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Community cards */}
          <div className={`absolute ${isMobile ? 'top-[38%]' : 'top-[18%]'} left-1/2 -translate-x-1/2 flex justify-center`}>
            {children}
          </div>

          {/* Cartes brûlées */}
          {burnedCardsCount > 0 && (
            <div
              className={`absolute ${isMobile ? "right-[1%] top-[1%]" : "right-[2%] top-[15%]"} pointer-events-none`}
              title={t("game.burned")}
              aria-label={t("game.burnedCount", { count: burnedCardsCount })}
            >
              <div className="relative">
                <div className="absolute -inset-2 rounded-xl bg-black/20 blur-md" />
                <div className={`relative flex -space-x-3 ${isMobile ? 'scale-75 origin-top-right' : ''}`}>
                  {Array.from({ length: Math.min(burnedCardsCount, 4) }).map(
                    (_, i) => (
                      <PokerCard
                        key={i}
                        suit="spades"
                        value="A"
                        size={isMobile ? "xs" : "sm"}
                        faceDown
                        className={`shadow-xl border border-white/10 ${
                          i % 2 === 0 ? "-rotate-6" : "rotate-3"
                        }`}
                      />
                    )
                  )}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-black/45 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200/90">
                  <span>{t("game.burned")}</span>
                  <span>({burnedCardsCount})</span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* ─── FIN TABLE ───────────────────────────────────────────────────── */}

        {/* ─── PLAYERS ─────────────────────────────────────────────────────── */}
        {/*  Positionné en absolute sur le même wrapper que la table           */}
        {/*  → les % sont relatifs aux mêmes dimensions, le scaling est cohérent */}
        <div className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
          {players.map((player) => {
            const pos = allPositions[player.position];
            if (!pos) return null;

            const effectiveHalfWidth  = isMobile ? 190 : BASE_TABLE_WIDTH  / 2;
            const effectiveHalfHeight = isMobile ? 250 : BASE_TABLE_HEIGHT / 2;
            const xPct = toPercent(pos.x, effectiveHalfWidth);
            const yPct = toPercent(pos.y, effectiveHalfHeight);
            const isHeroSeat =
              heroSeatId != null &&
              heroSeatId !== "" &&
              String(player.id) === String(heroSeatId);
            const isHeroName = player.name === "Vous" || player.name === "you";
            const isHeroDisplay =
              isHeroSeat || isHeroName || player.position === 0;
            const shouldReserveOpponentCards =
              !isHeroDisplay && player.position !== 0;
            const displayName = isMobile ? player.name.slice(0, 10) : player.name;
            const actionLabel = player.hasFolded
              ? t("game.foldedLabel")
              : player.lastAction;
            const hasVisibleSeatCards =
              Boolean(player.cards && player.cards.length > 0 && !player.hasFolded);
            const timerDuration = Math.max(1, heroTimerDuration);
            const timerLeft = Math.max(
              0,
              Math.min(timerDuration, heroTimerTimeLeft ?? timerDuration)
            );
            const timerProgress = (timerLeft / timerDuration) * 100;
            const timerArcLength = 100;
            const timerArcOffset = timerArcLength - timerProgress;
            const showHeroTimer =
              isHeroDisplay && heroTimerActive && heroTimerTimeLeft != null;
            const avatarSizeClass = player.position === 0
              ? "w-[clamp(3.1rem,7vw,4.6rem)] h-[clamp(3.1rem,7vw,4.6rem)]"
              : isMobile
                ? "w-[clamp(2rem,5vw,2.8rem)] h-[clamp(2rem,5vw,2.8rem)]"
                : "w-[clamp(2.6rem,5vw,3.75rem)] h-[clamp(2.6rem,5vw,3.75rem)]";

            return (
              <div
                key={player.id}
                className="absolute h-0 w-0 pointer-events-auto"
                style={{
                  left: isMobile
                    ? `clamp(2%, calc(50% + ${xPct}%), 98%)`
                    : `calc(50% + ${xPct}%)`,
                  top: isMobile
                    ? `clamp(4%, calc(50% + ${yPct}%), 96%)`
                    : `calc(50% + ${yPct}%)`,
                  zIndex: player.position === 0 ? 20 : 10,
                }}
              >
                <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-visible">

                  {(() => {
                    const avatarInner = (
                      <>
                        {getPokerTableAvatar(player.name, player.id, heroSeatId, player.avatar) ? (
                          <ImageWithFallback
                            src={
                              getPokerTableAvatar(
                                player.name,
                                player.id,
                                heroSeatId,
                                player.avatar
                              ) || ""
                            }
                            alt={player.name}
                            className={`w-full h-full object-cover ${
                              player.hasFolded
                                ? "blur-[2px] opacity-40 brightness-50"
                                : ""
                            }`}
                          />
                        ) : (
                          <div
                            className={`flex items-center justify-center h-full font-bold ${
                              player.hasFolded
                                ? "text-red-300 blur-[1px] opacity-50"
                                : "text-white"
                            }`}
                          >
                            {player.name.charAt(0)}
                          </div>
                        )}

                        {player.hasFolded && (
                          <div className="absolute inset-0 bg-red-600/30 rounded-full" />
                        )}
                      </>
                    );

                    const shellClass = `rounded-full overflow-hidden border-2 transition relative
                      ${avatarSizeClass}
                      ${
                        player.hasFolded
                          ? "bg-red-900/60 border-red-500 grayscale"
                          : "bg-slate-950 border-cyan-100/80"
                      }
                      shadow-[0_10px_24px_rgba(0,0,0,0.45)]
                      ${player.isActive && !isHeroDisplay ? "ring-2 ring-yellow-300/80" : ""}`;

                    const clickable =
                      !isHeroSeat &&
                      enableAvatarInteractions &&
                      onOpponentAvatarClick &&
                      typeof player.id === "string" &&
                      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        player.id
                      );

                    const avatarNode = clickable ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpponentAvatarClick(player);
                          }}
                          className={`${shellClass} cursor-pointer hover:ring-2 hover:ring-amber-400/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400`}
                          title={t("game.playerMenu.openMenu")}
                          aria-label={t("game.playerMenu.openMenu")}
                        >
                          {avatarInner}
                        </button>
                    ) : (
                      <div className={shellClass}>{avatarInner}</div>
                    );

                    if (!isHeroDisplay) return avatarNode;

                    return (
                      <div className="relative flex items-center justify-center">
                        {showHeroTimer && (
                          <svg
                            className={`pointer-events-none absolute -inset-[0.62rem] z-20 h-[calc(100%+1.24rem)] w-[calc(100%+1.24rem)] overflow-visible ${
                              timerLeft <= 5 ? "animate-pulse" : ""
                            }`}
                            viewBox="0 0 100 100"
                            aria-hidden="true"
                          >
                            <path
                              d="M 9 50 A 41 41 0 0 1 91 50"
                              fill="none"
                              stroke="rgba(15,23,42,0.45)"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                            <path
                              d="M 9 50 A 41 41 0 0 1 91 50"
                              fill="none"
                              stroke={timerLeft <= 5 ? "#ef4444" : "#facc15"}
                              strokeWidth="3"
                              strokeLinecap="round"
                              pathLength={timerArcLength}
                              strokeDasharray={timerArcLength}
                              strokeDashoffset={timerArcOffset}
                              className="drop-shadow-[0_0_6px_rgba(250,204,21,0.65)]"
                              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.2s ease" }}
                            />
                          </svg>
                        )}
                        <div className="relative z-10">{avatarNode}</div>
                        <div className="pointer-events-none absolute left-1/2 top-[58%] z-30 flex -translate-x-1/2 flex-col items-center drop-shadow-2xl md:top-[64%]">
                          {player.cards && player.cards.length > 0 && !player.hasFolded && (
                            <div className="relative z-10 flex items-start justify-center">
                              {player.cards.map((card, index) => (
                                <div
                                  key={index}
                                  className="relative origin-top transition-all duration-300"
                                  style={{
                                    marginLeft: index > 0 ? (isMobile ? "3px" : "8px") : "0",
                                    transform: `rotate(${index === 0 ? -5 : 6}deg)${isMobile ? "" : " scale(1.2)"}`,
                                  }}
                                >
                                  <PokerCard
                                    suit={card.suit}
                                    value={card.value}
                                    size={isMobile ? "sm" : "md"}
                                    colorblindMode={colorblindMode}
                                    highlight={Boolean(
                                      highlightCardKeys?.size &&
                                        card.suit !== "hidden" &&
                                        highlightCardKeys.has(cardHighlightKey(card)),
                                    )}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="mt-1 flex flex-col items-center gap-0 md:mt-1.5">
                            <div className="relative z-40 min-w-[4.8rem] rounded-md border border-white/10 bg-slate-950/95 px-3 py-1 text-center text-xs font-bold leading-none text-slate-100 shadow-[0_8px_18px_rgba(0,0,0,0.55)] md:text-sm">
                              {displayName}
                            </div>
                            {!(hideHeroChipStack && isHeroSeat) && (
                              <div className="inline-flex min-w-[4.8rem] items-center justify-center gap-1.5 rounded-md border border-slate-600/80 bg-slate-900/95 px-3 py-1 text-xs font-bold leading-none tabular-nums text-slate-100 shadow-[0_8px_18px_rgba(0,0,0,0.45)] md:text-sm">
                                <ChipIcon size="sm" className="h-3.5 w-3.5 shrink-0" />
                                <span>{player.chips.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {!isHeroDisplay && shouldReserveOpponentCards && (
                    <div className="pointer-events-none absolute left-1/2 top-[68%] z-20 flex -translate-x-1/2 items-start justify-center">
                      {hasVisibleSeatCards && (
                        <div className="flex items-start justify-center -space-x-3 opacity-95">
                          {player.cards.map((card, index) => (
                            <PokerCard
                              key={index}
                              suit={card.suit}
                              value={card.value}
                              size="xs"
                              faceDown={!isShowdown}
                              colorblindMode={colorblindMode}
                              className={index === 0 ? "-rotate-6" : "rotate-6"}
                              highlight={Boolean(
                                isShowdown &&
                                  highlightCardKeys?.size &&
                                  card.suit !== "hidden" &&
                                  highlightCardKeys.has(cardHighlightKey(card)),
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!isHeroDisplay && (
                    <div className={`pointer-events-none absolute left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-0 ${hasVisibleSeatCards ? "top-[calc(100%+0.85rem)]" : "top-[calc(100%-0.35rem)]"}`}>
                      <div
                        className={`min-w-[4.3rem] max-w-[7rem] truncate rounded-md border px-2.5 py-1 text-center text-[clamp(9px,1vw,12px)] font-bold leading-none shadow-[0_8px_18px_rgba(0,0,0,0.45)] ${
                          player.hasFolded
                            ? "border-red-400/35 bg-red-950/90 text-red-200 line-through"
                            : "border-white/10 bg-slate-950/95 text-slate-100"
                        }`}
                      >
                        {displayName}
                      </div>
                      <div className="inline-flex min-w-[4.3rem] items-center justify-center gap-1.5 rounded-md border border-slate-600/75 bg-slate-900/95 px-2.5 py-1 text-[clamp(9px,1vw,12px)] font-bold leading-none tabular-nums text-slate-100 shadow-[0_8px_18px_rgba(0,0,0,0.45)]">
                        <ChipIcon size="sm" className="h-3.5 w-3.5 shrink-0" />
                        <span>{player.chips.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {(player.isActive || actionLabel || player.isDealer || player.role === "SB" || player.role === "BB") && (
                    <div className="pointer-events-none absolute bottom-[calc(100%+0.35rem)] left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1">
                      {player.isActive && (
                        <div className="inline-flex items-center gap-0.5 whitespace-nowrap rounded-full border border-yellow-200/55 bg-yellow-300 px-1.5 py-0.5 text-[8px] font-black leading-none text-black shadow-[0_0_12px_rgba(250,204,21,0.35)] md:text-[9px]">
                          <Clock className="h-2.5 w-2.5 animate-pulse" />
                          {isHeroDisplay ? t("game.yourTurn") : t("game.theirTurn")}
                        </div>
                      )}
                      {actionLabel && (
                        <div
                          className={`max-w-[7.5rem] truncate rounded-full border px-2.5 py-1 text-[10px] font-black uppercase leading-none shadow-[0_8px_18px_rgba(0,0,0,0.42)] md:text-xs ${
                            player.hasFolded
                              ? "border-red-300/50 bg-red-950/90 text-red-200"
                              : "border-emerald-300/35 bg-emerald-950/90 text-emerald-100"
                          }`}
                          title={actionLabel}
                        >
                          {actionLabel}
                        </div>
                      )}
                      {(player.isDealer || player.role === "SB" || player.role === "BB") && (
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {player.isDealer && (
                            <div
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-white/70 bg-white text-[10px] font-black text-slate-800 shadow-md md:h-7 md:w-7 md:text-xs"
                              title={t("game.dealer")}
                            >
                              D
                            </div>
                          )}
                          {player.role === "SB" && (
                            <div
                              className="flex h-6 min-w-[1.55rem] items-center justify-center rounded-full border border-amber-200/70 bg-amber-200 px-1 text-[9px] font-black text-amber-950 shadow-md md:h-7 md:text-[10px]"
                              title={t("lobby.smallBlind")}
                            >
                              SB
                            </div>
                          )}
                          {player.role === "BB" && (
                            <div
                              className="flex h-6 min-w-[1.55rem] items-center justify-center rounded-full border border-cyan-200/50 bg-slate-900 px-1 text-[9px] font-black text-cyan-100 shadow-md md:h-7 md:text-[10px]"
                              title={t("lobby.bigBlind")}
                            >
                              BB
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
        {/* ─── FIN PLAYERS ─────────────────────────────────────────────────── */}

      </div>
    </div>
  );
}
