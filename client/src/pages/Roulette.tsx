import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation, type TFunction } from "react-i18next";
import { motion, useMotionValue, animate, type MotionValue } from "motion/react";
import { ArrowLeft, Trash2, Undo2 } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { updateUserBalance, fetchBalanceFromServer } from "../utils/userProfile";
import {
  mergeGamificationFromServerResponse,
  readGamification,
  refreshGamificationFromServer,
} from "../utils/gamificationStorage";

import { apiUrl } from "../utils/apiBase";
import { ChipIcon } from "../components/ChipIcon";
import logoSrc from "../assets/logo-personnel.png";

type RouletteChipToken = {
  value: number;
  labelKey: "white" | "red" | "blue" | "green" | "black" | "purple";
  face: string;
  rim: string;
  logoClass: string;
};

/** Valeurs + disques colorés : même identité que les jetons QM (logo), couleurs type casino. */
const ROULETTE_CHIP_TOKENS: readonly RouletteChipToken[] = [
  {
    value: 10,
    labelKey: "white",
    face: "bg-white shadow-[inset_0_2px_6px_rgba(255,255,255,0.95),inset_0_-3px_8px_rgba(15,23,42,0.08)]",
    rim: "border-[3px] border-slate-200/90 ring-1 ring-black/10",
    logoClass: "brightness-[0.9] saturate-[1.05]",
  },
  {
    value: 25,
    labelKey: "red",
    face: "bg-gradient-to-br from-rose-500 to-red-900 shadow-[inset_0_2px_5px_rgba(255,255,255,0.2)]",
    rim: "border-[3px] border-rose-200/90",
    logoClass: "brightness-110",
  },
  {
    value: 50,
    labelKey: "blue",
    face: "bg-gradient-to-br from-sky-500 to-blue-900 shadow-[inset_0_2px_5px_rgba(255,255,255,0.18)]",
    rim: "border-[3px] border-sky-200/90",
    logoClass: "brightness-110",
  },
  {
    value: 100,
    labelKey: "green",
    face: "bg-gradient-to-br from-emerald-500 to-emerald-950 shadow-[inset_0_2px_5px_rgba(255,255,255,0.18)]",
    rim: "border-[3px] border-emerald-200/90",
    logoClass: "brightness-110",
  },
  {
    value: 250,
    labelKey: "black",
    face: "bg-gradient-to-br from-zinc-700 to-zinc-950 shadow-[inset_0_2px_4px_rgba(255,255,255,0.12)]",
    rim: "border-[3px] border-amber-400/95",
    logoClass: "brightness-125",
  },
  {
    value: 500,
    labelKey: "purple",
    face: "bg-gradient-to-br from-fuchsia-600 to-violet-950 shadow-[inset_0_2px_5px_rgba(255,255,255,0.15)]",
    rim: "border-[3px] border-fuchsia-200/90",
    logoClass: "brightness-110",
  },
];

/** Jeton plateau (sélecteur) : cercle coloré + logo (la valeur est sous le bouton). Rayons : r_logo = 0,95 × r_jeton (−5 %). */
function RouletteTrayChip({ tok }: { tok: RouletteChipToken }) {
  return (
    <span
      className={`relative flex h-12 w-12 items-center justify-center rounded-full sm:h-14 sm:w-14 ${tok.face} ${tok.rim} shadow-lg ring-2 ring-black/25`}
    >
      <img
        src={logoSrc}
        alt=""
        className={`pointer-events-none h-[95%] w-[95%] object-contain ${tok.logoClass}`}
        draggable={false}
        aria-hidden
      />
    </span>
  );
}

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function isRed(n: number): boolean {
  return n >= 1 && n <= 36 && RED_NUMBERS.has(n);
}

function buildStreetBases(): number[] {
  return Array.from({ length: 12 }, (_, i) => 1 + i * 3);
}

function buildSixLineBases(): number[] {
  return Array.from({ length: 11 }, (_, i) => 1 + i * 3).filter((b) => b <= 31);
}

function buildCornerDefs(): { label: string; n1: number; n2: number; n3: number; n4: number }[] {
  const out: { label: string; n1: number; n2: number; n3: number; n4: number }[] = [];
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 2; col++) {
      const a = 1 + row * 3 + col;
      const nums = [a, a + 1, a + 3, a + 4].sort((x, y) => x - y);
      out.push({
        label: `${nums[0]}-${nums[3]}`,
        n1: nums[0]!,
        n2: nums[1]!,
        n3: nums[2]!,
        n4: nums[3]!,
      });
    }
  }
  return out;
}

function buildSplitPairs(): { a: number; b: number; label: string }[] {
  const add = (a: number, b: number, pairs: { a: number; b: number; label: string }[]) => {
    const x = Math.min(a, b);
    const y = Math.max(a, b);
    pairs.push({ a: x, b: y, label: `${x}-${y}` });
  };
  const pairs: { a: number; b: number; label: string }[] = [];
  add(0, 1, pairs);
  add(0, 2, pairs);
  add(0, 3, pairs);
  for (let row = 0; row < 12; row++) {
    const b = 1 + row * 3;
    add(b, b + 1, pairs);
    add(b + 1, b + 2, pairs);
  }
  for (let row = 0; row < 11; row++) {
    for (let col = 0; col < 3; col++) {
      const n = 1 + row * 3 + col;
      add(n, n + 3, pairs);
    }
  }
  return pairs;
}

type BetKey =
  | `s:${number}`
  | `sp:${number}-${number}`
  | `st:${number}`
  | `c:${string}`
  | `6:${number}`
  | `d:${1 | 2 | 3}`
  | `col:${1 | 2 | 3}`
  | "red"
  | "black"
  | "even"
  | "odd"
  | "low"
  | "high";

type ApiBet = Record<string, unknown>;

