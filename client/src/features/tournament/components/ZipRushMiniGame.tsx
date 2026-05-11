import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const FLEE_DISTANCE_PX = 88;
const MOUSEMOVE_MIN_MS = 45;
const REWARD_TOKENS = 1000;

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function pickPosAwayFromMouse(
  mouseX: number,
  mouseY: number,
  width: number,
  height: number,
): { leftPct: number; topPct: number } {
  const minD = FLEE_DISTANCE_PX;
  for (let i = 0; i < 36; i++) {
    const leftPct = 10 + Math.random() * 68;
    const topPct = 12 + Math.random() * 54;
    const cx = (leftPct / 100) * width;
    const cy = (topPct / 100) * height;
    if (dist(cx, cy, mouseX, mouseY) >= minD) {
      return { leftPct, topPct };
    }
  }
  const corners: [number, number][] = [
    [14, 14],
    [86, 14],
    [14, 86],
    [86, 86],
  ];
  let best = corners[0]!;
  let bestD = -1;
  for (const [lp, tp] of corners) {
    const cx = (lp / 100) * width;
    const cy = (tp / 100) * height;
    const d = dist(cx, cy, mouseX, mouseY);
    if (d > bestD) {
      bestD = d;
      best = [lp, tp];
    }
  }
  return { leftPct: best[0], topPct: best[1] };
}

/** Mini-jeu client-only : le bouton fuit la souris et saute tout seul. */
export function ZipRushMiniGame() {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [pos, setPos] = useState({ leftPct: 35, topPct: 35 });
  const areaRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const lastPointerRef = useRef(0);

  posRef.current = pos;

  const randomPos = useCallback(() => {
    setPos({
      leftPct: 10 + Math.random() * 68,
      topPct: 12 + Math.random() * 54,
    });
  }, []);

  const fleeFromPointer = useCallback((clientX: number, clientY: number) => {
    const el = areaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 32 || h < 32) return;
    const mx = clientX - rect.left;
    const my = clientY - rect.top;
    const p = posRef.current;
    const btnCx = (p.leftPct / 100) * w;
    const btnCy = (p.topPct / 100) * h;
    if (dist(mx, my, btnCx, btnCy) < FLEE_DISTANCE_PX) {
      setPos(pickPosAwayFromMouse(mx, my, w, h));
    }
  }, []);

  useEffect(() => {
    randomPos();
  }, [randomPos]);

  useEffect(() => {
    const id = window.setInterval(() => {
      randomPos();
    }, 2400);
    return () => window.clearInterval(id);
  }, [randomPos]);

  const onAreaPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const now = performance.now();
      if (now - lastPointerRef.current < MOUSEMOVE_MIN_MS) return;
      lastPointerRef.current = now;
      fleeFromPointer(e.clientX, e.clientY);
    },
    [fleeFromPointer],
  );

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-violet-950/30 to-black/30 p-4 text-sm text-white/80">
      <div className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-violet-300/70">
        {t("tournament.zipRush.title")}
      </div>
      <p className="mb-2 text-center text-[11px] text-white/40">
        {t("tournament.zipRush.subtitle")}
      </p>
      <p className="mb-2 text-center text-[11px] font-medium text-amber-200/85">
        {t("tournament.zipRush.reward", { tokens: REWARD_TOKENS.toLocaleString() })}
      </p>
      <div
        ref={areaRef}
        role="presentation"
        className="relative isolate h-[min(14rem,calc(100vw-4rem))] w-full cursor-default touch-manipulation overflow-hidden rounded-lg border border-white/5 bg-black/25"
        onPointerMove={onAreaPointerMove}
      >
        <button
          type="button"
          className="pointer-events-auto absolute z-10 select-none rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition-[left,top,transform] duration-150 ease-out hover:from-violet-400 hover:to-fuchsia-500 active:scale-95"
          style={{
            left: `${pos.leftPct}%`,
            top: `${pos.topPct}%`,
            transform: "translate(-50%, -50%)",
          }}
          onClick={() => {
            setScore((s) => s + 1);
            randomPos();
          }}
        >
          {t("tournament.zipRush.tap")}
        </button>
      </div>
      <div className="mt-3 text-center font-mono text-xs text-white/45">
        {t("tournament.zipRush.score", { score })}
      </div>
    </div>
  );
}
