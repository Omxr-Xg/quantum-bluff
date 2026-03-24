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
    <div className="relative flex min-h-0 w-full max-w-[100%] flex-1 flex-col overflow-hidden bg-[#0c0a12]">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 75% 45% at 50% 0%, rgba(185, 28, 28, 0.32), transparent 50%), radial-gradient(ellipse 55% 35% at 50% 100%, rgba(234, 179, 8, 0.1), transparent 48%), repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-gradient-to-t from-black/60 via-transparent to-black/40" />

      <div
        className="relative z-10 mx-auto flex w-full min-w-0 max-w-md flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain px-3 pb-4 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-4 md:pb-5"
        style={{ maxHeight: "100%" }}
      >
        <button
          type="button"
          onClick={() => navigate("/lobby")}
          className="mb-2 inline-flex max-w-full shrink-0 items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-xs font-medium text-zinc-300 shadow-lg backdrop-blur-sm transition hover:border-amber-500/40 hover:text-white md:mb-3 md:px-4 md:py-2 md:text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("nav.backToLobby")}
        </button>

        {/* Boîtier type cabine de casino */}
        <div
          className="min-w-0 shrink-0 rounded-[1.35rem] p-[4px] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.35)] md:rounded-[2rem] md:p-[5px]"
          style={{
            background: "linear-gradient(145deg, #d4d4d8 0%, #71717a 22%, #a1a1aa 45%, #52525b 70%, #3f3f46 100%)",
          }}
        >
          <div className="rounded-[1.2rem] border border-black/50 bg-gradient-to-b from-[#5c0a0a] via-[#3d0508] to-[#1a0305] p-3 shadow-[inset_0_2px_24px_rgba(0,0,0,0.65)] md:rounded-[1.75rem] md:p-5">
            {/* Enseigne + lampes */}
            <div className="relative mb-3 overflow-hidden rounded-lg border border-amber-600/40 bg-gradient-to-b from-[#2a0505] to-black px-2 py-2 shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_0_20px_rgba(234,179,8,0.15)] md:mb-4 md:rounded-xl md:px-3 md:py-3">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
              <div className="mb-2 flex justify-center gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`h-2 w-2 rounded-full shadow-[0_0_8px_currentColor] ${
                      spinning ? "animate-pulse text-amber-300" : "text-amber-700/80"
                    }`}
                    style={{
                      background: spinning ? "#fcd34d" : "#78350f",
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-5 w-5 shrink-0 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                <h1 className="min-w-0 bg-gradient-to-b from-amber-200 via-yellow-300 to-amber-600 bg-clip-text text-center text-sm font-black uppercase leading-tight tracking-[0.12em] text-transparent drop-shadow-sm [text-shadow:0_0_30px_rgba(251,191,36,0.4)] md:text-xl md:tracking-[0.2em]">
                  {t("slot.title")}
                </h1>
              </div>
              <p className="mt-1.5 text-center text-[10px] font-medium uppercase tracking-wider text-amber-200/50">
                {t("slot.subtitle")}
              </p>
            </div>

            {/* Onglets style bandeau métal */}
            <div className="mb-3 flex rounded-lg border border-zinc-700/80 bg-gradient-to-b from-zinc-700 to-zinc-900 p-1 shadow-inner md:mb-4">
              <button
                type="button"
                onClick={() => setSlotTab("play")}
                className={`flex-1 rounded-md py-2 text-xs font-black uppercase tracking-wider transition md:text-sm ${
                  slotTab === "play"
                    ? "bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_2px_0_#78350f,inset_0_1px_0_rgba(255,255,255,0.4)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t("slot.tabPlay")}
              </button>
              <button
                type="button"
                onClick={() => setSlotTab("history")}
                className={`flex-1 rounded-md py-2 text-xs font-black uppercase tracking-wider transition md:text-sm ${
                  slotTab === "history"
                    ? "bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_2px_0_#78350f,inset_0_1px_0_rgba(255,255,255,0.4)]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t("slot.tabHistory")}
              </button>
            </div>

            {slotTab === "play" ? (
              <>
                {/* Crédits type afficheur LED */}
                <div className="mb-3 rounded-lg border-2 border-zinc-600 bg-[#0a1608] px-3 py-2 shadow-[inset_0_3px_12px_rgba(0,0,0,0.9)] md:mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-800/90">
                      {t("slot.balance")}
                    </span>
                    <span
                      className="min-w-0 shrink font-mono text-lg font-bold tabular-nums tracking-wide text-emerald-400 md:text-2xl md:tracking-widest"
                      style={{ textShadow: "0 0 12px rgba(52, 211, 153, 0.45)" }}
                    >
                      {chips === null ? "———" : chips.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Mise — boutons type touches */}
                <div className="mb-3 md:mb-4">
                  <p className="mb-1.5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600/90 md:mb-2">
                    {t("slot.selectBet")}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {betPresets.map((b) => (
                      <button
                        key={b}
                        type="button"
                        disabled={spinning || chips === null || b > effectiveMaxBet}
                        onClick={() => setSelectedBet(b)}
                        className={`min-w-[3rem] rounded-lg border-2 px-3 py-2 text-sm font-black tabular-nums transition active:translate-y-0.5 disabled:opacity-40 ${
                          selectedBet === b
                            ? "border-amber-300 bg-gradient-to-b from-amber-400 to-amber-600 text-black shadow-[0_3px_0_#78350f,inset_0_1px_0_rgba(255,255,255,0.35)]"
                            : "border-zinc-600 bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-200 shadow-[0_2px_0_#171717,inset_0_1px_0_rgba(255,255,255,0.08)] hover:border-zinc-500"
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-center text-[10px] text-zinc-500">
                    {t("slot.betRange", { min: minBet, max: effectiveMaxBet })}
                  </p>
                </div>

                {/* Vitrine rouleaux */}
                <div className="relative mb-3 rounded-lg border-[3px] border-zinc-500 bg-black p-2 shadow-[inset_0_8px_32px_rgba(0,0,0,0.95),0_4px_0_rgba(0,0,0,0.5)] md:mb-4 md:rounded-xl md:border-4 md:p-3">
                  <div className="absolute inset-x-3 top-2 z-10 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                  <div className="flex items-stretch justify-center gap-0">
                    {displayReels.map((sym, i) => (
                      <div key={`reel-${i}`} className="relative flex flex-1 justify-center px-0.5">
                        {i > 0 ? (
                          <div className="absolute -left-px top-2 bottom-2 w-px bg-gradient-to-b from-transparent via-zinc-600 to-transparent" />
                        ) : null}
                        <div className="relative w-full max-w-[5.5rem]">
                          <motion.div
                            className="relative flex aspect-[3/4] max-h-[5.5rem] items-center justify-center overflow-hidden rounded-md border border-zinc-700 bg-gradient-to-b from-[#1c1917] via-black to-[#0c0a09] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] sm:max-h-28 md:max-h-32"
                            animate={spinning ? { y: [0, -3, 0] } : {}}
                            transition={spinning ? { repeat: Infinity, duration: 0.22, delay: i * 0.06 } : {}}
                          >
                            <span className="relative z-10 text-3xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] filter sm:text-4xl md:text-5xl">
                              {SYMBOL_EMOJI[sym] ?? "?"}
                            </span>
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/40" />
                          </motion.div>
                          {/* Ligne de gain */}
                          <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-20 -translate-y-1/2 border-y-2 border-amber-400/90 shadow-[0_0_12px_rgba(251,191,36,0.5)]" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-x-3 bottom-2 z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>

                <AnimatePresence>
                  {lastResult && !spinning && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="mb-4 rounded-lg border border-amber-500/30 bg-black/50 px-3 py-2 text-center"
                    >
                      <p
                        className={`text-xs font-bold uppercase tracking-wide md:text-sm ${
                          lastResult.winAmount > lastResult.bet
                            ? "text-emerald-400"
                            : lastResult.winAmount === lastResult.bet
                              ? "text-amber-300"
                              : "text-zinc-400"
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
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gros bouton SPIN */}
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
                  className="group relative mx-auto mb-2 flex w-full max-w-[min(280px,100%)] items-center justify-center rounded-full border-[3px] border-[#7f1d1d] bg-gradient-to-b from-red-500 via-red-600 to-red-800 py-3.5 text-base font-black uppercase tracking-[0.12em] text-white shadow-[0_5px_0_#450a0a,0_8px_20px_rgba(0,0,0,0.5),inset_0_2px_0_rgba(255,255,255,0.25)] transition enabled:active:translate-y-1 enabled:active:shadow-[0_2px_0_#450a0a] disabled:cursor-not-allowed disabled:opacity-45 md:mb-3 md:border-4 md:py-5 md:text-xl md:tracking-[0.15em]"
                >
                  <span className="absolute inset-x-6 top-1 h-px rounded-full bg-white/35" />
                  {spinning ? t("slot.spinning") : t("slot.spin")}
                </button>

                <p className="mb-4 text-center text-[10px] leading-relaxed text-zinc-500">{t("slot.disclaimer")}</p>

                {/* Panneau technique auto */}
                <div className="overflow-hidden rounded-lg border border-zinc-700 bg-gradient-to-b from-zinc-900/90 to-black/80 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setAutoPanelOpen((o) => !o)}
                    aria-expanded={autoPanelOpen}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-white/5"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500/90">
                        {t("slot.autoPanelTitle")}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {autoPanelOpen ? t("slot.autoPanelTapClose") : t("slot.autoPanelTapOpen")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      {autoSpin ? (
                        <span className="rounded border border-emerald-600/50 bg-emerald-950/80 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-400">
                          {t("slot.autoActiveBadge")}
                        </span>
                      ) : null}
                      <ChevronDown
                        className={`h-4 w-4 text-zinc-400 transition-transform ${autoPanelOpen ? "rotate-180" : ""}`}
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
                        className="border-t border-zinc-700"
                      >
                        <div className="space-y-3 px-3 pb-3 pt-2">
                          <label className="flex cursor-pointer items-center gap-3">
                            <input
                              type="checkbox"
                              checked={autoSpin}
                              onChange={(e) => setAutoSpin(e.target.checked)}
                              disabled={chips === null || chips < minBet || selectedBet > effectiveMaxBet}
                              className="h-4 w-4 rounded border-zinc-500 bg-zinc-900 text-amber-500"
                            />
                            <span className="text-xs font-semibold text-zinc-300">{t("slot.autoToggle")}</span>
                          </label>
                          <div className="flex flex-col gap-1">
                            <label htmlFor="slot-auto-floor" className="text-[10px] font-bold uppercase text-zinc-500">
                              {t("slot.autoFloorLabel")}
                            </label>
                            <input
                              id="slot-auto-floor"
                              type="number"
                              min={0}
                              value={autoFloor}
                              onChange={(e) => setAutoFloor(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                              disabled={chips === null}
                              className="rounded border border-zinc-600 bg-black/60 px-2 py-1.5 text-sm text-white focus:border-amber-600/50 focus:outline-none disabled:opacity-40"
                            />
                            <p className="text-[10px] text-zinc-500">{t("slot.autoFloorHint")}</p>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label htmlFor="slot-auto-ceiling" className="text-[10px] font-bold uppercase text-zinc-500">
                              {t("slot.autoCeilingLabel")}
                            </label>
                            <input
                              id="slot-auto-ceiling"
                              type="number"
                              min={0}
                              value={autoCeiling}
                              onChange={(e) => setAutoCeiling(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                              disabled={chips === null}
                              className="rounded border border-zinc-600 bg-black/60 px-2 py-1.5 text-sm text-white focus:border-amber-600/50 focus:outline-none disabled:opacity-40"
                            />
                            <p className="text-[10px] text-zinc-500">{t("slot.autoCeilingHint")}</p>
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="rounded-lg border-2 border-zinc-600 bg-black/40 shadow-inner">
                <div className="flex items-center justify-between border-b border-zinc-700 bg-zinc-900/50 px-3 py-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-600/90">
                    {t("slot.tabHistory")}
                  </span>
                  <button
                    type="button"
                    onClick={closeHistoryAndReset}
                    className="inline-flex items-center gap-1 rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-[10px] font-bold uppercase text-zinc-300 transition hover:bg-zinc-700 hover:text-white"
                    title={t("slot.closeHistory")}
                  >
                    <X className="h-3 w-3" />
                    {t("slot.closeHistory")}
                  </button>
                </div>
                <div className="max-h-52 overflow-y-auto px-3 py-2 font-mono text-xs text-zinc-300 md:text-sm">
                  {spinHistory.length === 0 ? (
                    <p className="py-8 text-center text-zinc-600">{t("slot.historyEmpty")}</p>
                  ) : (
                    <ul className="space-y-2">
                      {spinHistory.map((row) => (
                        <li
                          key={row.id}
                          className="flex justify-between gap-3 border-b border-zinc-800 pb-2 last:border-0 last:pb-0"
                        >
                          <span className="text-zinc-500">{t("slot.historyBet", { bet: row.bet })}</span>
                          <span className={row.gain > 0 ? "font-bold text-amber-400" : "text-zinc-600"}>
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
    </div>
  );
}