function keyToApiBet(key: BetKey, amount: number): ApiBet | null {
  if (key.startsWith("s:")) {
    const n = Number(key.slice(2));
    return { type: "straight", n, amount };
  }
  if (key.startsWith("sp:")) {
    const [a, b] = key.slice(3).split("-").map(Number);
    return { type: "split", a, b, amount };
  }
  if (key.startsWith("st:")) {
    const base = Number(key.slice(3));
    return { type: "street", base, amount };
  }
  if (key.startsWith("c:")) {
    const parts = key.slice(2).split(",").map(Number);
    if (parts.length !== 4) return null;
    return { type: "corner", n1: parts[0], n2: parts[1], n3: parts[2], n4: parts[3], amount };
  }
  if (key.startsWith("6:")) {
    const base = Number(key.slice(2));
    return { type: "sixLine", base, amount };
  }
  if (key.startsWith("d:")) {
    const which = Number(key.slice(2)) as 1 | 2 | 3;
    return { type: "dozen", which, amount };
  }
  if (key.startsWith("col:")) {
    const which = Number(key.slice(4)) as 1 | 2 | 3;
    return { type: "column", which, amount };
  }
  if (key === "red" || key === "black" || key === "even" || key === "odd" || key === "low" || key === "high") {
    return { type: key, amount };
  }
  return null;
}

function cornerKey(n1: number, n2: number, n3: number, n4: number): BetKey {
  const s = [n1, n2, n3, n4].sort((a, b) => a - b).join(",");
  return `c:${s}` as BetKey;
}

const ROULETTE_HISTORY_SESSION_KEY = "qb_roulette_spin_history_v1";
const MAX_SPIN_HISTORY = 40;

type SpinHistoryLine = { label: string; stake: number; payout: number; mult: number };

type SpinHistoryEntry = {
  id: string;
  spinIndex: number;
  at: number;
  result: number;
  resultColorKey: "green" | "red" | "black";
  totalStake: number;
  totalPayout: number;
  net: number;
  lines: SpinHistoryLine[];
};

function describeRouletteApiBet(bet: Record<string, unknown>, tr: TFunction): string {
  const type = bet.type;
  if (type === "straight" && typeof bet.n === "number") {
    return tr("roulette.betDescr.straight", { n: bet.n });
  }
  if (type === "split" && typeof bet.a === "number" && typeof bet.b === "number") {
    return tr("roulette.betDescr.split", { a: bet.a, b: bet.b });
  }
  if (type === "street" && typeof bet.base === "number") {
    const b = bet.base;
    return tr("roulette.betDescr.street", { base: b, end: b + 2 });
  }
  if (type === "sixLine" && typeof bet.base === "number") {
    const b = bet.base;
    return tr("roulette.betDescr.sixLine", { base: b, end: b + 5 });
  }
  if (
    type === "corner" &&
    typeof bet.n1 === "number" &&
    typeof bet.n2 === "number" &&
    typeof bet.n3 === "number" &&
    typeof bet.n4 === "number"
  ) {
    const nums = [bet.n1, bet.n2, bet.n3, bet.n4].sort((a, b) => a - b).join("-");
    return tr("roulette.betDescr.corner", { nums });
  }
  if (type === "dozen" && bet.which === 1) return tr("roulette.dozen1");
  if (type === "dozen" && bet.which === 2) return tr("roulette.dozen2");
  if (type === "dozen" && bet.which === 3) return tr("roulette.dozen3");
  if (type === "column" && bet.which === 1) return tr("roulette.col1");
  if (type === "column" && bet.which === 2) return tr("roulette.col2");
  if (type === "column" && bet.which === 3) return tr("roulette.col3");
  if (type === "red") return tr("roulette.red");
  if (type === "black") return tr("roulette.black");
  if (type === "even") return tr("roulette.even");
  if (type === "odd") return tr("roulette.odd");
  if (type === "low") return tr("roulette.low");
  if (type === "high") return tr("roulette.high");
  return String(type ?? "?");
}

function parseSpinHistoryFromStorage(): { counter: number; entries: SpinHistoryEntry[] } {
  try {
    const raw = sessionStorage.getItem(ROULETTE_HISTORY_SESSION_KEY);
    if (!raw) return { counter: 0, entries: [] };
    const p = JSON.parse(raw) as { counter?: unknown; entries?: unknown };
    const counter = typeof p.counter === "number" && Number.isFinite(p.counter) ? Math.floor(p.counter) : 0;
    const entries: SpinHistoryEntry[] = [];
    if (Array.isArray(p.entries)) {
      for (const e of p.entries) {
        if (!e || typeof e !== "object") continue;
        const o = e as Record<string, unknown>;
        if (typeof o.id !== "string" || typeof o.spinIndex !== "number") continue;
        entries.push({
          id: o.id,
          spinIndex: o.spinIndex,
          at: typeof o.at === "number" ? o.at : 0,
          result: typeof o.result === "number" ? o.result : 0,
          resultColorKey:
            o.resultColorKey === "red" || o.resultColorKey === "black" || o.resultColorKey === "green"
              ? o.resultColorKey
              : "green",
          totalStake: typeof o.totalStake === "number" ? o.totalStake : 0,
          totalPayout: typeof o.totalPayout === "number" ? o.totalPayout : 0,
          net: typeof o.net === "number" ? o.net : 0,
          lines: Array.isArray(o.lines) ? (o.lines as SpinHistoryLine[]) : [],
        });
      }
    }
    return { counter, entries: entries.slice(0, MAX_SPIN_HISTORY) };
  } catch {
    return { counter: 0, entries: [] };
  }
}

function parseBetsResolvedForHistory(raw: unknown, tr: TFunction): SpinHistoryLine[] {
  if (!Array.isArray(raw)) return [];
  const out: SpinHistoryLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const bet = r.bet;
    if (!bet || typeof bet !== "object") continue;
    const stake = typeof r.stake === "number" ? r.stake : 0;
    const payout = typeof r.payout === "number" ? r.payout : 0;
    const label = describeRouletteApiBet(bet as Record<string, unknown>, tr);
    const mult = stake > 0 && payout > 0 ? Math.round(payout / stake) : 0;
    out.push({ label, stake, payout, mult });
  }
  return out;
}

const DEFAULT_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

function mod360(x: number): number {
  let m = x % 360;
  if (m < 0) m += 360;
  return m;
}

/**
 * Angle cible (deg, même convention que `motion` / CSS rotate sur la roue SVG).
 * Aligne le centre du segment d’index `segmentIndex` sous le repère du haut,
 * en conservant plusieurs tours complets pour l’animation.
 */
function computeRouletteTargetRotation(
  currentRotation: number,
  segmentIndex: number,
  segmentCount: number,
  fullTurns: number
): number {
  const stepDeg = 360 / segmentCount;
  // RouletteWheelSvg : centre du segment i à (i+0.5)*step - 90°, repère haut = -90°
  const targetRemainder = mod360(-(segmentIndex + 0.5) * stepDeg);
  const currentRem = mod360(currentRotation);
  let delta = targetRemainder - currentRem;
  if (delta > 0) delta -= 360;
  return currentRotation + delta - fullTurns * 360;
}

