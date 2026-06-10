import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft } from "lucide-react";
import { ChipIcon } from "../ChipIcon";
import { RocketIcon } from "./RocketIcon";
import {
  CRASH_BET_PRESETS,
  CRASH_MAX_BET,
} from "../../features/crash/crashMath";
import { getCrashMultiplierColor, historyPillStyle } from "../../features/crash/crashCanvas";

export type CrashUiPhase = "ready" | "running" | "cashed_out" | "crashed";

type CrashGameViewProps = {
  phase: CrashUiPhase;
  multiplier: number;
  bet: number;
  autoCashout: string;
  balance: number;
  history: number[];
  cashedOutAt: number | null;
  cashoutProfit: number | null;
  acting: boolean;
  insufficient: boolean;
  canPlaceBet: boolean;
  hasBet: boolean;
  countdown: number;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onBack: () => void;
  onBetChange: (value: number) => void;
  onAutoCashoutChange: (value: string) => void;
  onPlaceBet: () => void;
  onCashout: () => void;
  onRelaunch: () => void;
};

const STAR_SEEDS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  w: (i * 17) % 3 + 1,
  left: ((i * 47) % 100),
  top: ((i * 31) % 80),
  opacity: ((i * 13) % 50) / 100 + 0.1,
  duration: (i % 3) + 2,
  delay: (i % 5) * 0.4,
}));

