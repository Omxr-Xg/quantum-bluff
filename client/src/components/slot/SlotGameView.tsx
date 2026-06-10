import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import { ChipIcon } from "../ChipIcon";
import { SoloGameBackButton } from "../minigames/SoloGameBackButton";
import { SlotReel } from "./SlotReel";
import type { SlotReels } from "../../features/slot/slotTypes";
import { SLOT_BET_PRESETS } from "../../features/slot/slotTypes";
import type { SlotWinKind } from "../../features/slot/slotWinLabel";

const PAYTABLE_ROWS: { kind: SlotWinKind; multiplier: number }[] = [
  { kind: "mega_jackpot", multiplier: 200 },
  { kind: "royal_win", multiplier: 50 },
  { kind: "diamond_win", multiplier: 30 },
  { kind: "bells", multiplier: 20 },
  { kind: "cherries", multiplier: 12 },
  { kind: "triple_bar", multiplier: 8 },
  { kind: "three_kind", multiplier: 3 },
  { kind: "pair", multiplier: 1.5 },
];

type HistoryEntry = { label: string; amount: number; positive: boolean };

type SlotGameViewProps = {
  balance: number;
  bet: number;
  maxBet: number;
  spinning: boolean;
  results: SlotReels;
  reelsStopped: number;
  win: { label: string; amount: number } | null;
  history: HistoryEntry[];
  sessionTotalWon: number;
  onBack?: () => void;
  onBetChange: (bet: number) => void;
  onSpin: () => void;
  onReelStop: () => void;
};

