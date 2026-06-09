import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { GripVertical, ScrollText, X } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";

export interface HandActionLogEntry {
  id: string;
  line: string;
}

interface HandActionLogPanelProps {
  entries: HandActionLogEntry[];
  collapseWhen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  titleKey?: string;
  emptyKey?: string;
}

const PANEL_W = 288;
const EDGE = 12;
const TOP_NAV_CLEARANCE = 88;

function defaultPosition(): { left: number; top: number } {
  if (typeof window === "undefined") return { left: 900, top: 180 };
  const w = Math.min(PANEL_W, window.innerWidth - EDGE * 2);
  return {
    left: Math.max(EDGE, window.innerWidth - w - EDGE),
    top: Math.max(TOP_NAV_CLEARANCE, Math.round(window.innerHeight * 0.34)),
  };
}

export function HandActionLogPanel({
  entries,
  collapseWhen,
  open: controlledOpen,
  onOpenChange,
  titleKey = "game.actionLogTitle",
  emptyKey = "game.actionLogEmpty",
}: HandActionLogPanelProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const [pos, setPos] = useState(defaultPosition);
  const posRef = useRef(pos);
  const dragRef = useRef({ dx: 0, dy: 0 });
  posRef.current = pos;

  useEffect(() => {
    if (collapseWhen) setOpen(false);
  }, [collapseWhen, setOpen]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  const clampPos = useCallback((left: number, top: number) => {
    if (typeof window === "undefined") return { left, top };
    const el = panelRef.current;
    const w = el?.offsetWidth ?? Math.min(PANEL_W, window.innerWidth - EDGE * 2);
    const h = el?.offsetHeight ?? 260;
    const minTop = window.innerWidth >= 768 ? TOP_NAV_CLEARANCE : EDGE;
    return {
      left: Math.min(Math.max(EDGE, left), window.innerWidth - w - EDGE),
      top: Math.min(Math.max(minTop, top), window.innerHeight - h - EDGE),
    };
  }, []);

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.left, p.top));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampPos]);

  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => setPos((p) => clampPos(p.left, p.top)));
    return () => cancelAnimationFrame(id);
  }, [open, clampPos]);

  const onHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragRef.current = {
      dx: e.clientX - posRef.current.left,
      dy: e.clientY - posRef.current.top,
    };

    const onMove = (ev: PointerEvent) => {
      setPos(clampPos(ev.clientX - dragRef.current.dx, ev.clientY - dragRef.current.dy));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [clampPos]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      style={isMobile ? undefined : { left: pos.left, top: pos.top }}
      className={`pointer-events-auto fixed z-[115] overflow-hidden rounded-xl border border-slate-600/60 bg-slate-900/94 shadow-2xl backdrop-blur-md ${
        isMobile
          ? "bottom-[215px] right-2 w-[min(17rem,calc(100vw-1rem))]"
          : "w-[min(18rem,calc(100vw-1.5rem))]"
      }`}
    >
      <div
        className={`flex w-full cursor-grab touch-none select-none items-center justify-between border-b border-slate-600/40 font-semibold uppercase tracking-wide text-slate-200 active:cursor-grabbing ${
          isMobile ? "gap-1.5 px-2 py-1.5 text-[10px]" : "gap-2 px-3 py-2 text-xs"
        }`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="inline-flex min-w-0 items-center gap-2 pointer-events-none">
          <GripVertical className="h-4 w-4 shrink-0 text-amber-300/70" aria-hidden />
          <ScrollText className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
          <span className="truncate">{t(titleKey)}</span>
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label={t("settings.close")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div
        ref={listRef}
        className={`overflow-y-auto ${isMobile ? "max-h-24 px-2 py-1.5" : "max-h-44 px-3 py-2"}`}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {entries.length === 0 ? (
          <p className="py-2 text-center text-[11px] text-slate-500">
            {t(emptyKey)}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {entries.map((e) => (
              <li
                key={e.id}
                className={`border-b border-white/[0.06] leading-snug text-slate-100 last:border-0 last:pb-0 ${
                  isMobile ? "pb-1 text-[10px]" : "pb-1.5 text-[11px]"
                }`}
              >
                {e.line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
