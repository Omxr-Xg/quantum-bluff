import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { ChipIcon } from "../ChipIcon";
import { SoloGameBackButton } from "../minigames/SoloGameBackButton";
import {
  LUCKY_NUMBER_BET_PRESETS,
  LUCKY_NUMBER_CHOICES,
  LUCKY_NUMBER_MAX_BET,
  LUCKY_NUMBER_WIN_MULTIPLIER,
} from "../../features/luckyNumber/luckyNumberMath";

const GOLD = "#c9a84c";
const GREEN = "#4ade80";
const RED = "#f87171";

export type LuckyNumberUiPhase = "ready" | "drawing" | "result";

export type LuckyHistoryRow = {
  id: string;
  playerNumber: number;
  houseNumber: number;
  profit: number;
  win: boolean;
};

type LuckyNumberGameViewProps = {
  phase: LuckyNumberUiPhase;
  balance: number;
  bet: number;
  selectedNumber: number;
  houseDisplay: number | null;
  lastResult: { drawnNumber: number; win: boolean; profit: number } | null;
  history: LuckyHistoryRow[];
  acting: boolean;
  insufficient: boolean;
  canPlay: boolean;
  onBack: () => void;
  onBetChange: (bet: number) => void;
  onSelectNumber: (n: number) => void;
  onPlay: () => void;
  onReplay: () => void;
};

function OrnamentDivider() {
  return (
    <div className="my-2 flex items-center gap-3">
      <div
        className="h-px flex-1"
        style={{ background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4))" }}
      />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path
          d="M10 2 L12 8 L18 8 L13 12 L15 18 L10 14 L5 18 L7 12 L2 8 L8 8 Z"
          fill={GOLD}
          opacity="0.7"
        />
      </svg>
      <div
        className="h-px flex-1"
        style={{ background: "linear-gradient(to left, transparent, rgba(201,168,76,0.4))" }}
      />
    </div>
  );
}

function NumberBall({
  value,
  color,
  label,
  animating,
}: {
  value: number | null;
  color: string;
  label: string;
  animating?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      <span
        className="text-[10px] font-medium uppercase tracking-widest sm:text-xs"
        style={{ color: "rgba(237,220,170,0.5)", fontFamily: "ui-monospace, monospace" }}
      >
        {label}
      </span>
      <motion.div
        className="relative flex items-center justify-center rounded-full"
        style={{
          width: "min(28vw, 120px)",
          height: "min(28vw, 120px)",
          background: `radial-gradient(circle at 35% 35%, ${color}22, transparent 70%), radial-gradient(circle at center, #16162a, #0e0e1a)`,
          border: `2px solid ${color}55`,
          boxShadow: animating
            ? `0 0 40px ${color}88, 0 0 80px ${color}44, inset 0 0 20px ${color}22`
            : `0 0 20px ${color}33, inset 0 0 10px ${color}11`,
        }}
        animate={animating ? { scale: [1, 1.06, 1], rotate: [0, 2, -2, 0] } : { scale: 1 }}
        transition={{ duration: 0.4, repeat: animating ? Infinity : 0, repeatType: "loop" }}
      >
        <span
          className="font-bold tabular-nums"
          style={{
            fontSize: value != null ? "clamp(2rem, 8vw, 2.625rem)" : "clamp(1.75rem, 7vw, 2.25rem)",
            color,
            textShadow: `0 0 20px ${color}`,
            lineHeight: 1,
          }}
        >
          {value != null ? value : "?"}
        </span>
        {animating ? (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: `1px solid ${color}66` }}
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}

function HistoryItem({ row }: { row: LuckyHistoryRow }) {
  const color = row.win ? GREEN : RED;
  const Icon = row.win ? TrendingUp : TrendingDown;
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-2 rounded px-3 py-2 sm:gap-3"
      style={{ background: "rgba(255,255,255,0.03)", borderLeft: `2px solid ${color}66` }}
    >
      <Icon size={14} color={color} />
      <span className="text-xs" style={{ color: "rgba(237,220,170,0.5)", fontFamily: "ui-monospace, monospace" }}>
        {row.playerNumber} vs {row.houseNumber}
      </span>
      <span
        className="ml-auto text-xs font-medium"
        style={{ color, fontFamily: "ui-monospace, monospace" }}
      >
        {row.profit > 0 ? `+${row.profit}` : row.profit < 0 ? row.profit : "—"}
      </span>
    </motion.div>
  );
}