export function SlotGameView({
  balance,
  bet,
  maxBet,
  spinning,
  results,
  reelsStopped,
  win,
  history,
  sessionTotalWon,
  onBack,
  onBetChange,
  onSpin,
  onReelStop,
}: SlotGameViewProps) {
  const { t } = useTranslation();
  const isWin4 =
    !spinning &&
    win != null &&
    results[0] === results[1] &&
    results[1] === results[2] &&
    results[2] === results[3];

  const paytableLabel = (kind: SlotWinKind) => t(`slot.paytable.${kind}`);

  return (
    <div
      className="flex min-h-[100dvh] w-full flex-col"
      style={{
        background:
          "radial-gradient(ellipse 120% 80% at 50% 0%, #14080a 0%, #06050a 50%, #020206 100%)",
        fontFamily: "'Roboto Slab', Georgia, serif",
      }}
    >
      {onBack ? (
        <header className="relative z-20 flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-3 py-3 backdrop-blur-md sm:px-5">
          <SoloGameBackButton onClick={onBack} />
        </header>
      ) : null}

      <div className="flex w-full flex-1 flex-col items-center justify-center px-4 py-6 sm:px-4">
      <div className="relative w-full max-w-[560px]">
        <div
          style={{
            background: "linear-gradient(175deg, #1e1608 0%, #100e06 35%, #0a0804 70%, #0d0b06 100%)",
            borderRadius: 24,
            border: "1.5px solid #2e2008",
            boxShadow:
              "0 0 0 1px rgba(212,168,67,0.18), 0 32px 100px rgba(0,0,0,0.9), 0 4px 0 #d4a84340, inset 0 1px 0 rgba(240,192,80,0.25)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: 3,
              background:
                "linear-gradient(90deg, transparent 0%, #7a5010 5%, #d4a843 30%, #f0d060 50%, #d4a843 70%, #7a5010 95%, transparent 100%)",
            }}
          />

          <div
            style={{
              padding: "28px 32px 22px",
              borderBottom: "1px solid rgba(212,168,67,0.12)",
              background: "linear-gradient(180deg, #140e04 0%, #0a0804 100%)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 16,
                width: 40,
                height: 40,
                borderTop: "1px solid rgba(212,168,67,0.3)",
                borderLeft: "1px solid rgba(212,168,67,0.3)",
                borderRadius: "4px 0 0 0",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 16,
                width: 40,
                height: 40,
                borderTop: "1px solid rgba(212,168,67,0.3)",
                borderRight: "1px solid rgba(212,168,67,0.3)",
                borderRadius: "0 4px 0 0",
              }}
            />

            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.55em",
                color: "#7a6030",
                marginBottom: 6,
                fontWeight: 700,
              }}
            >
              {t("slot.casinoRoyale")}
            </div>
            <div
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "0.08em",
                lineHeight: 1,
                background: "linear-gradient(180deg, #f8e888 0%, #d4a843 45%, #8a5c10 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {t("slot.grandFortune")}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 20, justifyContent: "center" }}>
              <div
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: "#020205",
                  border: "1px solid rgba(212,168,67,0.2)",
                  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.7)",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 8, letterSpacing: "0.35em", color: "#6a5820", marginBottom: 4 }}>
                  {t("slot.balance")}
                </div>
                <motion.div
                  key={balance}
                  initial={{ color: "#f0c060" }}
                  animate={{ color: "#e8d9b0" }}
                  transition={{ duration: 0.4 }}
                  className="flex items-center gap-2"
                  style={{ fontFamily: "ui-monospace, monospace", fontSize: 22, letterSpacing: "0.04em" }}
                >
                  <span>{balance.toLocaleString()}</span>
                  <ChipIcon size="sm" />
                </motion.div>
              </div>
              <div
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: 8,
                  background: "#020205",
                  border: "1px solid rgba(212,168,67,0.2)",
                  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.7)",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 8, letterSpacing: "0.35em", color: "#6a5820", marginBottom: 4 }}>
                  {t("slot.lastWin")}
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={win?.amount ?? "none"}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1.5"
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 22,
                      color: win ? "#f0c060" : "#1e1a0a",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {win ? (
                      <>
                        <span>+{win.amount.toLocaleString()}</span>
                        <ChipIcon size="sm" />
                      </>
                    ) : (
                      "———"
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div style={{ padding: "20px 24px" }}>
            <div
              style={{
                background: "#010106",
                borderRadius: 12,
                border: "1.5px solid #1e1606",
                boxShadow: "inset 0 6px 30px rgba(0,0,0,0.95), 0 0 0 1px rgba(212,168,67,0.1)",
                padding: "10px 12px",
                position: "relative",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 12,
                  pointerEvents: "none",
                  zIndex: 5,
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.06) 3px, rgba(0,0,0,0.06) 4px)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, rgba(212,168,67,0.6) 15%, rgba(212,168,67,0.6) 85%, transparent)",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              />

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  position: "relative",
                  zIndex: 2,
                }}
              >
                {([0, 1, 2, 3] as const).map((i) => (
                  <div key={i} style={{ position: "relative" }}>
                    {i > 0 ? (
                      <div
                        style={{
                          position: "absolute",
                          left: -4,
                          top: 8,
                          bottom: 8,
                          width: 1,
                          background: "rgba(212,168,67,0.15)",
                        }}
                      />
                    ) : null}
                    <div
                      style={{
                        background: "linear-gradient(180deg, #030308 0%, #050510 50%, #030308 100%)",
                        borderRadius: 6,
                        overflow: "hidden",
                        boxShadow: "inset 2px 0 8px rgba(0,0,0,0.6), inset -2px 0 8px rgba(0,0,0,0.6)",
                      }}
                    >
                      <SlotReel
                        target={results[i]}
                        spinning={spinning && reelsStopped < 4}
                        delay={i}
                        onStop={onReelStop}
                        lit={isWin4}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <AnimatePresence>
                {win && !spinning ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.85, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 350, damping: 22 }}
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 30,
                      pointerEvents: "none",
                    }}
                  >
                    <div
                      style={{
                        background: "linear-gradient(135deg, #1e1400 0%, #120e00 100%)",
                        border: "1.5px solid #d4a843",
                        borderRadius: 10,
                        padding: "12px 32px",
                        textAlign: "center",
                        boxShadow: "0 0 50px rgba(212,168,67,0.4), inset 0 0 20px rgba(212,168,67,0.08)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.4em",
                          color: "#d4a843",
                          marginBottom: 4,
                        }}
                      >
                        {win.label}
                      </div>
                      <div
                        className="flex items-center justify-center gap-2"
                        style={{
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 30,
                          color: "#f0d060",
                          fontWeight: 500,
                        }}
                      >
                        <span>+{win.amount.toLocaleString()}</span>
                        <ChipIcon size="sm" />
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div style={{ padding: "0 24px 28px", borderTop: "1px solid rgba(212,168,67,0.08)" }}>
            <div style={{ marginTop: 20, marginBottom: 14 }}>
              <div
                style={{
                  fontSize: 8,
                  letterSpacing: "0.35em",
                  color: "#5a4820",
                  marginBottom: 8,
                  textAlign: "center",
                }}
              >
                {t("slot.selectBet")}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:flex-nowrap sm:gap-2">
                {SLOT_BET_PRESETS.map((preset) => {
                  const active = bet === preset;
                  const disabled = spinning || balance < preset || preset > maxBet;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onBetChange(Math.min(maxBet, preset))}
                      disabled={disabled}
                      style={{
                        flex: 1,
                        minWidth: "3rem",
                        padding: "7px 0",
                        borderRadius: 6,
                        background: active
                          ? "linear-gradient(180deg, #2e1e06 0%, #1a1004 100%)"
                          : "transparent",
                        border: active ? "1px solid #d4a843" : "1px solid rgba(212,168,67,0.15)",
                        color: active ? "#d4a843" : "#4a3a18",
                        fontSize: 11,
                        fontFamily: "ui-monospace, monospace",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.35 : 1,
                        letterSpacing: "0.03em",
                      }}
                    >
                      {preset === 500 ? t("minigames.betPresetMax") : preset}
                    </button>
                  );
                })}
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.975 }}
              onClick={onSpin}
              disabled={spinning || balance < bet}
              style={{
                width: "100%",
                padding: "18px 0",
                borderRadius: 10,
                border: "1px solid",
                borderColor: spinning || balance < bet ? "rgba(212,168,67,0.12)" : "#e8c050",
                background:
                  spinning || balance < bet
                    ? "linear-gradient(180deg, #1a1408 0%, #100e06 100%)"
                    : "linear-gradient(180deg, #c89828 0%, #a07818 40%, #c89828 100%)",
                boxShadow:
                  spinning || balance < bet
                    ? "none"
                    : "0 6px 24px rgba(200,152,40,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.3)",
                cursor: spinning || balance < bet ? "not-allowed" : "pointer",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {!spinning && balance >= bet ? (
                <motion.div
                  animate={{ x: ["-120%", "220%"] }}
                  transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "40%",
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
                    pointerEvents: "none",
                  }}
                />
              ) : null}
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.3em",
                  color: spinning || balance < bet ? "#3a2e10" : "#07070e",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                {spinning ? t("slot.spinning").toUpperCase() : t("slot.spin").toUpperCase()}
              </div>
            </motion.button>
          </div>

          <div
            style={{
              background: "#040408",
              borderTop: "1px solid rgba(212,168,67,0.1)",
              padding: "14px 24px 20px",
            }}
          >
            <div
              style={{
                fontSize: 8,
                letterSpacing: "0.4em",
                color: "#4a3a18",
                marginBottom: 10,
                textAlign: "center",
              }}
            >
              {t("slot.paytableFourReels")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "5px 20px" }}>
              {PAYTABLE_ROWS.map((row) => (
                <div
                  key={row.kind}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "3px 0",
                    borderBottom: "1px solid rgba(212,168,67,0.06)",
                  }}
                >
                  <span style={{ fontSize: 9, letterSpacing: "0.12em", color: "#6a5828" }}>
                    {paytableLabel(row.kind)}
                  </span>
                  <span
                    style={{
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 10,
                      color: row.multiplier >= 50 ? "#f0d060" : row.multiplier >= 20 ? "#d4a843" : "#6a5828",
                    }}
                  >
                    ×{row.multiplier}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              height: 3,
              background:
                "linear-gradient(90deg, transparent 0%, #7a5010 5%, #d4a843 30%, #f0d060 50%, #d4a843 70%, #7a5010 95%, transparent 100%)",
            }}
          />
        </div>

        {history.length > 0 ? (
          <div className="mt-3.5 flex flex-wrap justify-center gap-2">
            {history.map((h, i) => (
              <motion.div
                key={`${h.label}-${i}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1 - i * 0.15, y: 0 }}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  background: "#08080f",
                  border: `1px solid ${h.positive ? "rgba(212,168,67,0.25)" : "rgba(120,40,40,0.25)"}`,
                  fontSize: 10,
                  fontFamily: "ui-monospace, monospace",
                  color: h.positive ? "#c89828" : "#5a2a2a",
                  letterSpacing: "0.04em",
                }}
              >
                {h.amount > 0 ? `+${h.amount}` : h.amount}
              </motion.div>
            ))}
          </div>
        ) : null}

        {sessionTotalWon > 0 ? (
          <div className="mt-2.5 text-center">
            <span style={{ fontSize: 9, letterSpacing: "0.3em", color: "#5a4820" }}>
              {t("slot.sessionTotal")}{" "}
            </span>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#a07828" }}>
              +{sessionTotalWon.toLocaleString()}
            </span>
          </div>
        ) : null}

      </div>
      </div>
    </div>
  );
}