export function CrashGameView({
  phase,
  multiplier,
  bet,
  autoCashout,
  balance,
  history,
  cashedOutAt,
  cashoutProfit,
  acting,
  insufficient,
  canPlaceBet,
  hasBet,
  countdown,
  canvasRef,
  onBack,
  onBetChange,
  onAutoCashoutChange,
  onPlaceBet,
  onCashout,
  onRelaunch,
}: CrashGameViewProps) {
  const { t } = useTranslation();
  const multColor = getCrashMultiplierColor(multiplier);
  const isRunning = phase === "running" || phase === "cashed_out";
  const hasCashedOut = phase === "cashed_out" || cashedOutAt != null;
  const betLocked = phase !== "ready" || hasBet;

  const stars = useMemo(() => STAR_SEEDS, []);

  const mainButton = () => {
    if (phase === "running") {
      return (
        <motion.button
          type="button"
          onClick={onCashout}
          disabled={acting}
          whileTap={{ scale: 0.97 }}
          animate={{
            boxShadow: [
              "0 0 20px rgba(16,185,129,0.4)",
              "0 0 40px rgba(16,185,129,0.7)",
              "0 0 20px rgba(16,185,129,0.4)",
            ],
          }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-full rounded-xl py-4 text-lg font-black uppercase tracking-wide text-white transition-all disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
        >
          {t("crash.cashoutAt", { mult: multiplier.toFixed(2) })}
        </motion.button>
      );
    }
    if (phase === "crashed" || phase === "cashed_out") {
      return (
        <motion.button
          type="button"
          onClick={onRelaunch}
          whileTap={{ scale: 0.97 }}
          className="w-full rounded-xl py-4 text-lg font-black uppercase tracking-wide text-white"
          style={{
            background: "linear-gradient(135deg, #7c3aed, #06b6d4)",
            boxShadow: "0 0 30px rgba(124,58,237,0.4)",
          }}
        >
          {t("crash.relaunch")}
        </motion.button>
      );
    }
    if (hasBet) {
      return (
        <motion.button
          type="button"
          disabled
          className="w-full rounded-xl py-4 text-lg font-black uppercase tracking-wide text-white/70"
          style={{
            background: "rgba(124,58,237,0.2)",
            border: "1px solid rgba(124,58,237,0.35)",
            boxShadow: "0 0 20px rgba(124,58,237,0.2)",
          }}
        >
          <span className="flex items-center justify-center gap-2">
            <RocketIcon size={22} glowing />
            {acting ? t("crash.roundStarting") : t("crash.betPlaced", { seconds: countdown })}
          </span>
        </motion.button>
      );
    }
    return (
      <motion.button
        type="button"
        onClick={onPlaceBet}
        disabled={!canPlaceBet || acting}
        whileTap={{ scale: 0.97 }}
        className="w-full rounded-xl py-4 text-lg font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed disabled:opacity-30"
        style={{
          background: canPlaceBet
            ? "linear-gradient(135deg, #7c3aed, #06b6d4)"
            : "rgba(255,255,255,0.05)",
          boxShadow: canPlaceBet ? "0 0 30px rgba(124,58,237,0.4)" : "none",
          color: canPlaceBet ? "white" : "rgba(255,255,255,0.4)",
        }}
      >
        <span className="flex items-center justify-center gap-2">
          <RocketIcon size={22} glowing={canPlaceBet} />
          {t("crash.placeBet")}
        </span>
      </motion.button>
    );
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0a0b14] text-white">
      <div className="flex items-center justify-between border-b border-white/5 bg-[#0d0e1f] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="mr-1 inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-300 sm:hidden"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#13142a]">
            <RocketIcon size={26} glowing />
          </div>
          <span className="truncate bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-lg font-bold tracking-wide text-transparent">
            {t("crash.brand")}
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden max-w-[420px] items-center gap-2 overflow-hidden sm:flex">
            {history.slice(0, 7).map((h, i) => {
              const style = historyPillStyle(h);
              return (
                <motion.span
                  key={`${h}-${i}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold"
                  style={style}
                >
                  {h.toFixed(2)}x
                </motion.span>
              );
            })}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1a1b2e] px-3 py-2 sm:px-4">
            <ChipIcon size="sm" />
            <span className="text-sm font-bold tabular-nums">{balance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative flex items-center justify-center bg-[#0d0e1f] py-5 sm:py-6">
            <AnimatePresence mode="wait">
              {phase === "ready" ? (
                <motion.div
                  key="ready"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-1 px-4 text-center"
                >
                  <span className="text-sm uppercase tracking-widest text-white/40">
                    {t("crash.countdownLabel")}
                  </span>
                  <motion.span
                    key={countdown}
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-5xl font-black tabular-nums sm:text-6xl"
                    style={{ color: "#60efff", textShadow: "0 0 30px rgba(96,239,255,0.5)" }}
                  >
                    {countdown}s
                  </motion.span>
                  {hasBet ? (
                    <p className="mt-1 text-xs font-medium text-violet-300/80">{t("crash.betLocked")}</p>
                  ) : (
                    <p className="mt-1 text-xs italic text-slate-500">{t("crash.tagline")}</p>
                  )}
                </motion.div>
              ) : phase === "crashed" ? (
                <motion.div
                  key="crashed"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-1"
                >
                  <span className="text-sm font-bold uppercase tracking-widest text-[#f43f5e]">
                    {t("crash.crashedLabel")}
                  </span>
                  <motion.span
                    className="text-5xl font-black tabular-nums sm:text-6xl"
                    style={{ color: "#f43f5e", textShadow: "0 0 40px rgba(244,63,94,0.7)" }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    {multiplier.toFixed(2)}x
                  </motion.span>
                </motion.div>
              ) : (
                <motion.div
                  key="running"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-1"
                >
                  {hasCashedOut ? (
                    <span className="text-sm font-bold uppercase tracking-widest text-green-400">
                      {t("crash.statusCashedOut", { mult: (cashedOutAt ?? multiplier).toFixed(2) })}
                    </span>
                  ) : (
                    <span className="text-sm uppercase tracking-widest text-white/40">
                      {t("crash.multiplierLabel")}
                    </span>
                  )}
                  <motion.span
                    className="text-5xl font-black tabular-nums leading-none sm:text-7xl"
                    style={{
                      color: multColor,
                      textShadow: `0 0 40px ${multColor}88`,
                      filter: "drop-shadow(0 0 20px currentColor)",
                    }}
                    animate={{ scale: multiplier > 5 ? [1, 1.02, 1] : 1 }}
                    transition={{ repeat: Infinity, duration: 0.3 }}
                  >
                    {multiplier.toFixed(2)}x
                  </motion.span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative min-h-[220px] flex-1 overflow-hidden bg-[#080914] sm:min-h-[320px]">
            <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 0 }}>
              {stars.map((s) => (
                <motion.div
                  key={s.id}
                  className="absolute rounded-full bg-white"
                  style={{
                    width: s.w,
                    height: s.w,
                    left: `${s.left}%`,
                    top: `${s.top}%`,
                    opacity: s.opacity,
                  }}
                  animate={{ opacity: [0.1, 0.6, 0.1] }}
                  transition={{ repeat: Infinity, duration: s.duration, delay: s.delay }}
                />
              ))}
            </div>
            <canvas
              ref={canvasRef}
              width={800}
              height={400}
              className="absolute inset-0 h-full w-full"
              style={{ display: "block", zIndex: 1 }}
            />
            <AnimatePresence>
              {hasCashedOut && isRunning && cashoutProfit != null ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-green-500/50 bg-green-500/20 px-6 py-4 text-center backdrop-blur-sm sm:px-8"
                >
                  <div className="mb-1 text-2xl">🎉</div>
                  <div className="text-lg font-bold text-green-400">{t("crash.cashedTitle")}</div>
                  <div className="flex items-center justify-center gap-1.5 text-2xl font-black text-white">
                    <span>+{cashoutProfit.toLocaleString()}</span>
                    <ChipIcon size="sm" />
                  </div>
                  <div className="text-sm text-green-400/70">
                    {t("crash.resultCashed", { mult: (cashedOutAt ?? multiplier).toFixed(2) })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/5 bg-[#0d0e1f] px-4 py-2 sm:hidden">
            {history.slice(0, 7).map((h, i) => {
              const style = historyPillStyle(h);
              return (
                <span key={`mob-${h}-${i}`} className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={style}>
                  {h.toFixed(2)}x
                </span>
              );
            })}
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 border-t border-white/5 bg-[#0d0e1f] p-4 lg:w-72 lg:border-l lg:border-t-0">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/50">
              {t("crash.betLabel")}
            </label>
            <div className="relative">
              <input
                type="number"
                value={bet}
                min={10}
                max={CRASH_MAX_BET}
                step={10}
                onChange={(e) => onBetChange(Number(e.target.value))}
                disabled={betLocked}
                className="w-full rounded-xl border border-white/10 bg-[#13142a] px-4 py-3 text-lg font-bold text-white outline-none transition-colors focus:border-cyan-500/50 disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2">
                <ChipIcon size="sm" />
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {CRASH_BET_PRESETS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onBetChange(v)}
                  disabled={betLocked || balance < v}
                  className="flex-1 rounded-lg bg-white/5 py-1.5 text-xs text-white/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-30"
                >
                  {v === CRASH_MAX_BET ? t("minigames.betPresetMax") : v}
                </button>
              ))}
            </div>
            {insufficient && phase === "ready" ? (
              <p className="mt-2 text-xs text-red-300">{t("crash.insufficientBalance")}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-widest text-white/50">
              {t("crash.autoCashoutLabel")}
            </label>
            <div className="relative">
              <input
                type="number"
                value={autoCashout}
                onChange={(e) => onAutoCashoutChange(e.target.value)}
                step="0.1"
                min="1.1"
                disabled={betLocked}
                className="w-full rounded-xl border border-white/10 bg-[#13142a] px-4 py-3 text-lg font-bold text-white outline-none transition-colors focus:border-violet-500/50 disabled:opacity-50"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/30">x</span>
            </div>
          </div>

          <div className="lg:mt-auto">{mainButton()}</div>

          <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-4">
            <div className="rounded-xl bg-[#13142a] p-3 text-center">
              <div className="mb-1 text-xs text-white/30">{t("crash.potentialWin")}</div>
              <div className="flex items-center justify-center gap-1 text-sm font-bold text-cyan-400">
                <span>{(bet * multiplier).toLocaleString()}</span>
                <ChipIcon size="sm" />
              </div>
            </div>
            <div className="rounded-xl bg-[#13142a] p-3 text-center">
              <div className="mb-1 text-xs text-white/30">{t("crash.lastCrash")}</div>
              <div
                className="text-sm font-bold"
                style={{ color: history[0] ? getCrashMultiplierColor(history[0]) : "#fff" }}
              >
                {history[0] ? `${history[0].toFixed(2)}x` : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
