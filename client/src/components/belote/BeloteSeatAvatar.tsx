import { useTranslation } from "react-i18next";
import { Clock, WifiOff } from "lucide-react";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import { getPokerTableAvatar } from "../../utils/avatars";
import { useDeadlineCountdown } from "../../hooks/useDeadlineCountdown";

type BeloteTeamId = "A" | "B";

type Props = {
  username: string;
  userId: string;
  heroUserId: string;
  avatarUrl?: string | null;
  /** Badge équipe au-dessus de l’avatar (style poker). */
  team?: BeloteTeamId;
  isYou?: boolean;
  isPartner?: boolean;
  isTurn?: boolean;
  turnTimeLeft?: number | null;
  turnDuration?: number;
  disconnectedAt?: string | null;
  disconnectDeadline?: string | null;
  forfeited?: boolean;
  isPresent?: boolean;
  size?: "sm" | "md" | "hero";
};

const TEAM_BADGE_CLASS: Record<BeloteTeamId, string> = {
  A: "border-amber-200/85 bg-gradient-to-br from-amber-600 via-amber-950 to-slate-950 text-amber-50 shadow-[0_0_10px_rgba(251,191,36,0.4),0_4px_10px_rgba(0,0,0,0.55)]",
  B: "border-cyan-200/80 bg-gradient-to-br from-cyan-600 via-cyan-950 to-slate-950 text-cyan-50 shadow-[0_0_10px_rgba(34,211,238,0.35),0_4px_10px_rgba(0,0,0,0.55)]",
};

export function BeloteSeatAvatar({
  username,
  userId,
  heroUserId,
  avatarUrl,
  team,
  isYou = false,
  isPartner = false,
  isTurn = false,
  turnTimeLeft = null,
  turnDuration = 30,
  disconnectedAt,
  disconnectDeadline,
  forfeited = false,
  isPresent = true,
  size = "md",
}: Props) {
  const { t } = useTranslation();
  const disconnectSec = useDeadlineCountdown(disconnectDeadline);
  const avatarSrc = getPokerTableAvatar(username, userId, heroUserId, avatarUrl);

  const sizeClass =
    size === "hero"
      ? "w-[clamp(4rem,8.5vw,5.7rem)] h-[clamp(4rem,8.5vw,5.7rem)]"
      : size === "sm"
        ? "w-[clamp(3.1rem,8vw,4.35rem)] h-[clamp(3.1rem,8vw,4.35rem)]"
        : "w-[clamp(3.6rem,7vw,5rem)] h-[clamp(3.6rem,7vw,5rem)]";

  const borderClass = isYou
    ? "border-amber-300/90 ring-2 ring-amber-500/35"
    : isPartner
      ? "border-emerald-400/70 ring-1 ring-emerald-500/30"
      : "border-cyan-100/80";

  const timerDuration = Math.max(1, turnDuration);
  const timerLeft =
    turnTimeLeft != null
      ? Math.max(0, Math.min(timerDuration, turnTimeLeft))
      : null;
  const timerProgress =
    timerLeft != null ? (timerLeft / timerDuration) * 100 : 0;
  const timerArcLength = 100;
  const timerArcOffset = timerArcLength - timerProgress;
  const showTurnTimer = isTurn && timerLeft != null && !forfeited && !disconnectedAt;

  const offline = !isPresent && !disconnectedAt && !forfeited;
  const disconnected = Boolean(disconnectedAt) && !forfeited;

  const teamTitle =
    team === "A" ? t("belote.teamA") : team === "B" ? t("belote.teamB") : undefined;

  return (
    <div className="relative flex flex-col items-center">
      {team ? (
        <div
          className="pointer-events-none absolute -top-5 left-1/2 z-[55] flex -translate-x-1/2"
          title={teamTitle}
        >
          <div
            className={`flex h-5 w-5 items-center justify-center rounded-full border font-black ring-1 ring-black/40 md:h-6 md:w-6 md:text-[11px] text-[10px] ${TEAM_BADGE_CLASS[team]}`}
            aria-label={teamTitle}
          >
            {team}
          </div>
        </div>
      ) : null}

      {isTurn && !forfeited ? (
        <div
          className={`pointer-events-none absolute left-1/2 z-[54] flex -translate-x-1/2 whitespace-nowrap ${
            team ? "-top-9 md:-top-10" : "-top-7"
          }`}
        >
          <div className="inline-flex items-center gap-0.5 rounded-full border border-yellow-200/55 bg-yellow-300 px-1.5 py-0.5 text-[8px] font-black leading-none text-black shadow-[0_0_12px_rgba(250,204,21,0.35)] md:text-[9px]">
            <Clock className="h-2.5 w-2.5 animate-pulse" />
            {isYou ? t("belote.turnYou") : t("belote.turnPlayer")}
          </div>
        </div>
      ) : null}

      <div className="relative overflow-visible">
        {showTurnTimer ? (
          <svg
            className={`pointer-events-none absolute -inset-[0.72rem] z-40 h-[calc(100%+1.44rem)] w-[calc(100%+1.44rem)] overflow-visible ${
              timerLeft != null && timerLeft <= 5 ? "animate-pulse" : ""
            }`}
            viewBox="0 0 100 100"
            aria-hidden
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
              stroke={timerLeft != null && timerLeft <= 5 ? "#ef4444" : "#facc15"}
              strokeWidth="3"
              strokeLinecap="round"
              pathLength={timerArcLength}
              strokeDasharray={timerArcLength}
              strokeDashoffset={timerArcOffset}
              className="drop-shadow-[0_0_6px_rgba(250,204,21,0.65)]"
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.2s ease" }}
            />
          </svg>
        ) : null}

        <div
          className={`relative rounded-full overflow-hidden border-[3px] bg-slate-950 shadow-[0_10px_24px_rgba(0,0,0,0.45)] transition ${sizeClass} ${borderClass} ${
            forfeited ? "grayscale opacity-50" : ""
          } ${disconnected || offline ? "opacity-70" : ""}`}
        >
          <ImageWithFallback
            src={avatarSrc}
            alt={username}
            className={`h-full w-full object-cover ${forfeited ? "blur-[1px]" : ""}`}
          />
          {(disconnected || offline) && !forfeited ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/55">
              <WifiOff className="h-5 w-5 text-amber-300/90" />
            </div>
          ) : null}
          {forfeited ? (
            <div className="absolute inset-0 flex items-center justify-center bg-red-950/65">
              <span className="text-[9px] font-black uppercase text-red-200">
                {t("belote.forfeit")}
              </span>
            </div>
          ) : null}
        </div>

        <div
          className={`absolute -bottom-0.5 -right-0.5 z-50 h-3.5 w-3.5 rounded-full border-2 border-slate-900 ${
            isPresent && !disconnectedAt
              ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              : disconnected
                ? "bg-amber-500 animate-pulse"
                : "bg-slate-500"
          }`}
          title={
            forfeited
              ? t("belote.forfeit")
              : disconnected
                ? t("belote.disconnected")
                : isPresent
                  ? t("belote.present")
                  : t("belote.absent")
          }
        />
      </div>

      {disconnected && disconnectSec != null ? (
        <div className="mt-1 rounded-md border border-amber-500/40 bg-amber-950/80 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-amber-200">
          {t("belote.reconnectCountdown", { sec: disconnectSec })}
        </div>
      ) : offline ? (
        <div className="mt-1 text-[10px] font-semibold text-slate-400">{t("belote.absent")}</div>
      ) : null}
    </div>
  );
}