/** Affiche pile de jetons + montant sur une case du tapis. */
function PlacedChipsBadge({
  amount,
  layout = "cell",
}: {
  amount: number;
  layout?: "cell" | "corner" | "thin";
}) {
  if (amount <= 0) return null;
  const label = amount > 9999 ? "9999+" : String(amount);
  const pill =
    layout === "thin" ? (
      <span className="max-w-[2.1rem] truncate rounded-full border border-amber-100 bg-gradient-to-b from-amber-200 to-amber-600 px-0.5 text-center font-black leading-tight text-amber-950 shadow tabular-nums [font-size:6px] sm:[font-size:7px]">
        {label}
      </span>
    ) : layout === "corner" ? (
      <span className="rounded-full border-2 border-amber-50 bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 px-1 py-0.5 text-[8px] font-black tabular-nums text-amber-950 shadow-md sm:text-[9px]">
        {label}
      </span>
    ) : (
      <span className="rounded-full border-2 border-amber-50 bg-gradient-to-b from-amber-100 via-amber-400 to-amber-700 px-1 py-0.5 text-[8px] font-black tabular-nums text-amber-950 shadow-lg sm:text-[10px]">
        {label}
      </span>
    );

  if (layout === "thin") {
    return (
      <span className="pointer-events-none absolute left-1/2 top-1/2 z-[2] -translate-x-1/2 -translate-y-1/2" aria-hidden>
        {pill}
      </span>
    );
  }

  if (layout === "corner") {
    return (
      <span className="pointer-events-none absolute bottom-0.5 right-0.5 z-[2] flex flex-col items-end" aria-hidden>
        {pill}
      </span>
    );
  }

  return (
      <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex justify-center pb-0.5" aria-hidden>
      <span className="relative inline-flex items-end justify-center pt-3">
        <span className="absolute bottom-1 left-1/2 flex h-3.5 w-3.5 -translate-x-[72%] items-center justify-center rounded-full border-2 border-amber-950/70 bg-white shadow-md sm:h-4 sm:w-4">
          <img src={logoSrc} alt="" className="h-[95%] w-[95%] object-contain brightness-90" draggable={false} />
        </span>
        <span className="absolute bottom-1.5 left-1/2 flex h-3.5 w-3.5 -translate-x-[28%] items-center justify-center rounded-full border-2 border-amber-950/70 bg-gradient-to-br from-rose-500 to-red-900 shadow-md sm:h-4 sm:w-4">
          <img src={logoSrc} alt="" className="h-[95%] w-[95%] object-contain brightness-110" draggable={false} />
        </span>
        <span className="relative z-[1]">{pill}</span>
      </span>
    </span>
  );
}

