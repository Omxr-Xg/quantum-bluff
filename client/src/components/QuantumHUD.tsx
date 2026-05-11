import { X, TrendingUp, BarChart2, Target, Award, GripVertical, Spade } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuantumHUD } from "../contexts/QuantumHUDContext";

const STORAGE_KEY = "quantumHUD.position";
const LAYOUT_REV = 2;
/** Largeur cible (px) — panneau compact, repositionnable par glisser l’en-tête */
const DEFAULT_PANEL_W = 260;
const EDGE_MARGIN = 12;

function defaultPosition(): { left: number; top: number } {
  if (typeof window === "undefined") return { left: 400, top: 160 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const panelW = Math.min(DEFAULT_PANEL_W, vw - EDGE_MARGIN * 2);
  const dashH = vw >= 768 ? 96 : 0;
  /** Hauteur estimée (proche du max-h du panneau) pour centrer verticalement au premier affichage */
  const estH = Math.min(420, Math.max(260, Math.round(vh * 0.42)));
  const left = Math.max(EDGE_MARGIN, vw - panelW - EDGE_MARGIN);
  const top = Math.max(
    EDGE_MARGIN,
    Math.round((vh - dashH - estH) / 2),
  );
  return { left, top };
}

function loadStoredPosition(): { left: number; top: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left?: number; top?: number; rev?: number };
    if (typeof p.left === "number" && typeof p.top === "number") {
      if (p.rev !== LAYOUT_REV) return null;
      return { left: p.left, top: p.top };
    }
  } catch {
    /* ignore */
  }
  return null;
}

interface QuantumHUDProps {
  isOpen: boolean;
  onToggle: () => void;
  onPanelPointerEnter?: () => void;
  onPanelPointerLeave?: () => void;
  /** Pendant le glisser-déposer : évite que le parent ferme le panneau (ex. onMouseLeave). */
  onDragSessionChange?: (active: boolean) => void;
}