export function LuckyNumberGameView({
  phase,
  balance,
  bet,
  selectedNumber,
  houseDisplay,
  lastResult,
  history,
  acting,
  insufficient,
  canPlay,
  onBack,
  onBetChange,
  onSelectNumber,
  onPlay,
  onReplay,
}: LuckyNumberGameViewProps) {
  const { t } = useTranslation();
  const controlsLocked = phase !== "ready" || acting;

  const win = lastResult?.win ?? false;
  const resultPhase = phase === "result" && lastResult != null;

  const playerColor = resultPhase
    ? win
      ? GREEN
      : RED
    : "#60a5fa";
  const houseColor = resultPhase
    ? win
      ? RED
      : GREEN
    : "#a78bfa";

  const stats = useMemo(() => {
    const wins = history.filter((h) => h.win).length;
    const totalPnl = history.reduce((s, h) => s + h.profit, 0);
    const rate = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;
    return { wins, totalPnl, rate };
  }, [history]);

  const betGrid = [...LUCKY_NUMBER_BET_PRESETS];

  return (
    <div
      className="flex h-[100dvh] w-full flex-col overflow-hidden text-white"
      style={{ background: "linear-gradient(180deg, #06060e 0%, #0e0e1a 40%, #06060e 100%)" }}
    >
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b px-3 py-3 backdrop-blur-md sm:px-5"
        style={{ borderColor: "rgba(201,168,76,0.12)", background: "linear-gradient(to right, #0e0e1a, #12121e)" }}
      >
        <SoloGameBackButton onClick={onBack} />
        <div className="flex items-center gap-2">
          <Sparkles size={14} color={GOLD} />
          <span
            className="hidden text-xs uppercase tracking-widest sm:inline"
            style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
          >
            {t("luckyNumber.balanceLabel")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-lg font-bold tabular-nums sm:text-xl"
            style={{ color: GOLD, fontFamily: "Georgia, serif" }}
          >
            {balance.toLocaleString()}
          </span>
          <ChipIcon size="sm" />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col items-center overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div
            className="mb-4 max-w-lg rounded px-4 py-3 text-center text-[11px] tracking-wide"
            style={{
              background: "rgba(201,168,76,0.06)",
              border: "1px solid rgba(201,168,76,0.18)",
              color: "rgba(237,220,170,0.65)",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {t("luckyNumber.ruleCard", { mult: LUCKY_NUMBER_WIN_MULTIPLIER })}
          </div>

          <OrnamentDivider />

          <div className="flex items-center gap-6 sm:gap-12 md:gap-20">
            <NumberBall
              value={selectedNumber}
              color={playerColor}
              label={t("luckyNumber.selectedLabel")}
              animating={phase === "drawing"}
            />
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
              style={{
                background: "rgba(201,168,76,0.08)",
                border: "1px solid rgba(201,168,76,0.3)",
                color: GOLD,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {t("luckyNumber.vs")}
            </div>
            <NumberBall
              value={houseDisplay}
              color={houseColor}
              label={t("luckyNumber.houseLabel")}
              animating={phase === "drawing"}
            />
          </div>

          <AnimatePresence mode="wait">
            {resultPhase ? (
              <motion.div
                key={win ? "win" : "lose"}
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="mt-6 flex flex-col items-center gap-1 rounded px-6 py-4 sm:px-8"
                style={{
                  background: `radial-gradient(ellipse at center, ${win ? GREEN : RED}15, transparent)`,
                  border: `1px solid ${win ? GREEN : RED}44`,
                }}
              >
                <span
                  className="text-xl font-bold tracking-widest sm:text-2xl"
                  style={{
                    color: win ? GREEN : RED,
                    textShadow: `0 0 20px ${win ? GREEN : RED}`,
                    fontFamily: "Georgia, serif",
                  }}
                >
                  {win ? t("luckyNumber.winTitle") : t("luckyNumber.loseTitle")}
                </span>
                <span className="text-sm" style={{ color: "rgba(237,220,170,0.55)" }}>
                  {win ? t("luckyNumber.winSubtitle") : t("luckyNumber.loseSubtitle")}
                </span>
                <div className="mt-1 flex items-center gap-1.5 text-lg font-bold" style={{ color: win ? GREEN : RED }}>
                  <span style={{ fontFamily: "ui-monospace, monospace" }}>
                    {lastResult.profit > 0 ? `+${lastResult.profit}` : `-${bet}`}
                  </span>
                  <ChipIcon size="sm" />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <OrnamentDivider />

          <div className="mb-4 w-full max-w-sm">
            <p
              className="mb-2 text-center text-[10px] uppercase tracking-widest"
              style={{ color: "rgba(237,220,170,0.45)", fontFamily: "ui-monospace, monospace" }}
            >
              {t("luckyNumber.pickNumber")}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {LUCKY_NUMBER_CHOICES.map((n) => {
                const picked = selectedNumber === n;
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={controlsLocked}
                    onClick={() => onSelectNumber(n)}
                    className="flex h-11 items-center justify-center rounded text-lg font-bold tabular-nums transition sm:h-12"
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      background: picked
                        ? `linear-gradient(135deg, ${GOLD}cc, ${GOLD}88)`
                        : "rgba(201,168,76,0.06)",
                      border: picked ? `1px solid ${GOLD}` : "1px solid rgba(201,168,76,0.18)",
                      color: picked ? "#06060e" : GOLD,
                      opacity: controlsLocked ? 0.45 : 1,
                      cursor: controlsLocked ? "not-allowed" : "pointer",
                      boxShadow: picked ? `0 0 16px ${GOLD}55` : "none",
                    }}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="w-full max-w-sm">
            <div className="mb-3 flex items-center justify-between">
              <span
                className="text-xs uppercase tracking-widest"
                style={{ color: "rgba(237,220,170,0.4)", fontFamily: "ui-monospace, monospace" }}
              >
                {t("luckyNumber.betLabel")}
              </span>
              <span
                className="flex items-center gap-1 text-sm font-medium"
                style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
              >
                {bet.toLocaleString()}
                <ChipIcon size="sm" />
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {betGrid.map((b) => (
                <button
                  key={b}
                  type="button"
                  disabled={controlsLocked || balance < b}
                  onClick={() => onBetChange(b)}
                  className="rounded py-2 text-xs transition-all duration-200"
                  style={{
                    fontFamily: "ui-monospace, monospace",
                    background:
                      bet === b
                        ? `linear-gradient(135deg, ${GOLD}cc, ${GOLD}88)`
                        : "rgba(201,168,76,0.06)",
                    border: bet === b ? `1px solid ${GOLD}` : "1px solid rgba(201,168,76,0.18)",
                    color: bet === b ? "#06060e" : GOLD,
                    opacity: controlsLocked || balance < b ? 0.35 : 1,
                    cursor: controlsLocked || balance < b ? "not-allowed" : "pointer",
                  }}
                >
                  {b === LUCKY_NUMBER_MAX_BET ? t("minigames.betPresetMax") : b}
                </button>
              ))}
            </div>
            {insufficient && phase === "ready" ? (
              <p className="mt-2 text-center text-xs text-red-400">{t("luckyNumber.insufficientBalance")}</p>
            ) : null}
          </div>

          <div className="mt-6 flex min-h-[52px] items-center justify-center">
            {phase === "ready" ? (
              <motion.button
                type="button"
                onClick={onPlay}
                disabled={!canPlay}
                whileHover={{ scale: canPlay ? 1.03 : 1 }}
                whileTap={{ scale: canPlay ? 0.97 : 1 }}
                className="rounded px-10 py-3 sm:px-12"
                style={{
                  background: canPlay
                    ? "linear-gradient(135deg, #c9a84c, #a8873b, #c9a84c)"
                    : "rgba(255,255,255,0.05)",
                  border: canPlay ? "1px solid #d4b060" : "1px solid rgba(255,255,255,0.08)",
                  color: canPlay ? "#06060e" : "rgba(237,220,170,0.3)",
                  fontFamily: "Georgia, serif",
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  cursor: canPlay ? "pointer" : "not-allowed",
                  boxShadow: canPlay ? "0 4px 24px rgba(201,168,76,0.4)" : "none",
                }}
              >
                {t("luckyNumber.launch")}
              </motion.button>
            ) : null}
            {phase === "drawing" ? (
              <div className="flex items-center gap-3 px-8 py-3">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="h-2 w-2 rounded-full"
                    style={{ background: GOLD }}
                    animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                    transition={{ duration: 0.8, delay: i * 0.2, repeat: Infinity }}
                  />
                ))}
              </div>
            ) : null}
            {phase === "result" ? (
              <motion.button
                type="button"
                onClick={onReplay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="rounded px-10 py-3 sm:px-12"
                style={{
                  background: "rgba(201,168,76,0.06)",
                  border: "1px solid rgba(201,168,76,0.35)",
                  color: GOLD,
                  fontFamily: "Georgia, serif",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                }}
              >
                {t("luckyNumber.replay")}
              </motion.button>
            ) : null}
          </div>

          <div className="mt-6 w-full max-w-sm md:hidden">
            <span
              className="mb-2 block text-xs uppercase tracking-widest"
              style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
            >
              {t("luckyNumber.historyTitle")}
            </span>
            {history.length === 0 ? (
              <p className="py-2 text-center text-xs" style={{ color: "rgba(237,220,170,0.25)" }}>
                {t("luckyNumber.historyEmpty")}
              </p>
            ) : (
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                {history.slice(0, 8).map((row) => (
                  <HistoryItem key={row.id} row={row} />
                ))}
              </div>
            )}
          </div>
        </div>

        <aside
          className="hidden w-56 shrink-0 flex-col gap-4 overflow-y-auto border-l p-4 md:flex"
          style={{ borderColor: "rgba(201,168,76,0.12)", background: "rgba(6,6,14,0.5)" }}
        >
          <div>
            <span
              className="mb-3 block text-xs uppercase tracking-widest"
              style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
            >
              {t("luckyNumber.statsTitle")}
            </span>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t("luckyNumber.statsGames"), value: history.length },
                { label: t("luckyNumber.statsWins"), value: stats.wins },
                { label: t("luckyNumber.statsRate"), value: `${stats.rate}%` },
                {
                  label: t("luckyNumber.statsPnl"),
                  value: `${stats.totalPnl > 0 ? "+" : ""}${stats.totalPnl}`,
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded p-2 text-center"
                  style={{ background: "rgba(201,168,76,0.05)", border: "1px solid rgba(201,168,76,0.1)" }}
                >
                  <div
                    className="text-[10px]"
                    style={{ color: "rgba(237,220,170,0.4)", fontFamily: "ui-monospace, monospace" }}
                  >
                    {label}
                  </div>
                  <div
                    className="mt-0.5 text-sm font-medium"
                    style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <OrnamentDivider />

          <div className="flex min-h-0 flex-1 flex-col">
            <span
              className="mb-3 block text-xs uppercase tracking-widest"
              style={{ color: GOLD, fontFamily: "ui-monospace, monospace" }}
            >
              {t("luckyNumber.historyTitle")}
            </span>
            {history.length === 0 ? (
              <p className="py-4 text-center text-xs" style={{ color: "rgba(237,220,170,0.25)" }}>
                {t("luckyNumber.historyEmpty")}
              </p>
            ) : (
              <div className="flex flex-col gap-1.5 overflow-y-auto">
                {history.map((row) => (
                  <HistoryItem key={row.id} row={row} />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
