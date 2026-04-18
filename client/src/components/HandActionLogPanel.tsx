import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp, ScrollText } from "lucide-react";
import { useDeviceType } from "./ui/use-mobile";

export interface HandActionLogEntry {
  id: string;
  line: string;
}

interface HandActionLogPanelProps {
  entries: HandActionLogEntry[];
  collapseWhen?: boolean;
}

export function HandActionLogPanel({ entries, collapseWhen }: HandActionLogPanelProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  useEffect(() => {
    if (collapseWhen) setOpen(false);
  }, [collapseWhen]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  // Sur mobile : panel plus petit, collé au-dessus du PlayerDashboard (~130px)
  // Sur desktop : comportement original
  return (
    <div
      className={`pointer-events-auto fixed z-[115] rounded-xl border border-slate-600/50 bg-slate-900/92 shadow-lg backdrop-blur-sm ${
        isMobile
          ? "bottom-[145px] right-2 w-[min(14rem,calc(50vw-1rem))]"
          : "bottom-36 right-4 w-[min(18rem,calc(100vw-1.5rem))]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-t-xl border-b border-slate-600/40 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-800/80"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <ScrollText className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
          {t("game.actionLogTitle")}
        </span>
        {open
          ? <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          : <ChevronUp   className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>
      {open && (
        <div
          ref={listRef}
          className={`overflow-y-auto px-3 py-2 ${isMobile ? "max-h-28" : "max-h-44"}`}
          role="log"
          aria-live="polite"
          aria-relevant="additions"
        >
          {entries.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-slate-500">
              {t("game.actionLogEmpty")}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="border-b border-white/[0.06] pb-1.5 text-[11px] leading-snug text-slate-100 last:border-0 last:pb-0"
                >
                  {e.line}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
