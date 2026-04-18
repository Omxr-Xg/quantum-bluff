import { X, TrendingUp, BarChart2, Target, Award, GripVertical } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuantumHUD } from "../contexts/QuantumHUDContext";

const STORAGE_KEY = "quantumHUD.position";
const DEFAULT_PANEL_W = 320;

function defaultPosition(): { left: number; top: number } {
  if (typeof window === "undefined") return { left: 16, top: 96 };
  const w = window.innerWidth;
  const h = window.innerHeight;
  const panelW = Math.min(DEFAULT_PANEL_W, w - 16);
  const left = Math.max(8, w - panelW - 20);
  const top = Math.max(72, Math.min(96, h * 0.12));
  return { left, top };
}

function loadStoredPosition(): { left: number; top: number } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { left?: number; top?: number };
    if (typeof p.left === "number" && typeof p.top === "number") {
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
}

export function QuantumHUD({
  isOpen,
  onToggle,
  onPanelPointerEnter,
  onPanelPointerLeave,
}: QuantumHUDProps) {
  const { t } = useTranslation();
  const { probabilities, currentHand, winProbability } = useQuantumHUD();
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(() => {
    if (typeof window === "undefined") return { left: 16, top: 96 };
    return loadStoredPosition() ?? defaultPosition();
  });
  const posRef = useRef(pos);
  posRef.current = pos;
  const dragRef = useRef({ active: false, dx: 0, dy: 0 });

  const clampPos = useCallback((left: number, top: number) => {
    const el = panelRef.current;
    const w = el?.offsetWidth ?? Math.min(DEFAULT_PANEL_W, window.innerWidth - 16);
    const h = el?.offsetHeight ?? 400;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const m = 8;
    // Reserve space for the relative PlayerDashboard at the bottom on desktop
    const dashH = vw >= 768 ? 96 : 0;
    return {
      left: Math.min(Math.max(m, left), vw - w - m),
      top: Math.min(Math.max(m, top), (vh - dashH) - h - m),
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

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const { left, top } = posRef.current;
    dragRef.current = { active: true, dx: e.clientX - left, dy: e.clientY - top };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const left = e.clientX - dragRef.current.dx;
    const top = e.clientY - dragRef.current.dy;
    setPos(clampPos(left, top));
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const left = e.clientX - dragRef.current.dx;
    const top = e.clientY - dragRef.current.dy;
    const next = clampPos(left, top);
    setPos(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
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
          className="fixed z-[55] w-auto max-w-[calc(100vw-1rem)] md:w-80 md:max-w-none bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-purple-500 shadow-2xl flex flex-col max-h-[calc(100vh-10rem)]"
          onMouseEnter={onPanelPointerEnter}
          onMouseLeave={onPanelPointerLeave}
        >
          <div
            className="p-4 border-b border-slate-700 flex items-center justify-between cursor-grab active:cursor-grabbing select-none touch-none"
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 pointer-events-none">
              <GripVertical className="w-4 h-4 text-slate-500 shrink-0" aria-hidden />
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white font-bold truncate">{t("quantumHUD.title")}</h3>
            </div>
            <button
              type="button"
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded pointer-events-auto shrink-0"
              aria-label={t("settings.close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-slate-700">
            <div className="text-gray-400 text-sm mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              {t("quantumHUD.winChance")}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-4 bg-slate-700 rounded-full overflow-hidden">
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
              <span className={`font-bold ${getProbabilityColor(winProbability)}`}>
                {Math.round(winProbability * 100)}%
              </span>
            </div>
          </div>

          {currentHand && (
            <div className="px-4 py-2 bg-purple-900/20 border-b border-purple-500/30">
              <div className="text-xs text-purple-400 mb-1">{t("quantumHUD.currentHand")}</div>
              <div className="text-white font-bold flex items-center gap-2">
                <span className="text-2xl">🎴</span>
                <span>{currentHand ? t(`quantumHUD.hand.${currentHand}`) : "—"}</span>
              </div>
            </div>
          )}

          <div className="p-4 overflow-y-auto flex-1 min-h-0">
            <div className="text-gray-400 text-sm mb-3 flex items-center gap-2">
              <BarChart2 className="w-4 h-4" />
              {t("quantumHUD.probabilityEvolution")}
            </div>

            <div className="space-y-2">
              {probabilities.map((item, index) => (
                <div
                  key={`${item.handKey}-${index}`}
                  className="bg-slate-700/50 rounded-lg p-3 border border-slate-600"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white font-medium text-sm">{t(`quantumHUD.hand.${item.handKey}`)}</span>
                    <span
                      className={`text-xs font-bold ${getProbabilityColor(item.probability)}`}
                    >
                      {Math.round(item.probability * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
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
                  <div className="mt-1 text-gray-500 text-xs">
                    {item.descriptionType === "acquired"
                      ? t("quantumHUD.acquired")
                      : t("quantumHUD.chancePercent", { percent: item.probPercent ?? 0 })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-slate-800/50 rounded-b-2xl border-t border-slate-700">
            <div className="flex items-center gap-2 text-yellow-400 text-xs">
              <Award className="w-3 h-3" />
              <span>{t("quantumHUD.realtimeUpdate")}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