function RouletteWheelSvg({ wheelOrder, rotation }: { wheelOrder: number[]; rotation: MotionValue<number> }) {
  const uid = useId().replace(/:/g, "");
  const n = wheelOrder.length;
  const step = 360 / n;
  const rIn = 23;
  const rOut = 44;
  const { segments, dividers } = useMemo(() => {
    const segs: {
      d: string;
      fill: string;
      num: number;
      tx: number;
      ty: number;
      rot: number;
      key: string;
    }[] = [];
    const divs: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    for (let i = 0; i < wheelOrder.length; i++) {
      const num = wheelOrder[i]!;
      const startDeg = i * step - 90;
      const endDeg = (i + 1) * step - 90;
      const a0 = (startDeg * Math.PI) / 180;
      const a1 = (endDeg * Math.PI) / 180;
      const large = step > 180 ? 1 : 0;
      const x0i = 50 + rIn * Math.cos(a0);
      const y0i = 50 + rIn * Math.sin(a0);
      const x0o = 50 + rOut * Math.cos(a0);
      const y0o = 50 + rOut * Math.sin(a0);
      const x1o = 50 + rOut * Math.cos(a1);
      const y1o = 50 + rOut * Math.sin(a1);
      const x1i = 50 + rIn * Math.cos(a1);
      const y1i = 50 + rIn * Math.sin(a1);
      const d = `M ${x0i} ${y0i} L ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`;
      let fill = "#262626";
      if (num === 0) fill = "#14532d";
      else if (isRed(num)) fill = "#9f1239";
      const mid = ((i + 0.5) * step - 90) * (Math.PI / 180);
      const tm = (rIn + rOut) / 2;
      const tx = 50 + tm * Math.cos(mid);
      const ty = 50 + tm * Math.sin(mid);
      const rot = (i + 0.5) * step;
      segs.push({ d, fill, num, tx, ty, rot, key: `${i}-${num}` });
      divs.push({
        x1: 50 + rIn * Math.cos(a1),
        y1: 50 + rIn * Math.sin(a1),
        x2: 50 + rOut * Math.cos(a1),
        y2: 50 + rOut * Math.sin(a1),
        key: `d-${i}`,
      });
    }
    return { segments: segs, dividers: divs };
  }, [wheelOrder, step, n]);

  const gidWood = `rw-wood-${uid}`;
  const gidGold = `rw-gold-${uid}`;
  const gidCone = `rw-cone-${uid}`;

  return (
    <div className="relative mx-auto w-[min(100%,380px)] aspect-square">
      {/* Indicateur fixe type « flipper » */}
      <div className="pointer-events-none absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1 flex-col items-center">
        <div
          className="h-0 w-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-[#f5e6b8] drop-shadow-[0_3px_6px_rgba(0,0,0,0.85)]"
          style={{ filter: "drop-shadow(0 0 4px rgba(212,175,55,0.8))" }}
          aria-hidden
        />
        <div className="-mt-px h-2 w-4 rounded-b-sm bg-gradient-to-b from-amber-200 to-amber-700 shadow-md" />
      </div>

      {/* Cuvette fixe (bois + laiton) */}
      <div
        className="absolute inset-[6px] rounded-full p-[9px] shadow-[0_24px_48px_rgba(0,0,0,0.75),inset_0_2px_8px_rgba(255,255,255,0.06)] ring-1 ring-black/60"
        style={{
          background: "linear-gradient(145deg, #4a3220 0%, #2a1810 40%, #1a0f0a 100%)",
        }}
      >
        <div className="h-full w-full rounded-full p-[3px] bg-gradient-to-b from-[#e8d48a]/25 via-transparent to-black/40">
          <div className="h-full w-full rounded-full border-2 border-[#b8860b]/90 shadow-[inset_0_0_12px_rgba(0,0,0,0.5)]">
            <div className="relative h-full w-full overflow-hidden rounded-full bg-[#0c0a09] shadow-[inset_0_4px_20px_rgba(0,0,0,0.95)]">
              {/* Anneau statique sombre = piste à bille */}
              <div
                className="pointer-events-none absolute inset-[5%] rounded-full border border-[#2a2520]/90"
                style={{
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.15)",
                }}
              />
              <motion.div className="h-full w-full rounded-full" style={{ rotate: rotation }}>
                <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
                  <defs>
                    <radialGradient id={gidWood} cx="45%" cy="40%" r="65%">
                      <stop offset="0%" stopColor="#3f2e1f" />
                      <stop offset="100%" stopColor="#0f0c0b" />
                    </radialGradient>
                    <linearGradient id={gidGold} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#faf8f0" />
                      <stop offset="35%" stopColor="#d4af37" />
                      <stop offset="70%" stopColor="#8b6914" />
                      <stop offset="100%" stopColor="#5c4a1a" />
                    </linearGradient>
                    <radialGradient id={gidCone} cx="40%" cy="35%" r="55%">
                      <stop offset="0%" stopColor="#fefce8" />
                      <stop offset="40%" stopColor="#ca8a04" />
                      <stop offset="100%" stopColor="#422006" />
                    </radialGradient>
                    <filter id={`rw-shadow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodOpacity="0.5" />
                    </filter>
                  </defs>
                  <circle cx="50" cy="50" r="49.5" fill={`url(#${gidWood})`} />
                  {segments.map((seg) => (
                    <g key={seg.key} filter={`url(#rw-shadow-${uid})`}>
                      <path d={seg.d} fill={seg.fill} stroke="rgba(0,0,0,0.45)" strokeWidth={0.12} />
                      <g transform={`translate(${seg.tx},${seg.ty}) rotate(${seg.rot})`}>
                        <text
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#fafaf9"
                          style={{
                            fontSize: seg.num > 9 ? 3.6 : 4.1,
                            fontFamily: "Georgia, 'Times New Roman', serif",
                            fontWeight: 700,
                            paintOrder: "stroke",
                            stroke: "rgba(0,0,0,0.55)",
                            strokeWidth: 0.25,
                          }}
                        >
                          {seg.num}
                        </text>
                      </g>
                    </g>
                  ))}
                  {dividers.map((ln) => (
                    <line
                      key={ln.key}
                      x1={ln.x1}
                      y1={ln.y1}
                      x2={ln.x2}
                      y2={ln.y2}
                      stroke={`url(#${gidGold})`}
                      strokeWidth={0.35}
                      opacity={0.92}
                    />
                  ))}
                  {/* Toupie centrale */}
                  <circle cx="50" cy="50" r={rIn - 0.5} fill={`url(#${gidCone})`} stroke={`url(#${gidGold})`} strokeWidth={0.5} />
                  <ellipse cx="46" cy="44" rx="6" ry="4" fill="rgba(255,255,255,0.2)" opacity={0.7} transform="rotate(-25 50 50)" />
                  <circle cx="50" cy="50" r={rIn - 2.5} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={0.2} />
                </svg>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type RouletteProps = {
  /** Dans `/minigames`, le retour mène au lobby (onglet mini-jeux) au lieu du lobby seul. */
  backToMinigamesHub?: boolean;
  onBackToMinigamesHub?: () => void;
};

export function Roulette({ backToMinigamesHub = false, onBackToMinigamesHub }: RouletteProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleBack = () => {
    if (backToMinigamesHub && onBackToMinigamesHub) {
      onBackToMinigamesHub();
    } else {
      navigate("/lobby");
    }
  };
  const { addToast } = useToast();
  const [chips, setChips] = useState<number | null>(null);
  const [minBet, setMinBet] = useState(10);
  const [maxBetPerLine, setMaxBetPerLine] = useState(1000);
  const [maxTotalStake, setMaxTotalStake] = useState(5000);
  const [wheelOrder, setWheelOrder] = useState<number[]>(DEFAULT_WHEEL);
  /** Somme des jetons tapés avant de poser sur le tapis. */
  const [pendingStake, setPendingStake] = useState(0);
  const [bets, setBets] = useState<Map<BetKey, number>>(() => new Map());
  const [_betHistory, setBetHistory] = useState<{ key: BetKey; amt: number }[]>([]);
  const betsRef = useRef(bets);
  betsRef.current = bets;
  const historyInitRef = useRef(parseSpinHistoryFromStorage());
  const [spinHistory, setSpinHistory] = useState<SpinHistoryEntry[]>(() => historyInitRef.current.entries);
  const spinCounterRef = useRef(historyInitRef.current.counter);
  const [trayTab, setTrayTab] = useState<"chips" | "history">("chips");
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [lastColor, setLastColor] = useState<string | null>(null);
  const wheelSectionRef = useRef<HTMLDivElement>(null);
  const rotation = useMotionValue(0);
  const streetBases = useMemo(() => buildStreetBases(), []);
  const sixBases = useMemo(() => buildSixLineBases(), []);
  const corners = useMemo(() => buildCornerDefs(), []);
  const splits = useMemo(() => buildSplitPairs(), []);

  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/lobby");
      return;
    }
    try {
      const c = await fetchBalanceFromServer({ authoritative: true });
      if (!localStorage.getItem("token")) {
        navigate("/lobby");
        return;
      }
      setChips(c);
    } catch {
      addToast(t("roulette.errorLoadBalance"), "error");
      setChips(0);
    }
  }, [addToast, navigate, t]);

  const loadConfig = useCallback(async () => {
    try {
      const url = apiUrl("/api/roulette/config");
      const res = await fetch(url);
      let lineCap = 1000;
      let totalCap = 5000;
      if (res.ok) {
        const data = await res.json();
        if (typeof data?.minBet === "number") setMinBet(Math.max(1, Math.floor(data.minBet)));
        if (typeof data?.maxBetPerLine === "number") lineCap = Math.max(1, Math.floor(data.maxBetPerLine));
        if (typeof data?.maxTotalStake === "number") totalCap = Math.max(1, Math.floor(data.maxTotalStake));
        if (Array.isArray(data?.wheelOrder) && data.wheelOrder.length > 0) {
          setWheelOrder(data.wheelOrder.map((x: unknown) => Number(x)).filter((n: number) => !Number.isNaN(n)));
        }
      }
      await refreshGamificationFromServer();
      const g = readGamification();
      if (typeof g.maxBetRouletteLine === "number") {
        lineCap = Math.min(lineCap, g.maxBetRouletteLine);
      }
      if (typeof g.maxRouletteTotalStake === "number") {
        totalCap = Math.min(totalCap, g.maxRouletteTotalStake);
      }
      setMaxBetPerLine(lineCap);
      setMaxTotalStake(totalCap);
    } catch {
      /* defaults */
    }
  }, []);

  useEffect(() => {
    void loadConfig();
    void loadBalance();
  }, [loadConfig, loadBalance]);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        ROULETTE_HISTORY_SESSION_KEY,
        JSON.stringify({ counter: spinCounterRef.current, entries: spinHistory })
      );
    } catch {
      /* session storage indisponible */
    }
  }, [spinHistory]);

  const totalStake = useMemo(() => {
    let s = 0;
    for (const v of bets.values()) s += v;
    return s;
  }, [bets]);

  const addToKey = useCallback(
    (key: BetKey, stake: number) => {
      if (chips === null || spinning) return;
      const s = Math.floor(stake);
      if (s <= 0) {
        addToast(t("roulette.addChipsFirst"), "error");
        return;
      }
      const prev = betsRef.current;
      const cur = prev.get(key) ?? 0;
      const nextLine = cur + s;
      if (nextLine > maxBetPerLine) {
        addToast(t("roulette.betCapLine"), "error");
        return;
      }
      let prevTotal = 0;
      for (const v of prev.values()) prevTotal += v;
      const nextTotal = prevTotal - cur + nextLine;
      if (nextTotal > maxTotalStake) {
        addToast(t("roulette.betCapTotal"), "error");
        return;
      }
      if (nextTotal > chips) {
        addToast(t("roulette.insufficient"), "error");
        return;
      }
      const m = new Map(prev);
      m.set(key, nextLine);
      setBets(m);
      setBetHistory((h) => [...h, { key, amt: s }]);
      setPendingStake(0);
    },
    [chips, maxBetPerLine, maxTotalStake, spinning, addToast, t]
  );

  const clearBets = () => {
    setBets(new Map());
    setBetHistory([]);
    setPendingStake(0);
  };

  const undoLast = () => {
    if (spinning) return;
    setBetHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1]!;
      setBets((prev) => {
        const m = new Map(prev);
        const cur = (m.get(last.key) ?? 0) - last.amt;
        if (cur <= 0) m.delete(last.key);
        else m.set(last.key, cur);
        return m;
      });
      return h.slice(0, -1);
    });
  };

  const betsPayload = useCallback((): ApiBet[] => {
    const out: ApiBet[] = [];
    for (const [k, amount] of bets.entries()) {
      const b = keyToApiBet(k, amount);
      if (b) out.push(b);
    }
    return out;
  }, [bets]);

  const spin = async () => {
    const token = localStorage.getItem("token");
    if (!token || chips === null || spinning) return;
    if (bets.size === 0) {
      addToast(t("roulette.noBets"), "error");
      return;
    }
    const body = betsPayload();
    if (body.length === 0) return;

    setSpinning(true);

    const actionId = crypto.randomUUID();
    const roundId = actionId;
    const url = apiUrl("/api/roulette/spin");
    const maxAttempts = 3;
    let data: Record<string, unknown> | null = null;

    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ bets: body, actionId, roundId }),
          });
          const parsed = (await res.json().catch(() => ({}))) as Record<string, unknown>;

          if (res.ok) {
            data = parsed;
            break;
          }

          if (parsed?.code === "IDEMPOTENCY_PAYLOAD_MISMATCH") {
            addToast(
              typeof parsed?.error === "string" ? parsed.error : t("roulette.errorSpin"),
              "error"
            );
            return;
          }

          const retriable =
            res.status >= 500 ||
            res.status === 408 ||
            (res.status === 409 && parsed?.code === "DUPLICATE_ACTION");

          if (retriable && attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
            continue;
          }

          addToast(
            typeof parsed?.error === "string" ? parsed.error : t("roulette.errorSpin"),
            "error"
          );
          return;
        } catch {
          if (attempt < maxAttempts - 1) {
            await new Promise((r) => setTimeout(r, 350 * (attempt + 1)));
            continue;
          }
          addToast(t("roulette.errorSpin"), "error");
          return;
        }
      }

      if (!data) {
        addToast(t("roulette.errorSpin"), "error");
        return;
      }

      requestAnimationFrame(() => {
        wheelSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
          inline: "nearest",
        });
      });

      const result =
        typeof data.result === "number" && Number.isFinite(data.result)
          ? Math.min(36, Math.max(0, Math.trunc(data.result)))
          : 0;
      const nextChips = typeof data.chips === "number" ? Math.max(0, Math.floor(data.chips)) : chips;
      updateUserBalance(nextChips);
      setChips(nextChips);
      mergeGamificationFromServerResponse(data);

      const landingNumber = result;
      let segmentIndex = wheelOrder.indexOf(landingNumber);
      if (segmentIndex < 0) segmentIndex = 0;

      const fullTurns = 5;
      const targetAngle = computeRouletteTargetRotation(
        rotation.get(),
        segmentIndex,
        wheelOrder.length,
        fullTurns
      );

      await animate(rotation, targetAngle, {
        duration: 3.8,
        ease: [0.2, 0.8, 0.2, 1],
      });

      setLastResult(result);
      setLastColor(typeof data.resultColor === "string" ? data.resultColor : null);

      const totalPayout = typeof data.totalPayout === "number" ? data.totalPayout : 0;
      const stake = typeof data.totalStake === "number" ? data.totalStake : 0;
      const colorKeyRaw = data.resultColor;
      const resultColorKey: SpinHistoryEntry["resultColorKey"] =
        colorKeyRaw === "red" || colorKeyRaw === "black" || colorKeyRaw === "green"
          ? colorKeyRaw
          : result === 0
            ? "green"
            : isRed(result)
              ? "red"
              : "black";
      const resolvedLines = parseBetsResolvedForHistory(data.betsResolved, t);
      spinCounterRef.current += 1;
      setSpinHistory((prev) => {
        const entry: SpinHistoryEntry = {
          id: crypto.randomUUID(),
          spinIndex: spinCounterRef.current,
          at: Date.now(),
          result,
          resultColorKey,
          totalStake: stake,
          totalPayout,
          net: totalPayout - stake,
          lines: resolvedLines,
        };
        return [entry, ...prev].slice(0, MAX_SPIN_HISTORY);
      });

      setBets(new Map());
      setBetHistory([]);
      if (totalPayout > stake) {
        addToast(t("roulette.winSummary", { result, payout: totalPayout - stake }), "success");
      } else if (totalPayout > 0) {
        addToast(t("roulette.breakEven"), "success");
      } else {
        addToast(t("roulette.lose", { result }), "info");
      }
    } finally {
      setSpinning(false);
    }
  };

  const availableTokens = useMemo(() => {
    return ROULETTE_CHIP_TOKENS.filter((tok) => tok.value >= minBet && tok.value <= maxBetPerLine);
  }, [minBet, maxBetPerLine]);

  const feltCellClass = (n: number) => {
    if (n === 0) {
      return "bg-gradient-to-b from-emerald-500 via-emerald-700 to-emerald-950 text-white border-green-300/65 shadow-[inset_0_2px_6px_rgba(255,255,255,0.2)]";
    }
    if (isRed(n)) {
      return "bg-gradient-to-b from-[#dc2626] via-[#991b1b] to-[#7f0d1d] text-white border-[#fbbf24]/50 shadow-[inset_0_1px_4px_rgba(255,255,255,0.15)]";
    }
    return "bg-gradient-to-b from-neutral-800 via-neutral-900 to-black text-white border-slate-500/45 shadow-[inset_0_1px_3px_rgba(255,255,255,0.08)]";
  };

  const numCell = (n: number) => {
    const key = `s:${n}` as BetKey;
    const placed = bets.get(key) ?? 0;
    return (
      <button
        key={n}
        type="button"
        disabled={spinning}
        onClick={() => addToKey(key, pendingStake)}
        className={`${feltCellClass(
          n
        )} relative flex min-h-[2.85rem] w-full flex-col items-center justify-start overflow-visible rounded-sm border-2 pt-1 font-serif text-sm font-bold tracking-tight transition hover:brightness-110 hover:ring-1 hover:ring-green-400/35 active:scale-[0.96] disabled:opacity-45 disabled:hover:ring-0 pb-5`}
      >
        <span className="relative z-0 leading-none">{n}</span>
        <PlacedChipsBadge amount={placed} layout="cell" />
      </button>
    );
  };

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100">
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-purple-600/14 blur-[95px]" />
        <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-cyan-500/8 blur-[80px]" />
        <div className="absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-[85px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <header className="relative z-10 shrink-0 flex items-center justify-between gap-2 border-b border-slate-700/90 bg-slate-900/95 px-3 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-sm md:px-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm transition hover:bg-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {backToMinigamesHub
            ? t("minigames.backToLobbyMinigamesTab")
            : t("roulette.back")}
        </button>
        <h1 className="bg-gradient-to-r from-purple-300 via-purple-200 to-cyan-200 bg-clip-text text-center text-base font-bold tracking-wide text-transparent md:text-lg">
          {t("roulette.title")}
        </h1>
        <div className="flex min-w-0 max-w-[45%] shrink-0 items-center justify-end gap-1.5 text-sm font-bold tabular-nums text-green-400 md:max-w-none md:text-base">
          {chips !== null ? (
            <>
              <span className="truncate">{chips.toLocaleString()}</span>
              <ChipIcon size="sm" className="shrink-0 brightness-110" />
            </>
          ) : (
            "—"
          )}
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-3 md:p-5 pb-24 md:pb-8">
        <p className="mx-auto mb-5 max-w-lg text-center text-xs leading-relaxed text-slate-400 md:text-sm">
          {t("roulette.subtitle")}
        </p>

        <div className="mx-auto grid max-w-5xl grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div
            ref={wheelSectionRef}
            className="flex flex-col items-center rounded-2xl border border-slate-600/80 bg-slate-800/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] scroll-mt-3 md:scroll-mt-4"
          >
            <RouletteWheelSvg wheelOrder={wheelOrder} rotation={rotation} />
            <div className="mt-5 min-h-[2.75rem] w-full max-w-xs rounded-lg border border-slate-600 bg-slate-900/60 px-4 py-2 text-center text-sm text-slate-200">
              {lastResult !== null ? (
                <span>
                  {t("roulette.lastResult", { n: lastResult })}
                  {lastColor ? (
                    <span className="text-purple-300"> · {t(`roulette.color.${lastColor}`)}</span>
                  ) : null}
                </span>
              ) : (
                <span className="text-slate-500">{t("roulette.noSpinYet")}</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-slate-600/80 bg-slate-800/50 p-4 shadow-lg backdrop-blur-sm">
              <div className="flex rounded-lg border border-slate-600/80 bg-slate-900/55 p-0.5">
                <button
                  type="button"
                  onClick={() => setTrayTab("chips")}
                  className={`flex-1 rounded-md py-2 text-center text-xs font-semibold transition sm:text-sm ${
                    trayTab === "chips"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t("roulette.tabChips")}
                </button>
                <button
                  type="button"
                  onClick={() => setTrayTab("history")}
                  className={`flex-1 rounded-md py-2 text-center text-xs font-semibold transition sm:text-sm ${
                    trayTab === "history"
                      ? "bg-slate-700 text-white shadow-sm"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {t("roulette.tabHistory")}
                </button>
              </div>

              {trayTab === "chips" ? (
                <>
                  <p className="text-center text-xs leading-snug text-slate-400">{t("roulette.chipTrayHint")}</p>
                  {availableTokens.length === 0 ? (
                    <p className="py-2 text-center text-sm text-amber-400/90">
                      {t("roulette.noChipsForLimits", { min: minBet, max: maxBetPerLine })}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-end justify-center gap-3 sm:gap-4">
                    {availableTokens.map((tok) => (
                      <button
                        key={tok.value}
                        type="button"
                        disabled={spinning}
                        title={t(`roulette.chipNames.${tok.labelKey}`, { value: tok.value })}
                        onClick={() => setPendingStake((p) => p + tok.value)}
                        className="group flex flex-col items-center gap-1 touch-manipulation disabled:opacity-40"
                      >
                        <span className="transition group-active:scale-95 group-hover:brightness-110">
                          <RouletteTrayChip tok={tok} />
                        </span>
                        <span className="text-[11px] font-bold tabular-nums text-slate-300">
                          {tok.value.toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 border-t border-slate-600/60 pt-3">
                    <div className="min-w-[6rem] rounded-lg border border-slate-600 bg-slate-900/70 px-4 py-2">
                      <span className="block text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        {t("roulette.pendingStack")}
                      </span>
                      <span className="block min-w-[4rem] text-center text-2xl font-bold tabular-nums text-green-400">
                        {pendingStake}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={spinning || pendingStake === 0}
                      onClick={() => setPendingStake(0)}
                      className="rounded-lg border border-slate-600 bg-slate-700/80 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-30"
                    >
                      {t("roulette.clearPending")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="max-h-64 space-y-2.5 overflow-y-auto pr-0.5 text-left sm:max-h-80">
                  {spinHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">{t("roulette.historyEmpty")}</p>
                  ) : (
                    spinHistory.map((entry) => {
                      const betsList = entry.lines.map((l) => t("roulette.historyBetChip", { stake: l.stake, label: l.label })).join(" · ");
                      const payoutParts = entry.lines
                        .map((l) =>
                          l.payout === 0
                            ? t("roulette.historyPayoutLose", { label: l.label })
                            : t("roulette.historyPayoutWin", {
                                label: l.label,
                                stake: l.stake,
                                mult: l.mult,
                                payout: l.payout,
                              })
                        )
                        .join(" + ");
                      return (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-slate-600/70 bg-slate-900/60 p-2.5 text-[11px] leading-snug text-slate-300 sm:text-xs"
                        >
                          <p className="font-semibold text-purple-200">{t("roulette.historySpin", { n: entry.spinIndex })}</p>
                          <p className="mt-1">
                            <span className="text-slate-500">{t("roulette.historyBetsPrefix")}</span> {betsList}
                          </p>
                          <p className="mt-1">
                            {t("roulette.historyResult", {
                              n: entry.result,
                              color: t(`roulette.color.${entry.resultColorKey}`),
                            })}
                          </p>
                          <p className="mt-1.5 font-mono text-[10px] text-slate-400 sm:text-[11px]">
                            {t("roulette.historyReturnsFormula", { parts: payoutParts, total: entry.totalPayout })}
                          </p>
                          <p
                            className={`mt-1 font-semibold tabular-nums ${
                              entry.net > 0 ? "text-green-400" : entry.net < 0 ? "text-rose-400" : "text-slate-300"
                            }`}
                          >
                            {entry.net === 0
                              ? t("roulette.historyNetZero")
                              : t("roulette.historyNet", {
                                  amount: Math.abs(entry.net),
                                  sign: entry.net > 0 ? "+" : "−",
                                })}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            <div
              className="rounded-xl border-2 border-slate-600/90 bg-slate-900/40 p-3 shadow-[inset_0_2px_12px_rgba(0,0,0,0.35)]"
              style={{
                background:
                  "radial-gradient(ellipse 85% 55% at 25% 15%, rgba(16,185,129,0.12) 0%, transparent 55%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(15,23,42,0.95) 0%, rgba(22,101,52,0.35) 55%, rgba(15,23,42,0.9) 100%), linear-gradient(180deg, rgb(15 23 42 / 0.9) 0%, rgb(15 118 110 / 0.15) 50%, rgb(15 23 42) 100%)",
              }}
            >
              <div className="mb-2 flex items-center justify-between border-b border-slate-600/50 pb-2 text-sm text-slate-300">
                <span>{t("roulette.tableStake")}</span>
                <span className="text-lg font-bold tabular-nums text-green-400">{totalStake}</span>
              </div>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  disabled={spinning || bets.size === 0}
                  onClick={undoLast}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-600 bg-slate-800/80 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  <Undo2 className="h-4 w-4" />
                  {t("roulette.undo")}
                </button>
                <button
                  type="button"
                  disabled={spinning || bets.size === 0}
                  onClick={clearBets}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-red-800/60 bg-red-950/40 py-2 text-sm text-red-200 hover:bg-red-950/60 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("roulette.clear")}
                </button>
              </div>

              {/* Zero — case « bande » sur le tapis */}
              <div className="mb-2 flex justify-center">
                <div className="w-[min(100%,3.5rem)]">{numCell(0)}</div>
              </div>

              {/* 3 x 12 grille */}
              <div className="mb-2 grid grid-cols-12 gap-px rounded-sm bg-[#b8860b]/40 p-px shadow-inner">
                {Array.from({ length: 12 }, (_, c) => {
                  const top = 3 + c * 3;
                  const mid = 2 + c * 3;
                  const bot = 1 + c * 3;
                  return (
                    <div key={c} className="flex flex-col gap-px">
                      {numCell(top)}
                      <button
                        type="button"
                        disabled={spinning}
                        className="relative h-4 min-h-[14px] rounded-[1px] border border-emerald-800/40 bg-[#031910] hover:bg-[#0a3020]"
                        title={t("roulette.splitVertical")}
                        onClick={() => addToKey(`sp:${Math.min(top, mid)}-${Math.max(top, mid)}` as BetKey, pendingStake)}
                      >
                        <PlacedChipsBadge
                          amount={bets.get(`sp:${Math.min(top, mid)}-${Math.max(top, mid)}` as BetKey) ?? 0}
                          layout="thin"
                        />
                      </button>
                      {numCell(mid)}
                      <button
                        type="button"
                        disabled={spinning}
                        className="relative h-4 min-h-[14px] rounded-[1px] border border-emerald-800/40 bg-[#031910] hover:bg-[#0a3020]"
                        title={t("roulette.splitVertical")}
                        onClick={() => addToKey(`sp:${Math.min(mid, bot)}-${Math.max(mid, bot)}` as BetKey, pendingStake)}
                      >
                        <PlacedChipsBadge
                          amount={bets.get(`sp:${Math.min(mid, bot)}-${Math.max(mid, bot)}` as BetKey) ?? 0}
                          layout="thin"
                        />
                      </button>
                      {numCell(bot)}
                    </div>
                  );
                })}
              </div>

              <div className="mb-2 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => addToKey("d:1", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-2 pl-2 pr-7 font-serif text-[11px] font-bold text-slate-200 hover:bg-slate-800/60 sm:text-xs"
                >
                  {t("roulette.dozen1")}
                  <PlacedChipsBadge amount={bets.get("d:1") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => addToKey("d:2", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-2 pl-2 pr-7 font-serif text-[11px] font-bold text-slate-200 hover:bg-slate-800/60 sm:text-xs"
                >
                  {t("roulette.dozen2")}
                  <PlacedChipsBadge amount={bets.get("d:2") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => addToKey("d:3", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-2 pl-2 pr-7 font-serif text-[11px] font-bold text-slate-200 hover:bg-slate-800/60 sm:text-xs"
                >
                  {t("roulette.dozen3")}
                  <PlacedChipsBadge amount={bets.get("d:3") ?? 0} layout="corner" />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-3 gap-1">
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => addToKey("col:1", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-2 pl-2 pr-7 font-serif text-[11px] font-bold text-slate-200 hover:bg-slate-800/60 sm:text-xs"
                >
                  {t("roulette.col1")}
                  <PlacedChipsBadge amount={bets.get("col:1") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => addToKey("col:2", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-2 pl-2 pr-7 font-serif text-[11px] font-bold text-slate-200 hover:bg-slate-800/60 sm:text-xs"
                >
                  {t("roulette.col2")}
                  <PlacedChipsBadge amount={bets.get("col:2") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={spinning}
                  onClick={() => addToKey("col:3", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-2 pl-2 pr-7 font-serif text-[11px] font-bold text-slate-200 hover:bg-slate-800/60 sm:text-xs"
                >
                  {t("roulette.col3")}
                  <PlacedChipsBadge amount={bets.get("col:3") ?? 0} layout="corner" />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-2 gap-1 sm:grid-cols-3">
                {(["red", "black", "even", "odd", "low", "high"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={spinning}
                    onClick={() => addToKey(k, pendingStake)}
                    className={`relative rounded-sm border-2 py-2 pl-2 pr-7 font-serif text-[11px] font-bold transition hover:brightness-110 sm:text-xs ${
                      k === "red"
                        ? "border-[#f87171]/60 bg-gradient-to-b from-[#b91c1c] to-[#7f1d1d] text-white"
                        : k === "black"
                          ? "border-[#a3a3a3]/40 bg-gradient-to-b from-neutral-800 to-black text-white"
                          : "border-slate-500/45 bg-slate-900/40 text-slate-200 hover:bg-slate-800/55"
                    }`}
                  >
                    {t(`roulette.${k}`)}
                    <PlacedChipsBadge amount={bets.get(k) ?? 0} layout="corner" />
                  </button>
                ))}
              </div>

              <details className="rounded-md border border-slate-600 bg-slate-900/45">
                <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-purple-200 hover:bg-slate-800/50">
                  {t("roulette.advancedInside")}
                </summary>
                <div className="max-h-48 space-y-3 overflow-y-auto border-t border-slate-600/50 p-2">
                  <p className="text-xs text-slate-500">{t("roulette.streetsHint")}</p>
                  <div className="flex flex-wrap gap-1">
                    {streetBases.map((b) => (
                      <button
                        key={b}
                        type="button"
                        disabled={spinning}
                        onClick={() => addToKey(`st:${b}` as BetKey, pendingStake)}
                        className="relative rounded border border-slate-600/70 bg-slate-800/60 py-1 pl-1.5 pr-5 text-[10px] text-slate-200 hover:bg-slate-700/70"
                      >
                        {b}-{b + 2}
                        <PlacedChipsBadge amount={bets.get(`st:${b}` as BetKey) ?? 0} layout="corner" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">{t("roulette.sixLineHint")}</p>
                  <div className="flex flex-wrap gap-1">
                    {sixBases.map((b) => (
                      <button
                        key={b}
                        type="button"
                        disabled={spinning}
                        onClick={() => addToKey(`6:${b}` as BetKey, pendingStake)}
                        className="relative rounded border border-slate-600/70 bg-slate-800/60 py-1 pl-1.5 pr-5 text-[10px] text-slate-200 hover:bg-slate-700/70"
                      >
                        {b}-{b + 5}
                        <PlacedChipsBadge amount={bets.get(`6:${b}` as BetKey) ?? 0} layout="corner" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">{t("roulette.cornersHint")}</p>
                  <div className="flex flex-wrap gap-1">
                    {corners.map((c) => {
                      const ck = cornerKey(c.n1, c.n2, c.n3, c.n4);
                      return (
                        <button
                          key={c.label}
                          type="button"
                          disabled={spinning}
                          onClick={() => addToKey(ck, pendingStake)}
                          className="relative rounded border border-slate-600/70 bg-slate-800/60 py-0.5 pl-1 pr-4 text-[9px] text-slate-200 hover:bg-slate-700/70"
                        >
                          {c.label}
                          <PlacedChipsBadge amount={bets.get(ck) ?? 0} layout="corner" />
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500">{t("roulette.splitsHint")}</p>
                  <div className="flex flex-wrap gap-1">
                    {splits.map((s) => {
                      const sk = `sp:${s.a}-${s.b}` as BetKey;
                      return (
                        <button
                          key={s.label}
                          type="button"
                          disabled={spinning}
                          onClick={() => addToKey(sk, pendingStake)}
                          className="relative rounded border border-purple-500/35 bg-purple-950/40 py-0.5 pl-1 pr-4 text-[9px] text-purple-100 hover:bg-purple-950/60"
                        >
                          {s.label}
                          <PlacedChipsBadge amount={bets.get(sk) ?? 0} layout="corner" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </details>
            </div>

            <button
              type="button"
              disabled={spinning || bets.size === 0 || chips === null}
              onClick={() => void spin()}
              className="w-full rounded-xl border-2 border-green-400/45 bg-gradient-to-b from-green-600 to-green-800 py-4 text-lg font-bold tracking-wide text-white shadow-[0_4px_0_rgb(21_128_61),0_14px_36px_rgba(0,0,0,0.45)] transition hover:from-green-500 hover:to-green-700 active:translate-y-0.5 active:shadow-[0_2px_0_rgb(21_128_61)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:active:translate-y-0"
            >
              {spinning ? t("roulette.spinning") : t("roulette.spin")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
