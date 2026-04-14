import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChipIcon } from "./ChipIcon";
import logoSrc from "../assets/logo-personnel.png";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { PokerCard } from "./PokerCard";
import { Clock } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";
import { useTableTheme } from "../contexts/TableThemeContext";
import { calculatePlayerPositions } from "../utils/tablePositions";

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
}: PokerTableProps) {
  const { t } = useTranslation();
  const { feltGradient, feltBorder } = useTableTheme();
  const isShowdown = phase === "showdown";

  const deviceType = useDeviceType();
  const isMobile  = deviceType === "mobile";
  const isTablet  = deviceType === "tablet";

  // Positions calculées pour TOUS les sièges (même index = même position)
  const allPositions = calculatePlayerPositions(
    players.length > 0 ? players.length : 1,
    isMobile,
    isTablet
  );

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
          // Sur mobile : on part de la largeur disponible mais on donne
          // plus de hauteur pour que les avatars haut/bas soient visibles
          width: "clamp(240px, 88vw, 480px)",
          aspectRatio: "950 / 420",
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
          className="relative w-full h-full rounded-full border-[clamp(3px,1vw,8px)]"
          style={{
            background: feltGradient,
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
          <div className="absolute top-[18%] left-1/2 -translate-x-1/2 flex justify-center">
            {children}
          </div>

          {/* Cartes brûlées */}
          {burnedCardsCount > 0 && (
            <div
              className="absolute right-[16%] top-[24%] pointer-events-none"
              title={t("game.burned")}
              aria-label={t("game.burnedCount", { count: burnedCardsCount })}
            >
              <div className="relative">
                <div className="absolute -inset-2 rounded-xl bg-black/20 blur-md" />
                <div className="relative flex -space-x-3">
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

            const xPct = toPercent(pos.x, BASE_TABLE_WIDTH  / 2);
            const yPct = toPercent(pos.y, BASE_TABLE_HEIGHT / 2);

            return (
              <div
                key={player.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                style={{
                  left: `calc(50% + ${xPct}%)`,
                  top:  `calc(50% + ${yPct}%)`,
                  zIndex: player.position === 0 ? 20 : 10,
                }}
              >
                <div className="flex flex-col items-center gap-1">

                  {/* Dealer / SB / BB */}
                  {(player.isDealer || player.role === "SB" || player.role === "BB") && (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      {player.isDealer && (
                        <div
                          className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-white border-2 border-slate-300 text-slate-700 font-bold text-xs md:text-sm shadow-md"
                          title={t("game.dealer")}
                        >
                          D
                        </div>
                      )}
                      {player.role === "SB" && (
                        <div
                          className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border-2 border-amber-800/40 bg-amber-100 px-1 text-[10px] font-bold text-amber-950 shadow-md md:h-8 md:text-xs"
                          title={t("lobby.smallBlind")}
                        >
                          SB
                        </div>
                      )}
                      {player.role === "BB" && (
                        <div
                          className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border-2 border-amber-500/50 bg-slate-800 px-1 text-[10px] font-bold text-amber-100 shadow-md md:h-8 md:text-xs"
                          title={t("lobby.bigBlind")}
                        >
                          BB
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tour actif */}
                  {player.isActive && (
                    <div className="inline-flex items-center gap-1 bg-yellow-400 text-black px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                      <Clock className="w-3 h-3 animate-pulse" />
                      {t("game.theirTurn")}
                    </div>
                  )}

                  {/* Avatar */}
                  <div
                    className={`rounded-full overflow-hidden border-2 transition relative
                      ${
                        player.position === 0
                          ? "w-[clamp(2.5rem,7vw,4.5rem)] h-[clamp(2.5rem,7vw,4.5rem)]"
                          : "w-[clamp(2rem,5vw,3.5rem)]  h-[clamp(2rem,5vw,3.5rem)]"
                      }
                      ${
                        player.hasFolded
                          ? "bg-red-900/60 border-red-500 grayscale"
                          : "bg-blue-500 border-white"
                      }
                      ${player.isActive ? "ring-4 ring-yellow-400 animate-pulse" : ""}`}
                  >
                    {getPlayerAvatar(player.name, player.id, heroSeatId, player.avatar) ? (
                      <ImageWithFallback
                        src={
                          getPlayerAvatar(
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

                    {/* Indicateur connexion */}
                    <div
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-800 ${
                        player.isConnected !== false
                          ? "bg-green-500 animate-pulse"
                          : "bg-red-500"
                      }`}
                      title={
                        player.isConnected !== false
                          ? t("friends.online")
                          : t("friends.offline")
                      }
                      aria-hidden="true"
                    />
                  </div>

                  {/* Nom */}
                  <div
                    className={`text-[clamp(9px,1.2vw,12px)] px-2 py-0.5 rounded font-medium whitespace-nowrap ${
                      player.hasFolded
                        ? "bg-red-900/80 text-red-300 line-through"
                        : "bg-black/90 text-white"
                    }`}
                  >
                    {player.name}
                  </div>

                  {/* Dernière action */}
                  {player.lastAction && (
                    <div
                      className="bg-emerald-600/95 text-white text-[clamp(8px,1vw,11px)] px-2 py-0.5 rounded border border-emerald-400/50 shadow-lg whitespace-nowrap max-w-[120px] truncate"
                      title={player.lastAction}
                    >
                      {player.lastAction}
                    </div>
                  )}

                  {/* Chips */}
                  <div className="flex items-center gap-1 text-white text-[clamp(9px,1.2vw,13px)] font-bold">
                    <ChipIcon size="sm" />
                    {player.chips.toLocaleString()}
                  </div>

                  {/* Cartes adversaires (face cachée / showdown) */}
                  {player.cards &&
                    player.cards.length > 0 &&
                    !player.hasFolded &&
                    player.position !== 0 &&
                    player.name !== "Vous" &&
                    player.name !== "you" && (
                      <div className="flex gap-1">
                        {player.cards.map((card, index) => (
                          <PokerCard
                            key={index}
                            suit={card.suit}
                            value={card.value}
                            size="sm"
                            faceDown={!isShowdown}
                            colorblindMode={colorblindMode}
                          />
                        ))}
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
