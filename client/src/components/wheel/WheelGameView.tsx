import { useMemo } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { ChipIcon } from "../ChipIcon";
import { SoloGameBackButton } from "../minigames/SoloGameBackButton";
import { WHEEL_BET_PRESETS, WHEEL_MAX_BET, WHEEL_SEGMENTS } from "../../features/wheel/wheelMath";
import { getWheelSegmentVisual, uniquePaytableEntries } from "../../features/wheel/wheelVisuals";

export type WheelUiPhase = "ready" | "spinning" | "result";

type HistoryRow = { label: string; amount: number; glow: string; positive: boolean };

type WheelGameViewProps = {
  phase: WheelUiPhase;
  balance: number;
  bet: number;
  maxBet: number;
  spinning: boolean;
  insufficient: boolean;
  canSpin: boolean;
  result: { label: string; gain: number; profit: number; glow: string; text: string } | null;
  showResult: boolean;
  history: HistoryRow[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onBack: () => void;
  onBetChange: (bet: number) => void;
  onSpin: () => void;
  onRelaunch: () => void;
};

const BET_GRID = [...WHEEL_BET_PRESETS];

export function WheelGameView({
  phase,
  balance,
  bet,
  maxBet,
  spinning,
  insufficient,
  canSpin,
  result,
  showResult,
  history,
  canvasRef,
  containerRef,
  onBack,
  onBetChange,
  onSpin,
  onRelaunch,
}: WheelGameViewProps) {
  const { t } = useTranslation();
  const paytable = useMemo(() => uniquePaytableEntries(WHEEL_SEGMENTS), []);
  const betLocked = phase !== "ready";

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col"
      style={{ background: "linear-gradient(135deg, #020208 0%, #06040f 50%, #020208 100%)" }}
    >
      <header
        className="flex w-full items-center justify-between gap-3 px-3 py-3 backdrop-blur-md sm:px-5"
        style={{ borderBottom: "1px solid rgba(200,168,76,0.2)" }}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <SoloGameBackButton onClick={onBack} />
          <div className="min-w-0">
            <div
              className="truncate uppercase"
              style={{ fontSize: 10, color: "rgba(200,168,76,0.5)", letterSpacing: "0.35em" }}
            >
              {t("wheel.casinoBrand")}
            </div>
            <div
              className="truncate font-bold uppercase tracking-wide"
              style={{ fontSize: 16, color: "#C9A84C", textShadow: "0 0 20px rgba(200,168,76,0.5)" }}
            >
              {t("wheel.brand")}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
          <div className="text-right">
            <div
              style={{
                fontSize: 10,
                color: "rgba(255,255,255,0.3)",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              {t("wheel.balanceLabel")}
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <span
                style={{
                  fontSize: 18,
                  color: "#FFD700",
                  fontWeight: 700,
                  textShadow: "0 0 16px rgba(255,215,0,0.5)",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                {balance.toLocaleString()}
              </span>
              <ChipIcon size="sm" />
            </div>
          </div>
        </div>
      </header>

      <div
        className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col items-center justify-center gap-6 px-4 py-6 lg:flex-row"
      >
        <div className="flex w-full flex-col gap-4 lg:w-64">
          <div
            className="rounded-xl p-5"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(200,168,76,0.2)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              className="mb-3 uppercase"
              style={{ fontSize: 10, letterSpacing: "0.3em", color: "rgba(200,168,76,0.6)" }}
            >
              {t("wheel.betLabel")}
            </div>
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onBetChange(Math.max(10, bet - 10))}
                disabled={betLocked}
                className="flex h-8 w-8 items-center justify-center rounded text-lg font-bold"
                style={{
                  background: "rgba(200,168,76,0.1)",
                  border: "1px solid rgba(200,168,76,0.3)",
                  color: "#C9A84C",
                  opacity: betLocked ? 0.4 : 1,
                }}
              >
                −
              </button>
              <div className="flex items-center gap-1.5">
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#FFD700",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {bet}
                </span>
                <ChipIcon size="sm" />
              </div>
              <button
                type="button"
                onClick={() => onBetChange(Math.min(maxBet, bet + 10))}
                disabled={betLocked}
                className="flex h-8 w-8 items-center justify-center rounded text-lg font-bold"
                style={{
                  background: "rgba(200,168,76,0.1)",
                  border: "1px solid rgba(200,168,76,0.3)",
                  color: "#C9A84C",
                  opacity: betLocked ? 0.4 : 1,
                }}
              >
                +
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {BET_GRID.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => onBetChange(Math.min(maxBet, b))}
                  disabled={betLocked || balance < b}
                  className="rounded py-1.5 text-xs font-bold"
                  style={{
                    background: bet === b ? "rgba(200,168,76,0.25)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${bet === b ? "rgba(200,168,76,0.6)" : "rgba(255,255,255,0.08)"}`,
                    color: bet === b ? "#FFD700" : "rgba(255,255,255,0.4)",
                    fontFamily: "ui-monospace, monospace",
                    opacity: betLocked || balance < b ? 0.35 : 1,
                  }}
                >
                  {b === WHEEL_MAX_BET ? t("minigames.betPresetMax") : b}
                </button>
              ))}
            </div>
            {insufficient && phase === "ready" ? (
              <p className="mt-2 text-xs text-red-400">{t("wheel.insufficientBalance")}</p>
            ) : null}
          </div>

          <div
            className="hidden rounded-xl p-5 lg:block"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,168,76,0.2)" }}
          >
            <div
              className="mb-3 uppercase"
              style={{ fontSize: 10, letterSpacing: "0.3em", color: "rgba(200,168,76,0.6)" }}
            >
              {t("wheel.payoutLegend")}
            </div>
            <div className="flex flex-col gap-1.5">
              {paytable.map((seg) => (
                <div key={seg.label} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ background: seg.glow, boxShadow: `0 0 6px ${seg.glow}` }}
                    />
                    <span style={{ fontSize: 12, color: seg.text, fontFamily: "ui-monospace, monospace" }}>
                      {seg.label}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "ui-monospace, monospace" }}>
                    {seg.multiplier === 0 ? "—" : `×${seg.multiplier}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div
            ref={containerRef}
            className="relative"
            style={{ width: "min(520px, 90vw)", height: "min(520px, 90vw)" }}
          >
            <canvas ref={canvasRef} className="block" />
            <div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(200,168,76,0.04) 0%, transparent 70%)",
              }}
            />
          </div>

          {phase === "result" ? (
            <button
              type="button"
              onClick={onRelaunch}
              style={{
                width: 220,
                height: 56,
                borderRadius: 8,
                background: "linear-gradient(135deg, #8a6a10 0%, #C9A84C 40%, #f0d060 60%, #C9A84C 80%, #8a6a10 100%)",
                border: "1px solid #FFD700",
                color: "#0a0800",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                boxShadow: "0 0 30px rgba(200,168,76,0.4)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {t("wheel.relaunch")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSpin}
              disabled={!canSpin || spinning}
              style={{
                width: 220,
                height: 56,
                borderRadius: 8,
                background:
                  !canSpin || spinning
                    ? "rgba(255,255,255,0.05)"
                    : "linear-gradient(135deg, #8a6a10 0%, #C9A84C 40%, #f0d060 60%, #C9A84C 80%, #8a6a10 100%)",
                border: "1px solid",
                borderColor: !canSpin || spinning ? "rgba(255,255,255,0.1)" : "#FFD700",
                color: !canSpin || spinning ? "rgba(255,255,255,0.2)" : "#0a0800",
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                cursor: !canSpin || spinning ? "not-allowed" : "pointer",
                boxShadow: !canSpin || spinning ? "none" : "0 0 30px rgba(200,168,76,0.4)",
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {spinning ? t("wheel.spinning").toUpperCase() : t("wheel.launch").toUpperCase()}
            </button>
          )}
        </div>

        <div className="flex w-full flex-col gap-4 lg:w-64">
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(200,168,76,0.2)", minHeight: 120 }}>
            <div
              className="px-5 py-3"
              style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(200,168,76,0.1)" }}
            >
              <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "rgba(200,168,76,0.6)", textTransform: "uppercase" }}>
                {t("wheel.resultTitle")}
              </div>
            </div>
            <div className="flex min-h-[90px] items-center justify-center" style={{ background: "rgba(0,0,0,0.2)" }}>
              <AnimatePresence mode="wait">
                {showResult && result ? (
                  <motion.div
                    key={`${result.label}-${result.gain}`}
                    initial={{ opacity: 0, scale: 0.6, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex flex-col items-center gap-1 py-4"
                  >
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        fontFamily: "ui-monospace, monospace",
                        color: result.text,
                        textShadow: `0 0 20px ${result.glow}, 0 0 40px ${result.glow}40`,
                      }}
                    >
                      {result.label}
                    </div>
                    {result.profit > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span style={{ fontSize: 22, fontWeight: 700, color: "#00FFB2", fontFamily: "ui-monospace, monospace" }}>
                          +{result.profit.toLocaleString()}
                        </span>
                        <ChipIcon size="sm" />
                      </div>
                    ) : result.profit < 0 ? (
                      <div style={{ fontSize: 12, color: "rgba(255,46,76,0.7)", letterSpacing: "0.15em", textTransform: "uppercase" }}>
                        {t("wheel.noGain")}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{t("wheel.gainBreakEven")}</div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div style={{ fontSize: 12, color: spinning ? "rgba(200,168,76,0.5)" : "rgba(255,255,255,0.2)", letterSpacing: "0.15em" }}>
                      {spinning ? t("wheel.statusSpinning") : t("wheel.waiting")}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid rgba(200,168,76,0.2)" }}>
            <div
              className="px-5 py-3"
              style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(200,168,76,0.1)" }}
            >
              <div style={{ fontSize: 10, letterSpacing: "0.3em", color: "rgba(200,168,76,0.6)", textTransform: "uppercase" }}>
                {t("wheel.history")}
              </div>
            </div>
            <div className="flex min-h-[120px] flex-col" style={{ background: "rgba(0,0,0,0.2)" }}>
              {history.length === 0 ? (
                <div className="flex flex-1 items-center justify-center">
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.15)" }}>{t("wheel.historyEmpty")}</span>
                </div>
              ) : (
                history.map((h, i) => (
                  <motion.div
                    key={`${h.label}-${i}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1 - i * 0.12, x: 0 }}
                    className="flex items-center justify-between px-5 py-2"
                    style={{ borderBottom: i < history.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full" style={{ background: h.glow }} />
                      <span style={{ fontSize: 13, color: h.glow, fontFamily: "ui-monospace, monospace" }}>{h.label}</span>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "ui-monospace, monospace",
                        color: h.positive ? "#00FFB2" : "rgba(255,46,76,0.6)",
                      }}
                    >
                      {h.positive ? `+${h.amount}` : "—"}
                    </span>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function wheelHistoryVisual(label: string, multiplier: number) {
  const seg = WHEEL_SEGMENTS.find((s) => s.label === label || (label === "VOID" && s.kind === "x0"));
  const visual = seg ? getWheelSegmentVisual(seg) : getWheelSegmentVisual(WHEEL_SEGMENTS[0]!);
  return visual;
}
