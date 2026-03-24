import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ChevronDown, Sparkles, X } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { updateUserBalance } from "../utils/userProfile";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || "";

type SlotSymbolId = "cherry" | "lemon" | "bell" | "seven" | "diamond";

type SpinHistoryEntry = { id: string; bet: number; gain: number };

const SYMBOL_EMOJI: Record<SlotSymbolId, string> = {
  cherry: "🍒",
  lemon: "🍋",
  bell: "🔔",
  seven: "7",
  diamond: "💎",
};

export function SlotMachine() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [chips, setChips] = useState<number | null>(null);
  const [minBet, setMinBet] = useState(10);
  const [maxBetCap, setMaxBetCap] = useState(1000);
  const [selectedBet, setSelectedBet] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [displayReels, setDisplayReels] = useState<SlotSymbolId[]>(["cherry", "lemon", "bell"]);
  const [lastResult, setLastResult] = useState<{ winAmount: number; bet: number } | null>(null);
  const [slotTab, setSlotTab] = useState<"play" | "history">("play");
  const [spinHistory, setSpinHistory] = useState<SpinHistoryEntry[]>([]);
  const [autoSpin, setAutoSpin] = useState(false);
  const [autoFloor, setAutoFloor] = useState(0);
  const [autoCeiling, setAutoCeiling] = useState(0);
  const [autoPanelOpen, setAutoPanelOpen] = useState(false);
  const autoSpinRef = useRef(false);

  useEffect(() => {
    autoSpinRef.current = autoSpin;
  }, [autoSpin]);

  const closeHistoryAndReset = () => {
    setSpinHistory([]);
    setSlotTab("play");
  };

  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/lobby");
      return;
    }
    const url = API_BASE ? `${API_BASE}/api/auth/balance` : "/api/auth/balance";
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("balance");
      const data = await res.json();
      const c = typeof data?.chips === "number" ? Math.max(0, Math.floor(data.chips)) : 0;
      updateUserBalance(c);
      setChips(c);
    } catch {
      addToast(t("slot.errorLoadBalance"), "error");
      setChips(0);
    }
  }, [addToast, navigate, t]);

  const loadConfig = useCallback(async () => {
    try {
      const url = API_BASE ? `${API_BASE}/api/slot/config` : "/api/slot/config";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.minBet === "number") setMinBet(Math.max(1, Math.floor(data.minBet)));
      if (typeof data?.maxBet === "number") setMaxBetCap(Math.max(1, Math.floor(data.maxBet)));
    } catch {
      /* defaults */
    }
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadBalance();
  }, [loadConfig, loadBalance]);

  const effectiveMaxBet = useMemo(() => {
    if (chips === null) return maxBetCap;
    return Math.min(maxBetCap, chips);
  }, [chips, maxBetCap]);

  const betPresets = useMemo(() => {
    const m = minBet;
    const cap = effectiveMaxBet;
    const raw = [m, 50, 100, 250, 500, cap].filter((v, i, a) => v >= m && v <= cap && a.indexOf(v) === i);
    return raw.sort((a, b) => a - b);
  }, [minBet, effectiveMaxBet]);

  useEffect(() => {
    if (betPresets.length === 0) return;
    if (!betPresets.includes(selectedBet)) {
      setSelectedBet(betPresets[0]!);
    }
  }, [betPresets, selectedBet]);

  const spin = useCallback(
    async (opts?: { suppressResultToasts?: boolean }) => {
      const token = localStorage.getItem("token");
      if (!token || chips === null || spinning) return;
      if (selectedBet < minBet || selectedBet > effectiveMaxBet) {
        addToast(t("slot.invalidBet"), "error");
        if (autoSpinRef.current) setAutoSpin(false);
        return;
      }

      setSpinning(true);
      setLastResult(null);

      const shuffle = () => {
        const ids: SlotSymbolId[] = ["cherry", "lemon", "bell", "seven", "diamond"];
        setDisplayReels([ids[Math.floor(Math.random() * 5)]!, ids[Math.floor(Math.random() * 5)]!, ids[Math.floor(Math.random() * 5)]!]);
      };
      const interval = window.setInterval(shuffle, 80);

      try {
        const url = API_BASE ? `${API_BASE}/api/slot/spin` : "/api/slot/spin";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bet: selectedBet }),
        });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (!opts?.suppressResultToasts) {
            addToast(typeof data?.error === "string" ? data.error : t("slot.errorSpin"), "error");
          } else {
            addToast(t("slot.autoStoppedError"), "error");
          }
          if (autoSpinRef.current) setAutoSpin(false);
          return;
        }

        const reels = data?.reels as SlotSymbolId[] | undefined;
        const winAmount = typeof data?.winAmount === "number" ? data.winAmount : 0;
        const bet = typeof data?.bet === "number" ? data.bet : selectedBet;
        const nextChips =
          typeof data?.chips === "number" ? Math.max(0, Math.floor(data.chips)) : chips ?? 0;

        if (reels && reels.length === 3) {
          setDisplayReels(reels);
        }

        updateUserBalance(nextChips);
        setChips(nextChips);
        setLastResult({ winAmount, bet });
        setSpinHistory((prev) => [
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, bet, gain: winAmount },
          ...prev,
        ]);

        const net = winAmount - bet;
        if (!opts?.suppressResultToasts) {
          if (net > 0) {
            addToast(t("slot.winMessage", { total: winAmount, bet, net }), "success");
          } else if (net === 0 && winAmount > 0) {
            addToast(t("slot.breakEven", { bet }), "success");
          } else if (net < 0) {
            addToast(t("slot.loseMessage", { bet }), "info");
          }
        }

        const floorAfter = Math.max(0, Math.floor(autoFloor));
        const ceilingAfter = Math.max(0, Math.floor(autoCeiling));
        if (autoSpinRef.current && nextChips <= floorAfter) {
          setAutoSpin(false);
          addToast(t("slot.autoStoppedAtFloor", { floor: floorAfter }), "info");
        } else if (autoSpinRef.current && ceilingAfter > 0 && nextChips >= ceilingAfter) {
          setAutoSpin(false);
          addToast(t("slot.autoStoppedAtCeiling", { ceiling: ceilingAfter }), "info");
        }
      } catch {
        if (!opts?.suppressResultToasts) {
          addToast(t("slot.errorSpin"), "error");
        } else {
          addToast(t("slot.autoStoppedError"), "error");
        }
        if (autoSpinRef.current) setAutoSpin(false);
      } finally {
        window.clearInterval(interval);
        setSpinning(false);
      }
    },
    [addToast, autoCeiling, chips, effectiveMaxBet, minBet, selectedBet, spinning, t, autoFloor],
  );

  useEffect(() => {
    if (slotTab !== "play" && autoSpin) setAutoSpin(false);
  }, [slotTab, autoSpin]);

  useEffect(() => {
    if (!autoSpin || spinning || chips === null || slotTab !== "play") return;
    if (selectedBet < minBet || selectedBet > effectiveMaxBet) {
      setAutoSpin(false);
      return;
    }
    const floor = Math.max(0, Math.floor(autoFloor));
    const ceiling = Math.max(0, Math.floor(autoCeiling));
    if (ceiling > 0 && chips >= ceiling) {
      setAutoSpin(false);
      addToast(t("slot.autoStoppedAtCeiling", { ceiling }), "info");
      return;
    }
    if (chips <= floor) {
      setAutoSpin(false);
      addToast(t("slot.autoStoppedAtFloor", { floor }), "info");
      return;
    }
    if (chips - selectedBet < floor) {
      setAutoSpin(false);
      addToast(t("slot.autoStoppedWouldBreach", { floor }), "info");
      return;
    }
    void spin({ suppressResultToasts: true });
  }, [autoSpin, spinning, chips, autoFloor, autoCeiling, selectedBet, minBet, effectiveMaxBet, slotTab, spin, addToast, t]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070912] p-4 md:p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-fuchsia-600/20 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-amber-500/10 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg">
        <button
          type="button"
          onClick={() => navigate("/lobby")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.backToLobby")}
        </button>

        <div className="rounded-2xl border border-amber-500/30 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2 text-amber-300">
            <Sparkles className="h-6 w-6" />
            <h1 className="text-2xl font-bold text-white">{t("slot.title")}</h1>
          </div>
          <p className="mb-4 text-sm text-slate-400">{t("slot.subtitle")}</p>

          <div className="mb-5 flex rounded-xl border border-white/10 bg-black/40 p-1">
            <button
              type="button"
              onClick={() => setSlotTab("play")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                slotTab === "play" ? "bg-amber-500 text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("slot.tabPlay")}
            </button>
            <button
              type="button"
              onClick={() => setSlotTab("history")}
              className={`flex-1 rounded-lg py-2 text-sm font-bold transition ${
                slotTab === "history" ? "bg-amber-500 text-slate-900 shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t("slot.tabHistory")}
            </button>
          </div>

          {slotTab === "play" ? (
            <>
              <div className="mb-6 flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-3">
                <span className="text-slate-400">{t("slot.balance")}</span>
                <span className="text-lg font-bold text-amber-300">
                  {chips === null ? "—" : chips.toLocaleString()}
                </span>
              </div>

              <div className="mb-6">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{t("slot.selectBet")}</p>
                <div className="flex flex-wrap gap-2">
                  {betPresets.map((b) => (
                    <button
                      key={b}
                      type="button"
                      disabled={spinning || chips === null || b > effectiveMaxBet}
                      onClick={() => setSelectedBet(b)}
                      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
                        selectedBet === b
                          ? "bg-amber-500 text-slate-900"
                          : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                      } disabled:opacity-40`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {t("slot.betRange", { min: minBet, max: effectiveMaxBet })}
                </p>
              </div>

              <div className="mb-6 flex justify-center gap-3">
                {displayReels.map((sym, i) => (
                  <motion.div
                    key={`${sym}-${i}`}
                    className="flex h-24 w-20 items-center justify-center rounded-xl border-2 border-amber-500/40 bg-gradient-to-b from-slate-800 to-slate-900 text-4xl shadow-inner md:h-28 md:w-24 md:text-5xl"
                    animate={spinning ? { y: [0, -4, 0] } : {}}
                    transition={spinning ? { repeat: Infinity, duration: 0.25, delay: i * 0.05 } : {}}
                  >
                    {SYMBOL_EMOJI[sym] ?? "?"}
                  </motion.div>
                ))}
              </div>

              <AnimatePresence>
                {lastResult && !spinning && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`mb-4 text-center text-sm font-semibold ${
                      lastResult.winAmount > lastResult.bet ? "text-green-400" : lastResult.winAmount === lastResult.bet ? "text-amber-300" : "text-slate-400"
                    }`}
                  >
                    {lastResult.winAmount - lastResult.bet > 0
                      ? t("slot.resultWin", {
                          total: lastResult.winAmount,
                          bet: lastResult.bet,
                          net: lastResult.winAmount - lastResult.bet,
                        })
                      : lastResult.winAmount === lastResult.bet && lastResult.winAmount > 0
                        ? t("slot.resultBreakEven", { bet: lastResult.bet })
                        : t("slot.resultLose", { bet: lastResult.bet })}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="button"
                disabled={
                  spinning ||
                  autoSpin ||
                  chips === null ||
                  chips < minBet ||
                  selectedBet > effectiveMaxBet
                }
                onClick={() => void spin()}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-4 text-lg font-bold text-slate-900 shadow-lg transition hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {spinning ? t("slot.spinning") : t("slot.spin")}
              </button>

              <p className="mt-4 text-center text-[11px] leading-relaxed text-slate-500">{t("slot.disclaimer")}</p>

              <div className="mt-5 overflow-hidden rounded-xl border border-fuchsia-500/25 bg-fuchsia-950/15">
                <button
                  type="button"
                  onClick={() => setAutoPanelOpen((o) => !o)}
                  aria-expanded={autoPanelOpen}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-fuchsia-950/30"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-fuchsia-200">{t("slot.autoPanelTitle")}</span>
                    <span className="text-[11px] text-slate-500">
                      {autoPanelOpen ? t("slot.autoPanelTapClose") : t("slot.autoPanelTapOpen")}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {autoSpin ? (
                      <span className="rounded-full bg-fuchsia-600/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fuchsia-100">
                        {t("slot.autoActiveBadge")}
                      </span>
                    ) : null}
                    <ChevronDown
                      className={`h-5 w-5 text-fuchsia-300 transition-transform ${autoPanelOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {autoPanelOpen ? (
                    <motion.div
                      key="auto-panel-body"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.15 }}
                      className="border-t border-fuchsia-500/20"
                    >
                      <div className="space-y-3 px-4 pb-4 pt-2">
                        <label className="flex cursor-pointer items-center gap-3">
                          <input
                            type="checkbox"
                            checked={autoSpin}
                            onChange={(e) => setAutoSpin(e.target.checked)}
                            disabled={chips === null || chips < minBet || selectedBet > effectiveMaxBet}
                            className="h-4 w-4 rounded border-amber-500/50 bg-slate-900 text-amber-500 focus:ring-amber-500"
                          />
                          <span className="text-sm font-semibold text-fuchsia-200">{t("slot.autoToggle")}</span>
                        </label>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="slot-auto-floor" className="text-xs font-medium text-slate-400">
                            {t("slot.autoFloorLabel")}
                          </label>
                          <input
                            id="slot-auto-floor"
                            type="number"
                            min={0}
                            value={autoFloor}
                            onChange={(e) => setAutoFloor(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            disabled={chips === null}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-fuchsia-500/50 focus:outline-none disabled:opacity-40"
                          />
                          <p className="text-[11px] leading-snug text-slate-500">{t("slot.autoFloorHint")}</p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label htmlFor="slot-auto-ceiling" className="text-xs font-medium text-slate-400">
                            {t("slot.autoCeilingLabel")}
                          </label>
                          <input
                            id="slot-auto-ceiling"
                            type="number"
                            min={0}
                            value={autoCeiling}
                            onChange={(e) => setAutoCeiling(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                            disabled={chips === null}
                            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-fuchsia-500/50 focus:outline-none disabled:opacity-40"
                          />
                          <p className="text-[11px] leading-snug text-slate-500">{t("slot.autoCeilingHint")}</p>
                        </div>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-white/10 bg-black/30">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("slot.tabHistory")}</span>
                <button
                  type="button"
                  onClick={closeHistoryAndReset}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                  title={t("slot.closeHistory")}
                >
                  <X className="h-3.5 w-3.5" />
                  {t("slot.closeHistory")}
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto px-3 py-2 font-mono text-sm">
                {spinHistory.length === 0 ? (
                  <p className="py-6 text-center text-slate-500">{t("slot.historyEmpty")}</p>
                ) : (
                  <ul className="space-y-1.5">
                    {spinHistory.map((row) => (
                      <li
                        key={row.id}
                        className="flex justify-between gap-3 border-b border-white/5 pb-1.5 text-slate-200 last:border-0 last:pb-0"
                      >
                        <span className="text-slate-400">{t("slot.historyBet", { bet: row.bet })}</span>
                        <span className={row.gain > 0 ? "text-amber-300" : "text-slate-500"}>
                          {t("slot.historyGain", { gain: row.gain })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