export function QuantumHUD({
  isOpen,
  onToggle,
  onPanelPointerEnter,
  onPanelPointerLeave,
  onDragSessionChange,
}: QuantumHUDProps) {
  const { t } = useTranslation();
  const { probabilities, currentHand, winProbability } = useQuantumHUD();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { left: 400, top: 160 };
    return loadStoredPosition() ?? defaultPosition();
  });
  const posRef = useRef(pos);
  posRef.current = pos;
  const dragRef = useRef({ dx: 0, dy: 0 });
  const windowDragListenersRef = useRef<{
    move: (e: PointerEvent) => void;
    up: (e: PointerEvent) => void;
  } | null>(null);

  const clampPos = useCallback((left: number, top: number) => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? Math.min(DEFAULT_PANEL_W, window.innerWidth - 16);
    const h = el?.offsetHeight ?? 400;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // Reserve space for the relative PlayerDashboard at the bottom on desktop
    const dashH = vw >= 768 ? 96 : 0;
    return {
      left: Math.min(Math.max(EDGE_MARGIN, left), vw - w - EDGE_MARGIN),
      top: Math.min(Math.max(EDGE_MARGIN, top), (vh - dashH) - h - EDGE_MARGIN),
    };
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.left, p.top));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPos]);

  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => setPos((p) => clampPos(p.left, p.top)));
    return () => cancelAnimationFrame(id);
  }, [isOpen, clampPos]);

  const getProbabilityColor = (prob: number) => {
    if (prob >= 0.7) return "text-green-400";
    if (prob >= 0.4) return "text-yellow-400";
    if (prob >= 0.2) return "text-orange-400";
    return "text-red-400";
  };

  const removeWindowDragListenersOnly = useCallback(() => {
    const pair = windowDragListenersRef.current;
    if (pair) {
      window.removeEventListener("pointermove", pair.move);
      window.removeEventListener("pointerup", pair.up);
      window.removeEventListener("pointercancel", pair.up);
      windowDragListenersRef.current = null;
    }
  }, []);

  const endWindowDragSession = useCallback(() => {
    removeWindowDragListenersOnly();
    onDragSessionChange?.(false);
  }, [removeWindowDragListenersOnly, onDragSessionChange]);

  useEffect(() => {
    return () => removeWindowDragListenersOnly();
  }, [removeWindowDragListenersOnly]);

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    removeWindowDragListenersOnly();
    const { left, top } = posRef.current;
    dragRef.current = { dx: e.clientX - left, dy: e.clientY - top };
    onDragSessionChange?.(true);

    const onMove = (ev: PointerEvent) => {
      setPos(clampPos(ev.clientX - dragRef.current.dx, ev.clientY - dragRef.current.dy));
    };
    const onUp = (ev: PointerEvent) => {
      const next = clampPos(ev.clientX - dragRef.current.dx, ev.clientY - dragRef.current.dy);
      setPos(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, rev: LAYOUT_REV }));
      } catch {
        /* ignore */
      }
      endWindowDragSession();
    };
    windowDragListenersRef.current = { move: onMove, up: onUp };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={t("quantumHUD.title")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ left: pos.left, top: pos.top }}
          className="fixed z-[55] w-[min(calc(100vw-1rem),260px)] max-w-[calc(100vw-1rem)] bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-xl border-2 border-purple-500 shadow-2xl flex flex-col max-h-[min(420px,calc(100vh-6rem))] md:max-h-[min(480px,calc(100vh-7rem))]"
          onMouseEnter={onPanelPointerEnter}
          onMouseLeave={onPanelPointerLeave}
        >
          <div
            className="p-2.5 border-b border-slate-700 flex items-center justify-between cursor-grab active:cursor-grabbing select-none touch-none"
            title={t("quantumHUD.dragHint")}
            onPointerDown={handleHeaderPointerDown}
          >
            <div className="flex items-center gap-1.5 min-w-0 flex-1 pointer-events-none">
              <GripVertical className="w-4 h-4 text-purple-400/80 shrink-0" aria-hidden />
              <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                <TrendingUp className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-white font-bold truncate text-sm leading-tight">{t("quantumHUD.title")}</h3>
                <p className="text-[10px] text-slate-500 truncate hidden sm:block">{t("quantumHUD.dragHintShort")}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded pointer-events-auto shrink-0"
              aria-label={t("settings.close")}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-2.5 border-b border-slate-700">
            <div className="text-gray-400 text-xs mb-1.5 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              {t("quantumHUD.winChance")}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${winProbability * 100}%` }}
                  className="h-full"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(74,222,128,1) 0%, rgba(250,204,21,1) 50%, rgba(248,113,113,1) 100%)",
                  }}
                />
              </div>
              <span className={`text-sm font-bold tabular-nums shrink-0 ${getProbabilityColor(winProbability)}`}>
                {Math.round(winProbability * 100)}%
              </span>
            </div>
          </div>

          {currentHand && (
            <div className="px-2.5 py-1.5 bg-purple-900/20 border-b border-purple-500/30">
              <div className="text-[10px] text-purple-400 mb-0.5 uppercase tracking-wide">{t("quantumHUD.currentHand")}</div>
              <div className="text-white font-semibold flex items-center gap-1.5 text-sm">
                <Spade className="h-4 w-4 shrink-0 text-purple-300/90" aria-hidden strokeWidth={2} />
                <span className="truncate">{currentHand ? t(`quantumHUD.hand.${currentHand}`) : "—"}</span>
              </div>
            </div>
          )}

          <div className="p-2.5 overflow-y-auto flex-1 min-h-0">
            <div className="text-gray-400 text-xs mb-2 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 shrink-0" />
              {t("quantumHUD.probabilityEvolution")}
            </div>

            <div className="space-y-1.5">
              {probabilities.map((item, index) => (
                <div
                  key={`${item.handKey}-${index}`}
                  className="bg-slate-700/50 rounded-lg p-2 border border-slate-600"
                >
                  <div className="flex justify-between items-center gap-1 mb-0.5">
                    <span className="text-white font-medium text-xs truncate">{t(`quantumHUD.hand.${item.handKey}`)}</span>
                    <span
                      className={`text-[11px] font-bold tabular-nums shrink-0 ${getProbabilityColor(item.probability)}`}
                    >
                      {Math.round(item.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${item.probability * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(74,222,128,0.8) 0%, rgba(250,204,21,0.8) 50%, rgba(248,113,113,0.8) 100%)",
                      }}
                    />
                  </div>
                  <div className="mt-0.5 text-gray-500 text-[10px] leading-snug">
                    {item.descriptionType === "acquired"
                      ? t("quantumHUD.acquired")
                      : t("quantumHUD.chancePercent", { percent: item.probPercent ?? 0 })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-2 bg-slate-800/50 rounded-b-xl border-t border-slate-700">
            <div className="flex items-center gap-1.5 text-yellow-400/90 text-[10px]">
              <Award className="w-3 h-3 shrink-0" />
              <span>{t("quantumHUD.realtimeUpdate")}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
