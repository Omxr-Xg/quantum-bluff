import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { useNavigate } from "react-router";
import { useTranslation, type TFunction } from "react-i18next";
import { motion, useMotionValue, animate, type MotionValue } from "motion/react";
import { ArrowLeft, ChevronLeft, ChevronRight, History, Trash2, Undo2, X } from "lucide-react";
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
import { CustomScrollArea } from "../components/CustomScrollArea";
import { getAuthItem } from "../utils/authStorage";
import { TutorialSpotlight } from "../components/tutorial/TutorialSpotlight";

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

/** Libellé couleur sous la roue : rouge / noir lisibles sur fond sombre. */
function rouletteResultColorWordClass(colorKey: string): string {
  switch (colorKey) {
    case "red":
      return "font-semibold capitalize text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.35)]";
    case "black":
      return "font-semibold capitalize rounded-md bg-neutral-200 px-1.5 py-0.5 text-neutral-950";
    case "green":
      return "font-semibold capitalize text-emerald-400";
    default:
      return "font-semibold capitalize text-slate-300";
  }
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

type RouletteTutorialHighlight =
  | "header"
  | "balance"
  | "wheel"
  | "chips"
  | "pending"
  | "straight"
  | "dozens"
  | "columns"
  | "outside"
  | "advanced"
  | "controls"
  | "spin"
  | "result"
  | "history";

type RouletteTutorialStep = {
  id: string;
  highlight: RouletteTutorialHighlight | null;
  titleKey: string;
  bodyKey: string;
};

const ROULETTE_TUTORIAL_STEPS: RouletteTutorialStep[] = [
  { id: "intro", highlight: null, titleKey: "roulette.tutorial.steps.intro.title", bodyKey: "roulette.tutorial.steps.intro.body" },
  { id: "header", highlight: "header", titleKey: "roulette.tutorial.steps.header.title", bodyKey: "roulette.tutorial.steps.header.body" },
  { id: "balance", highlight: "balance", titleKey: "roulette.tutorial.steps.balance.title", bodyKey: "roulette.tutorial.steps.balance.body" },
  { id: "wheel", highlight: "wheel", titleKey: "roulette.tutorial.steps.wheel.title", bodyKey: "roulette.tutorial.steps.wheel.body" },
  { id: "chips", highlight: "chips", titleKey: "roulette.tutorial.steps.chips.title", bodyKey: "roulette.tutorial.steps.chips.body" },
  { id: "pending", highlight: "pending", titleKey: "roulette.tutorial.steps.pending.title", bodyKey: "roulette.tutorial.steps.pending.body" },
  { id: "straight", highlight: "straight", titleKey: "roulette.tutorial.steps.straight.title", bodyKey: "roulette.tutorial.steps.straight.body" },
  { id: "outside", highlight: "outside", titleKey: "roulette.tutorial.steps.outside.title", bodyKey: "roulette.tutorial.steps.outside.body" },
  { id: "dozens", highlight: "dozens", titleKey: "roulette.tutorial.steps.dozens.title", bodyKey: "roulette.tutorial.steps.dozens.body" },
  { id: "columns", highlight: "columns", titleKey: "roulette.tutorial.steps.columns.title", bodyKey: "roulette.tutorial.steps.columns.body" },
  { id: "advanced", highlight: "advanced", titleKey: "roulette.tutorial.steps.advanced.title", bodyKey: "roulette.tutorial.steps.advanced.body" },
  { id: "controls", highlight: "controls", titleKey: "roulette.tutorial.steps.controls.title", bodyKey: "roulette.tutorial.steps.controls.body" },
  { id: "spin", highlight: "spin", titleKey: "roulette.tutorial.steps.spin.title", bodyKey: "roulette.tutorial.steps.spin.body" },
  { id: "result", highlight: "result", titleKey: "roulette.tutorial.steps.result.title", bodyKey: "roulette.tutorial.steps.result.body" },
  { id: "history", highlight: "history", titleKey: "roulette.tutorial.steps.history.title", bodyKey: "roulette.tutorial.steps.history.body" },
  { id: "finish", highlight: null, titleKey: "roulette.tutorial.steps.finish.title", bodyKey: "roulette.tutorial.steps.finish.body" },
];

const ROULETTE_TUTORIAL_GLOW =
  "relative z-[241] scale-[1.025] brightness-125 shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_0_28px_rgba(251,191,36,0.78)] ring-2 ring-amber-300/70 transition duration-200";

const ROULETTE_TUTORIAL_SOFT_GLOW =
  "relative z-[241] brightness-125 drop-shadow-[0_0_22px_rgba(251,191,36,0.75)] transition duration-200";

function demoSpinHistory(tr: TFunction): SpinHistoryEntry {
  return {
    id: "roulette-tutorial-demo-spin",
    spinIndex: 1,
    at: Date.now(),
    result: 17,
    resultColorKey: "black",
    totalStake: 75,
    totalPayout: 180,
    net: 105,
    lines: [
      { label: tr("roulette.betDescr.straight", { n: 17 }), stake: 25, payout: 0, mult: 0 },
      { label: tr("roulette.black"), stake: 50, payout: 100, mult: 2 },
    ],
  };
}

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
  fullTurns: number,
  landingAngleDeg: number
): number {
  const stepDeg = 360 / segmentCount;
  // RouletteWheelSvg : centre du segment i à (i+0.5)*step - 90°.
  // On force ce centre à tomber à un angle absolu variable (landingAngleDeg),
  // ce qui évite une chute toujours "en haut".
  const targetRemainder = mod360(landingAngleDeg + 90 - (segmentIndex + 0.5) * stepDeg);
  const currentRem = mod360(currentRotation);
  let delta = targetRemainder - currentRem;
  if (delta > 0) delta -= 360;
  return currentRotation + delta - fullTurns * 360;
}

/**
 * Cible d'orbite de bille qui:
 * - respecte un mouvement "avant" (sens inverse de la roue ici),
 * - et finit exactement sur la case gagnante.
 */
function computeBallOrbitTarget(
  currentBallOrbit: number,
  landingAngleDeg: number,
  segmentCount: number,
  minForwardTurns: number,
  landingOffsetRatio: number
): number {
  const stepDeg = 360 / segmentCount;
  // La bille démarre en haut (-90°). On veut qu'à la fin elle soit au centre du segment gagnant.
  const clampedOffset = Math.max(-0.42, Math.min(0.42, landingOffsetRatio));
  // angle bille = -90 + orbit; donc orbit = angleBille + 90.
  const desiredOrbitRemainder = mod360(landingAngleDeg + 90 + clampedOffset * stepDeg);
  const currentRem = mod360(currentBallOrbit);
  let delta = desiredOrbitRemainder - currentRem;
  if (delta < 0) delta += 360;
  const minAdvance = minForwardTurns * 360;
  while (delta < minAdvance) delta += 360;
  return currentBallOrbit + delta;
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

function RouletteWheelSvg({
  wheelOrder,
  rotation,
  ballOrbit,
}: {
  wheelOrder: number[];
  rotation: MotionValue<number>;
  ballOrbit: MotionValue<number>;
}) {
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
    <div className="relative mx-auto aspect-square w-full max-w-[min(100%,clamp(15rem,min(88vmin,92vw),36rem))] sm:max-w-[min(100%,clamp(17rem,82vmin,38rem))] lg:max-w-[min(100%,clamp(17rem,min(72vmin,46vw),36rem))]">
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
              <motion.div className="pointer-events-none absolute inset-0 z-20" style={{ rotate: ballOrbit }} aria-hidden>
                <div className="absolute left-1/2 top-[8%] h-3.5 w-3.5 -translate-x-1/2 rounded-full border border-slate-100/90 bg-gradient-to-b from-white via-slate-100 to-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.7),0_3px_10px_rgba(0,0,0,0.5)]" />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type RouletteProps = {
  /** Hub jeux casino rétro : fond bordeaux/or et navigation vers le salon vintage. */
  retroCasino?: boolean;
  /** Dans `/minigames`, le retour mène au hub mini-jeux au lieu du lobby seul. */
  backToMinigamesHub?: boolean;
  onBackToMinigamesHub?: () => void;
  tutorialMode?: boolean;
};

export function Roulette({
  retroCasino = false,
  backToMinigamesHub = false,
  onBackToMinigamesHub,
  tutorialMode = false,
}: RouletteProps = {}) {
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
  const [chips, setChips] = useState<number | null>(() => (tutorialMode ? 2500 : null));
  const [minBet, setMinBet] = useState(10);
  /** Alignés sur le palier bas (niveau 1) jusqu’au chargement config + gamification. */
  const [maxBetPerLine, setMaxBetPerLine] = useState(750);
  const [maxTotalStake, setMaxTotalStake] = useState(5000);
  const [limitsLoaded, setLimitsLoaded] = useState(() => tutorialMode);
  const [wheelOrder, setWheelOrder] = useState<number[]>(DEFAULT_WHEEL);
  /** Somme des jetons tapés avant de poser sur le tapis. */
  const [pendingStake, setPendingStake] = useState(0);
  const [bets, setBets] = useState<Map<BetKey, number>>(() => new Map());
  const [_betHistory, setBetHistory] = useState<{ key: BetKey; amt: number }[]>([]);
  const betsRef = useRef(bets);
  betsRef.current = bets;
  const totalStakeRef = useRef(0);
  const historyInitRef = useRef(parseSpinHistoryFromStorage());
  const [spinHistory, setSpinHistory] = useState<SpinHistoryEntry[]>(() => historyInitRef.current.entries);
  const spinCounterRef = useRef(historyInitRef.current.counter);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<number | null>(null);
  const [lastColor, setLastColor] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const balanceRef = useRef<HTMLDivElement>(null);
  const chipButtonsRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<HTMLDivElement>(null);
  const straightRef = useRef<HTMLButtonElement>(null);
  const dozensRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const outsideRef = useRef<HTMLDivElement>(null);
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const spinButtonRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const wheelVisualRef = useRef<HTMLDivElement>(null);
  const wheelSectionRef = useRef<HTMLDivElement>(null);
  const rotation = useMotionValue(0);
  const ballOrbit = useMotionValue(0);
  const streetBases = useMemo(() => buildStreetBases(), []);
  const sixBases = useMemo(() => buildSixLineBases(), []);
  const corners = useMemo(() => buildCornerDefs(), []);
  const splits = useMemo(() => buildSplitPairs(), []);
  const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
  const tutorialStep = ROULETTE_TUTORIAL_STEPS[tutorialStepIndex] ?? ROULETTE_TUTORIAL_STEPS[0]!;
  const tutorialDone = tutorialStepIndex >= ROULETTE_TUTORIAL_STEPS.length - 1;

  const loadBalance = useCallback(async () => {
    const token = getAuthItem("token");
    if (!token) {
      navigate("/lobby");
      return;
    }
    try {
      const c = await fetchBalanceFromServer({ authoritative: true });
      if (!getAuthItem("token")) {
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
      let lineCap = 750;
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
        // Ne jamais descendre sous la limite roulette métier (5000) à cause
        // d'une valeur gamification obsolète en cache/session.
        totalCap = Math.max(totalCap, g.maxRouletteTotalStake);
      }
      setMaxBetPerLine(lineCap);
      setMaxTotalStake(Math.max(5000, totalCap));
    } catch {
      /* defaults déjà cohérents (250 / 1500) */
    } finally {
      setLimitsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (tutorialMode) return;
    void loadConfig();
    void loadBalance();
  }, [loadConfig, loadBalance, tutorialMode]);

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

  useEffect(() => {
    if (!tutorialMode) return;
    if (tutorialStep.highlight === "history") setHistoryOpen(true);
    if (tutorialStep.highlight === "result" && lastResult === null) {
      setLastResult(17);
      setLastColor("black");
    }
  }, [lastResult, tutorialMode, tutorialStep.highlight]);

  const totalStake = useMemo(() => {
    let s = 0;
    for (const v of bets.values()) s += v;
    return s;
  }, [bets]);

  const tutorialTargetRef = useMemo(() => {
    const refs = {
      header: headerRef,
      balance: balanceRef,
      wheel: wheelVisualRef,
      chips: chipButtonsRef,
      pending: pendingRef,
      straight: straightRef,
      dozens: dozensRef,
      columns: columnsRef,
      outside: outsideRef,
      advanced: advancedRef,
      controls: controlsRef,
      spin: spinButtonRef,
      result: resultRef,
      history: historyRef,
    } satisfies Record<RouletteTutorialHighlight, RefObject<HTMLElement | null>>;
    return tutorialStep.highlight ? refs[tutorialStep.highlight] : null;
  }, [tutorialStep.highlight]);

  const tutorialHighlightClass = useCallback(
    (highlight: RouletteTutorialHighlight, variant: "strong" | "soft" = "strong") =>
      tutorialMode && tutorialStep.highlight === highlight
        ? variant === "soft"
          ? ROULETTE_TUTORIAL_SOFT_GLOW
          : ROULETTE_TUTORIAL_GLOW
        : "",
    [tutorialMode, tutorialStep.highlight]
  );

  const closeRouletteTutorial = useCallback(() => {
    navigate("/minigames?game=roulette", { replace: true });
  }, [navigate]);

  useEffect(() => {
    totalStakeRef.current = totalStake;
  }, [totalStake]);

  const addToKey = useCallback(
    (key: BetKey, stake: number) => {
      if (chips === null || spinning || !limitsLoaded) return;
      const s = Math.floor(stake);
      if (s <= 0) {
        addToast(t("roulette.addChipsFirst"), "error");
        return;
      }
      const prev = betsRef.current;
      const cur = prev.get(key) ?? 0;
      let prevTotal = 0;
      for (const v of prev.values()) prevTotal += v;
      const otherBets = prevTotal - cur;
      const maxLineTotal = Math.min(
        maxBetPerLine,
        Math.max(0, maxTotalStake - otherBets),
        Math.max(0, chips - otherBets)
      );
      const applied = Math.min(Math.floor(cur + s), Math.floor(maxLineTotal));
      if (applied <= cur) {
        if (cur >= maxBetPerLine) addToast(t("roulette.betCapLine"), "error");
        else if (prevTotal >= maxTotalStake) addToast(t("roulette.betCapTotal"), "error");
        else addToast(t("roulette.insufficient"), "error");
        return;
      }
      const actualAdd = applied - cur;
      if (actualAdd < s) {
        addToast(t("roulette.betPartial", { placed: actualAdd, requested: s }), "info");
      }
      const m = new Map(prev);
      m.set(key, applied);
      setBets(m);
      setBetHistory((h) => [...h, { key, amt: actualAdd }]);
      setPendingStake(0);
    },
    [chips, maxBetPerLine, maxTotalStake, spinning, limitsLoaded, addToast, t]
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
    if (tutorialMode) {
      if (chips === null || spinning) return;
      if (bets.size === 0) {
        addToast(t("roulette.noBets"), "error");
        return;
      }
      setSpinning(true);
      requestAnimationFrame(() => {
        wheelSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" });
      });
      const result = 17;
      const segmentIndex = Math.max(0, wheelOrder.indexOf(result));
      const landingAngleDeg = -20;
      const targetAngle = computeRouletteTargetRotation(rotation.get(), segmentIndex, wheelOrder.length, 4, landingAngleDeg);
      const ballTarget = computeBallOrbitTarget(ballOrbit.get(), landingAngleDeg, wheelOrder.length, 5, 0.08);
      await Promise.all([
        animate(rotation, targetAngle, { duration: 2.2, ease: [0.2, 0.8, 0.2, 1] }),
        animate(ballOrbit, ballTarget, { duration: 2.7, ease: [0.12, 0.78, 0.22, 1] }),
      ]);
      const stake = totalStakeRef.current;
      const totalPayout = bets.has("black") ? (bets.get("black") ?? 0) * 2 : 0;
      setLastResult(result);
      setLastColor("black");
      spinCounterRef.current += 1;
      setSpinHistory((prev) => [
        {
          id: crypto.randomUUID(),
          spinIndex: spinCounterRef.current,
          at: Date.now(),
          result,
          resultColorKey: "black",
          totalStake: stake,
          totalPayout,
          net: totalPayout - stake,
          lines: betsPayload().map((bet) => {
            const amount = typeof bet.amount === "number" ? bet.amount : 0;
            const isWinner = bet.type === "black";
            return {
              label: describeRouletteApiBet(bet, t),
              stake: amount,
              payout: isWinner ? amount * 2 : 0,
              mult: isWinner ? 2 : 0,
            };
          }),
        },
        ...prev,
      ].slice(0, MAX_SPIN_HISTORY));
      setBets(new Map());
      setBetHistory([]);
      setSpinning(false);
      addToast(t("roulette.tutorial.demoSpinToast"), "success");
      return;
    }

    const token = getAuthItem("token");
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
      // Angle absolu de chute de la bille (variable à chaque spin).
      const landingAngleDeg = Math.random() * 360 - 180;
      const targetAngle = computeRouletteTargetRotation(
        rotation.get(),
        segmentIndex,
        wheelOrder.length,
        fullTurns,
        landingAngleDeg
      );

      // Effet réel: la roue tourne dans un sens, la bille dans l'autre,
      // puis la bille termine précisément sur la case du résultat.
      const landingOffsetRatio = (Math.random() * 2 - 1) * 0.32;
      const ballTarget = computeBallOrbitTarget(
        ballOrbit.get(),
        landingAngleDeg,
        wheelOrder.length,
        fullTurns + 1,
        landingOffsetRatio
      );
      const wheelSpinDuration = 3.8;
      const ballSpinDuration = wheelSpinDuration + 1;
      await Promise.all([
        animate(rotation, targetAngle, {
          duration: wheelSpinDuration,
          ease: [0.2, 0.8, 0.2, 1],
        }),
        animate(ballOrbit, ballTarget, {
          duration: ballSpinDuration,
          ease: [0.12, 0.78, 0.22, 1],
        }),
      ]);

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

  const bettingDisabled = spinning || !limitsLoaded || chips === null;
  const visibleSpinHistory =
    tutorialMode && spinHistory.length === 0 ? [demoSpinHistory(t)] : spinHistory;

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
        ref={n === 17 ? straightRef : undefined}
        type="button"
        disabled={bettingDisabled}
        onClick={() => addToKey(key, pendingStake)}
        className={`${feltCellClass(
          n
        )} ${n === 17 ? tutorialHighlightClass("straight") : ""} relative flex min-h-[2.55rem] w-full flex-col items-center justify-start overflow-visible rounded-sm border-2 pt-0.5 font-serif text-[11px] font-bold tracking-tight transition hover:brightness-110 hover:ring-1 hover:ring-green-400/35 active:scale-[0.96] disabled:opacity-45 disabled:hover:ring-0 pb-4 sm:min-h-[3.15rem] sm:pb-5 sm:pt-1 sm:text-sm md:min-h-[3.35rem] md:text-base`}
      >
        <span className="relative z-0 leading-none">{n}</span>
        <PlacedChipsBadge amount={placed} layout="cell" />
      </button>
    );
  };

  const isRetro = retroCasino;
  const retroPanel =
    "rounded-sm border-2 border-amber-800/35 bg-[#1a100c]/75 shadow-[inset_0_1px_0_rgba(251,191,36,0.06),0_22px_60px_rgba(0,0,0,0.35)]";
  const modernPanel =
    "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl";

  return (
    <div
      className={`relative flex h-full min-h-0 flex-1 flex-col overflow-hidden ${
        isRetro ? "bg-[#140a08] text-amber-50" : "bg-[#020716] text-slate-100"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
        {isRetro ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a100c] via-[#140a08] to-[#0c0604]" />
            <div className="absolute left-1/2 top-[16%] h-72 w-72 -translate-x-1/2 rounded-full bg-red-700/14 blur-[110px]" />
            <div className="absolute -right-12 bottom-1/4 h-64 w-64 rounded-full bg-amber-600/10 blur-[95px]" />
            <div
              className="absolute inset-0 opacity-[0.09]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(127,29,29,0.32) 0px, rgba(127,29,29,0.32) 1px, transparent 1px, transparent 12px)",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.05]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, rgba(0,0,0,0.55) 0px, rgba(0,0,0,0.55) 1px, transparent 1px, transparent 3px)",
              }}
            />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.22),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_42%,rgba(245,158,11,0.08),transparent_48%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
            <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-950/36 blur-[120px]" />
            <div className="absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-emerald-700/10 blur-[90px]" />
            <div className="absolute -left-16 bottom-0 h-80 w-80 rounded-full bg-amber-700/8 blur-[95px]" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.26) 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.55),transparent_58%)]" />
          </>
        )}
      </div>

      <header
        ref={headerRef}
        className={`relative z-10 flex shrink-0 items-center justify-between gap-2 px-3 py-2.5 md:px-5 ${tutorialHighlightClass("header")} ${
          isRetro
            ? "border-b-2 border-amber-800/40 bg-[#1a100c]/90 shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
            : "border-b border-white/10 bg-slate-950/55 shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl"
        }`}
      >
        <button
          type="button"
          onClick={handleBack}
          className={
            isRetro
              ? "inline-flex items-center gap-2 rounded-sm border-2 border-amber-800/45 bg-stone-950/70 px-3 py-2 text-sm font-bold uppercase tracking-wide text-amber-100 transition hover:border-amber-600/55 hover:bg-amber-950/50"
              : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-semibold text-slate-200 shadow-sm transition hover:border-blue-200/25 hover:bg-white/[0.08] hover:text-white"
          }
        >
          <ArrowLeft className="h-4 w-4" />
          {isRetro
            ? t("minigames.retroCasinoBack")
            : backToMinigamesHub
              ? t("minigames.backToLobbyMinigamesTab")
              : t("roulette.back")}
        </button>
        <h1
          className={
            isRetro
              ? "flex min-w-0 flex-1 items-center justify-center sm:px-4"
              : "flex min-w-0 flex-1 items-center justify-center rounded-full border border-amber-200/16 bg-slate-950/45 px-2 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_0_22px_rgba(245,158,11,0.06)] sm:px-4"
          }
        >
          <span
            className={`truncate bg-clip-text font-black text-transparent ${
              isRetro
                ? "bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 font-serif text-base uppercase tracking-[0.2em] sm:text-lg md:text-xl"
                : "bg-gradient-to-r from-slate-50 via-blue-100 to-amber-200 text-base tracking-[0.08em] sm:text-lg sm:tracking-[0.12em] md:text-2xl"
            }`}
          >
            {t("roulette.title")}
          </span>
        </h1>
        <div className="flex min-w-0 max-w-[45%] shrink-0 items-center justify-end gap-1.5 md:max-w-none">
        <div
          ref={balanceRef}
          className={`flex min-w-0 shrink-0 items-center justify-end gap-1.5 px-3 py-1.5 text-sm font-bold tabular-nums md:text-base ${tutorialHighlightClass("balance")} ${
            isRetro
              ? "rounded-sm border-2 border-amber-700/40 bg-stone-950/75 text-amber-200"
              : "rounded-full border border-amber-300/15 bg-slate-950/55 text-amber-100"
          }`}
        >
          {chips !== null ? (
            <>
              <span className="truncate">{chips.toLocaleString()}</span>
              <ChipIcon size="sm" className="shrink-0 brightness-110" />
            </>
          ) : (
            "—"
          )}
        </div>
        </div>
      </header>

      <CustomScrollArea className="relative z-10 min-h-0 flex-1" contentClassName="overflow-x-hidden p-2 pb-24 sm:p-3 md:p-5 md:pb-8">
        <p
          className={`mx-auto mb-4 max-w-lg text-center text-[10px] leading-relaxed sm:mb-5 sm:text-xs md:text-sm ${
            isRetro ? "text-amber-100/65" : "text-slate-400"
          }`}
        >
          {t("roulette.subtitle")}
        </p>

        <div className="mx-auto flex w-full min-w-0 max-w-[min(100%,min(100vw-1.5rem,90rem))] flex-col gap-6 lg:gap-8">
          {/* Desktop : tapis + jetons à gauche, roue à droite (même hauteur). Mobile : roue en premier, puis mises. */}
          <div className="flex w-full min-h-0 flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-[clamp(0.75rem,2vw,1.25rem)] xl:gap-5">
            <div className="order-2 flex min-h-0 min-w-0 flex-1 flex-col gap-4 lg:order-1 lg:flex-row lg:items-stretch lg:gap-[clamp(0.75rem,2vw,1.25rem)] xl:gap-5">
            <aside className="order-1 w-full shrink-0 lg:order-2 lg:w-[clamp(6.25rem,11vw,8.5rem)] lg:max-w-[clamp(6.25rem,11vw,8.5rem)]">
              <div className={`flex h-full min-h-0 flex-col gap-3 p-3 lg:py-4 ${isRetro ? retroPanel : modernPanel}`}>
                <div className={`border-b pb-2 ${isRetro ? "border-amber-900/45" : "border-slate-600/60"}`}>
                  <h2
                    className={`text-center text-xs font-semibold uppercase tracking-wide lg:text-[11px] ${
                      isRetro ? "text-amber-200" : "text-slate-100"
                    }`}
                  >
                    {t("roulette.tabChips")}
                  </h2>
                </div>
                <p className="hidden text-center text-[10px] leading-snug text-slate-400 lg:block">{t("roulette.chipTrayHint")}</p>
                {availableTokens.length === 0 ? (
                  <p className="py-2 text-center text-xs text-amber-400/90">
                    {t("roulette.noChipsForLimits", { min: minBet, max: maxBetPerLine })}
                  </p>
                ) : null}
                <div
                  ref={chipButtonsRef}
                  className={`flex flex-row flex-wrap items-end justify-center gap-2 sm:gap-3 lg:flex-col lg:items-center lg:gap-3 lg:px-0.5 ${tutorialHighlightClass("chips")}`}
                >
                  {availableTokens.map((tok) => (
                    <button
                      key={tok.value}
                      type="button"
                      disabled={bettingDisabled}
                      title={t(`roulette.chipNames.${tok.labelKey}`, { value: tok.value })}
                      onClick={() =>
                        setPendingStake((p) => {
                          if (chips === null || !limitsLoaded) return p;
                          const tot = totalStakeRef.current;
                          const rem = Math.max(0, chips - tot);
                          const maxStack = Math.min(maxBetPerLine, rem);
                          return Math.min(p + tok.value, maxStack);
                        })
                      }
                      className="group flex flex-col items-center gap-0.5 touch-manipulation disabled:opacity-40"
                    >
                      <span className="origin-center scale-[0.88] transition group-active:scale-[0.82] group-hover:brightness-110 sm:scale-95 lg:scale-90">
                        <RouletteTrayChip tok={tok} />
                      </span>
                      <span className="text-[10px] font-bold tabular-nums text-slate-300 lg:text-[11px]">
                        {tok.value.toLocaleString()}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-auto flex flex-col gap-2 border-t border-slate-600/60 pt-3">
                  <div
                    ref={pendingRef}
                    className={`rounded-lg border border-slate-600 bg-slate-900/70 px-2 py-2 ${tutorialHighlightClass("pending")}`}
                  >
                    <span className="block text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                      {t("roulette.pendingStack")}
                    </span>
                    <span className="block text-center text-lg font-bold tabular-nums text-green-400 lg:text-xl">
                      {pendingStake}
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={bettingDisabled || pendingStake === 0}
                    onClick={() => setPendingStake(0)}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700/80 px-2 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-30"
                  >
                    {t("roulette.clearPending")}
                  </button>
                </div>
              </div>
            </aside>

            <div className="order-2 min-w-0 flex-1 lg:order-1">
            <div
              className={`p-1.5 sm:p-2 md:p-4 ${isRetro ? "rounded-sm border-2 border-amber-800/35 bg-[#1a100c]/70 shadow-[inset_0_1px_0_rgba(251,191,36,0.05),0_22px_60px_rgba(0,0,0,0.32)]" : "rounded-2xl border border-amber-200/16 bg-slate-900/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_22px_60px_rgba(0,0,0,0.26)] backdrop-blur-xl"}`}
              style={
                isRetro
                  ? {
                      background:
                        "radial-gradient(ellipse 85% 55% at 25% 15%, rgba(220,38,38,0.12) 0%, transparent 55%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(26,16,12,0.95) 0%, rgba(127,29,29,0.22) 55%, rgba(20,10,8,0.92) 100%), linear-gradient(180deg, rgb(26 16 12 / 0.92) 0%, rgb(127 29 29 / 0.1) 50%, rgb(20 10 8) 100%)",
                    }
                  : {
                      background:
                        "radial-gradient(ellipse 85% 55% at 25% 15%, rgba(16,185,129,0.12) 0%, transparent 55%), radial-gradient(ellipse 100% 80% at 50% 100%, rgba(15,23,42,0.95) 0%, rgba(22,101,52,0.35) 55%, rgba(15,23,42,0.9) 100%), linear-gradient(180deg, rgb(15 23 42 / 0.9) 0%, rgb(15 118 110 / 0.15) 50%, rgb(15 23 42) 100%)",
                    }
              }
            >
              <div
                ref={controlsRef}
                className={`mb-2 space-y-2 border-b border-slate-600/50 pb-2 text-sm text-slate-300 ${tutorialHighlightClass("controls")}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{t("roulette.tableStake")}</span>
                  <span className="text-lg font-bold tabular-nums text-green-400">
                    {totalStake} / {maxTotalStake}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-emerald-500/90 transition-[width]"
                    style={{
                      width: `${maxTotalStake > 0 ? Math.min(100, (totalStake / maxTotalStake) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] leading-snug text-slate-500">{t("roulette.limitsExplainer", { perLine: maxBetPerLine, total: maxTotalStake })}</p>
              </div>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  disabled={bettingDisabled || bets.size === 0}
                  onClick={undoLast}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-600 bg-slate-800/80 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-40"
                >
                  <Undo2 className="h-4 w-4" />
                  {t("roulette.undo")}
                </button>
                <button
                  type="button"
                  disabled={bettingDisabled || bets.size === 0}
                  onClick={clearBets}
                  className="flex flex-1 items-center justify-center gap-1 rounded-md border border-red-800/60 bg-red-950/40 py-2 text-sm text-red-200 hover:bg-red-950/60 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("roulette.clear")}
                </button>
              </div>

              {/* Tapis chiffré : min-width + défilement horizontal sur mobile pour garder des cases tapables. */}
              <div className="mb-2 max-md:-mx-0.5 max-md:overflow-x-auto max-md:overscroll-x-contain max-md:px-0.5 max-md:pb-0.5 max-md:[-webkit-overflow-scrolling:touch] sm:mx-0 sm:overflow-visible">
                <div className="w-full min-w-[320px] sm:min-w-0">
              {/* Zero — case « bande » sur le tapis */}
              <div className="mb-2 flex justify-center">
                <div className="w-[min(100%,3.25rem)] sm:w-[min(100%,3.5rem)]">{numCell(0)}</div>
              </div>

              {/* 3×12 : pleine largeur comme grid-cols-12, + pistes fixes pour chevaux horizontaux */}
              <div
                className="mb-2 grid w-full rounded-sm bg-[#b8860b]/40 p-px shadow-inner"
                style={{
                  gridTemplateColumns:
                    "repeat(11, minmax(0, 1fr) clamp(0.4rem, 2vw, 0.75rem)) minmax(0, 1fr)",
                }}
              >
                {Array.from({ length: 12 }, (_, c) => {
                  const top = 3 + c * 3;
                  const mid = 2 + c * 3;
                  const bot = 1 + c * 3;
                  const topR = 3 + (c + 1) * 3;
                  const midR = 2 + (c + 1) * 3;
                  const botR = 1 + (c + 1) * 3;
                  const hkTop = `sp:${Math.min(top, topR)}-${Math.max(top, topR)}` as BetKey;
                  const hkMid = `sp:${Math.min(mid, midR)}-${Math.max(mid, midR)}` as BetKey;
                  const hkBot = `sp:${Math.min(bot, botR)}-${Math.max(bot, botR)}` as BetKey;
                  const stackCol = c * 2 + 1;
                  return (
                    <Fragment key={c}>
                      <div className="flex min-w-0 flex-col gap-px" style={{ gridColumn: stackCol }}>
                        {numCell(top)}
                        <button
                          type="button"
                          disabled={bettingDisabled}
                          className="relative h-4 min-h-[1rem] rounded-[1px] border border-emerald-800/40 bg-[#031910] hover:bg-[#0a3020] sm:h-5 sm:min-h-[1.15rem]"
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
                            disabled={bettingDisabled}
                            className="relative h-4 min-h-[1rem] rounded-[1px] border border-emerald-800/40 bg-[#031910] hover:bg-[#0a3020] sm:h-5 sm:min-h-[1.15rem]"
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
                      {c < 11 ? (
                        <div className="flex min-w-0 flex-col gap-px" style={{ gridColumn: stackCol + 1 }}>
                          <button
                            type="button"
                            disabled={bettingDisabled}
                            className="relative min-h-[2.55rem] w-full min-w-0 rounded-[2px] border border-amber-700/45 bg-[#031910] hover:bg-[#0a3020] sm:min-h-[3.15rem] md:min-h-[3.35rem]"
                            title={t("roulette.splitHorizontal")}
                            onClick={() => addToKey(hkTop, pendingStake)}
                          >
                            <PlacedChipsBadge amount={bets.get(hkTop) ?? 0} layout="thin" />
                          </button>
                          <div className="h-4 min-h-[1rem] shrink-0 sm:h-5 sm:min-h-[1.15rem]" aria-hidden />
                          <button
                            type="button"
                            disabled={bettingDisabled}
                            className="relative min-h-[2.55rem] w-full min-w-0 rounded-[2px] border border-amber-700/45 bg-[#031910] hover:bg-[#0a3020] sm:min-h-[3.15rem] md:min-h-[3.35rem]"
                            title={t("roulette.splitHorizontal")}
                            onClick={() => addToKey(hkMid, pendingStake)}
                          >
                            <PlacedChipsBadge amount={bets.get(hkMid) ?? 0} layout="thin" />
                          </button>
                          <div className="h-4 min-h-[1rem] shrink-0 sm:h-5 sm:min-h-[1.15rem]" aria-hidden />
                          <button
                            type="button"
                            disabled={bettingDisabled}
                            className="relative min-h-[2.55rem] w-full min-w-0 rounded-[2px] border border-amber-700/45 bg-[#031910] hover:bg-[#0a3020] sm:min-h-[3.15rem] md:min-h-[3.35rem]"
                            title={t("roulette.splitHorizontal")}
                            onClick={() => addToKey(hkBot, pendingStake)}
                          >
                            <PlacedChipsBadge amount={bets.get(hkBot) ?? 0} layout="thin" />
                          </button>
                        </div>
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>
                </div>
              </div>

              <div
                ref={dozensRef}
                className={`mb-2 grid grid-cols-3 gap-1 ${tutorialHighlightClass("dozens")}`}
              >
                <button
                  type="button"
                  disabled={bettingDisabled}
                  onClick={() => addToKey("d:1", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-1.5 pl-1.5 pr-6 font-serif text-[10px] font-bold leading-tight text-slate-200 hover:bg-slate-800/60 sm:py-2 sm:pl-2 sm:pr-7 sm:text-xs"
                >
                  {t("roulette.dozen1")}
                  <PlacedChipsBadge amount={bets.get("d:1") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={bettingDisabled}
                  onClick={() => addToKey("d:2", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-1.5 pl-1.5 pr-6 font-serif text-[10px] font-bold leading-tight text-slate-200 hover:bg-slate-800/60 sm:py-2 sm:pl-2 sm:pr-7 sm:text-xs"
                >
                  {t("roulette.dozen2")}
                  <PlacedChipsBadge amount={bets.get("d:2") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={bettingDisabled}
                  onClick={() => addToKey("d:3", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-1.5 pl-1.5 pr-6 font-serif text-[10px] font-bold leading-tight text-slate-200 hover:bg-slate-800/60 sm:py-2 sm:pl-2 sm:pr-7 sm:text-xs"
                >
                  {t("roulette.dozen3")}
                  <PlacedChipsBadge amount={bets.get("d:3") ?? 0} layout="corner" />
                </button>
              </div>

              <div
                ref={columnsRef}
                className={`mb-2 grid grid-cols-3 gap-1 ${tutorialHighlightClass("columns")}`}
              >
                <button
                  type="button"
                  disabled={bettingDisabled}
                  onClick={() => addToKey("col:1", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-1.5 pl-1.5 pr-6 font-serif text-[10px] font-bold leading-tight text-slate-200 hover:bg-slate-800/60 sm:py-2 sm:pl-2 sm:pr-7 sm:text-xs"
                >
                  {t("roulette.col1")}
                  <PlacedChipsBadge amount={bets.get("col:1") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={bettingDisabled}
                  onClick={() => addToKey("col:2", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-1.5 pl-1.5 pr-6 font-serif text-[10px] font-bold leading-tight text-slate-200 hover:bg-slate-800/60 sm:py-2 sm:pl-2 sm:pr-7 sm:text-xs"
                >
                  {t("roulette.col2")}
                  <PlacedChipsBadge amount={bets.get("col:2") ?? 0} layout="corner" />
                </button>
                <button
                  type="button"
                  disabled={bettingDisabled}
                  onClick={() => addToKey("col:3", pendingStake)}
                  className="relative rounded-sm border border-slate-500/50 bg-slate-900/45 py-1.5 pl-1.5 pr-6 font-serif text-[10px] font-bold leading-tight text-slate-200 hover:bg-slate-800/60 sm:py-2 sm:pl-2 sm:pr-7 sm:text-xs"
                >
                  {t("roulette.col3")}
                  <PlacedChipsBadge amount={bets.get("col:3") ?? 0} layout="corner" />
                </button>
              </div>

              <div
                ref={outsideRef}
                className={`mb-2 grid grid-cols-2 gap-1 sm:grid-cols-3 ${tutorialHighlightClass("outside")}`}
              >
                {(["red", "black", "even", "odd", "low", "high"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={bettingDisabled}
                    onClick={() => addToKey(k, pendingStake)}
                    className={`relative rounded-sm border-2 py-1.5 pl-1.5 pr-6 font-serif text-[10px] font-bold leading-tight transition hover:brightness-110 sm:py-2 sm:pl-2 sm:pr-7 sm:text-xs ${
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

              <details
                ref={advancedRef}
                open={tutorialMode && tutorialStep.highlight === "advanced" ? true : undefined}
                className={`rounded-md border border-slate-600 bg-slate-900/45 ${tutorialHighlightClass("advanced")}`}
              >
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
                        disabled={bettingDisabled}
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
                        disabled={bettingDisabled}
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
                          disabled={bettingDisabled}
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
                          disabled={bettingDisabled}
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
              ref={spinButtonRef}
              type="button"
              disabled={bettingDisabled || bets.size === 0}
              onClick={() => void spin()}
              className={`w-full py-4 text-lg font-black uppercase tracking-[0.1em] transition disabled:cursor-not-allowed disabled:opacity-45 ${tutorialHighlightClass("spin")} ${
                isRetro
                  ? "rounded-sm border-2 border-amber-400/55 bg-gradient-to-r from-red-700 via-orange-600 to-amber-500 font-serif text-white shadow-[0_0_34px_rgba(220,38,38,0.32)] hover:from-red-600 hover:via-orange-500 hover:to-amber-400"
                  : "rounded-full border border-amber-300/35 bg-amber-400/16 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_14px_34px_rgba(0,0,0,0.34),0_0_24px_rgba(245,158,11,0.10)] hover:border-amber-200/55 hover:bg-amber-400/24 hover:text-amber-50 disabled:border-white/10 disabled:bg-slate-800/60 disabled:text-slate-500 disabled:shadow-none"
              }`}
            >
              {spinning ? t("roulette.spinning") : t("roulette.spin")}
            </button>
            </div>
            </div>

            <div
              ref={wheelSectionRef}
              className={`order-1 flex w-full shrink-0 flex-col items-center scroll-mt-3 p-3 sm:p-4 md:scroll-mt-4 lg:order-2 lg:w-[min(100%,clamp(17rem,min(48vw,88vmin),36rem))] lg:max-w-[min(100%,clamp(17rem,min(48vw,88vmin),36rem))] lg:flex-none xl:p-5 ${isRetro ? retroPanel : `${modernPanel} shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)]`}`}
            >
              <div ref={wheelVisualRef} className={`w-full ${tutorialHighlightClass("wheel", "soft")}`}>
                <RouletteWheelSvg wheelOrder={wheelOrder} rotation={rotation} ballOrbit={ballOrbit} />
              </div>
              <div
                ref={resultRef}
                className={`mt-4 min-h-[2.75rem] w-full max-w-xs rounded-sm border px-4 py-2 text-center text-sm ${tutorialHighlightClass("result")} ${
                  isRetro
                    ? "border-amber-800/35 bg-[#12060c]/85 text-amber-100"
                    : "rounded-lg border-slate-600 bg-slate-900/60 text-slate-200"
                }`}
              >
                {lastResult !== null ? (
                  <span>
                    {t("roulette.lastResult", { n: lastResult })}
                    {lastColor ? (
                      <>
                        <span className="text-slate-500"> · </span>
                        <span className={rouletteResultColorWordClass(lastColor)}>
                          {t(`roulette.color.${lastColor}`)}
                        </span>
                      </>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-slate-500">{t("roulette.noSpinYet")}</span>
                )}
              </div>
              <button
                ref={historyRef}
                type="button"
                onClick={() => setHistoryOpen((open) => !open)}
                className={`mt-3 inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition sm:text-sm ${tutorialHighlightClass("history")} ${
                  historyOpen
                    ? "border-cyan-400/60 bg-cyan-500/10 text-cyan-100"
                    : "border-slate-600 bg-slate-900/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
                title={t("roulette.tabHistory")}
                aria-label={t("roulette.tabHistory")}
              >
                <History className="h-4 w-4 lg:hidden" aria-hidden />
                <span className="hidden lg:inline">{t("roulette.tabHistory")}</span>
              </button>
              {historyOpen ? (
                <div className="mt-3 max-h-80 w-full max-w-xl space-y-2.5 overflow-y-auto rounded-xl border border-slate-600/80 bg-slate-900/45 p-3 text-left shadow-lg">
                  {visibleSpinHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-500">{t("roulette.historyEmpty")}</p>
                  ) : (
                    visibleSpinHistory.map((entry) => {
                      const winningLines = entry.lines.filter((l) => l.payout > 0);
                      return (
                        <div
                          key={entry.id}
                          className="rounded-lg border border-slate-600/70 bg-slate-900/60 p-3 text-[11px] leading-snug text-slate-300 sm:text-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-semibold text-purple-200">{t("roulette.historySpin", { n: entry.spinIndex })}</p>
                            <span className="rounded-full border border-slate-500/60 bg-slate-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                              {t("roulette.historyResult", {
                                n: entry.result,
                                color: t(`roulette.color.${entry.resultColorKey}`),
                              })}
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2">
                            <div className="rounded-md border border-slate-700/80 bg-slate-950/40 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">{t("roulette.historyStakeLabel")}</p>
                              <p className="mt-0.5 font-semibold tabular-nums text-slate-100">{entry.totalStake}</p>
                            </div>
                            <div className="rounded-md border border-slate-700/80 bg-slate-950/40 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">{t("roulette.historyReturnsLabel")}</p>
                              <p className="mt-0.5 font-semibold tabular-nums text-slate-100">{entry.totalPayout}</p>
                            </div>
                            <div className="rounded-md border border-slate-700/80 bg-slate-950/40 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-wide text-slate-500">{t("roulette.historyNetLabel")}</p>
                              <p
                                className={`mt-0.5 font-semibold tabular-nums ${
                                  entry.net > 0 ? "text-green-400" : entry.net < 0 ? "text-rose-400" : "text-slate-100"
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
                          </div>

                          <div className="mt-2 rounded-md border border-slate-700/70 bg-slate-950/30 px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {t("roulette.historyBetsLabel")}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {entry.lines.map((l, index) => (
                                <span
                                  key={`${entry.id}-bet-${index}-${l.label}`}
                                  className="rounded-full border border-slate-700/80 bg-slate-900/70 px-2 py-0.5 text-[10px] text-slate-200"
                                >
                                  {t("roulette.historyBetChip", { stake: l.stake, label: l.label })}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-2 rounded-md border border-slate-700/70 bg-slate-950/30 px-2.5 py-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {t("roulette.historyPayoutsLabel")}
                            </p>
                            {winningLines.length === 0 ? (
                              <p className="mt-1 text-[10px] text-slate-400">{t("roulette.historyNoPayout")}</p>
                            ) : (
                              <div className="mt-1 space-y-1">
                                {winningLines.map((l, index) => (
                                  <p key={`${entry.id}-payout-${index}-${l.label}`} className="text-[10px] text-slate-300 sm:text-[11px]">
                                    {t("roulette.historyPayoutWin", {
                                      label: l.label,
                                      stake: l.stake,
                                      mult: l.mult,
                                      payout: l.payout,
                                    })}
                                  </p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </CustomScrollArea>
      {!tutorialMode ? (
        <button
          type="button"
          onClick={() => navigate("/tutorial/roulette")}
          className="fixed left-5 z-[260] flex h-12 w-12 items-center justify-center rounded-full border-2 border-purple-400/90 bg-purple-950/95 text-lg font-bold text-purple-100 shadow-xl backdrop-blur-sm transition hover:border-purple-300 hover:bg-purple-800/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
          aria-label={t("roulette.tutorial.open")}
          title={t("roulette.tutorial.open")}
        >
          <span aria-hidden className="select-none">?</span>
        </button>
      ) : null}
      {tutorialMode ? (
        <TutorialSpotlight
          open
          onClose={closeRouletteTutorial}
          targetRef={tutorialTargetRef}
          measureKey={`${tutorialStepIndex}-${tutorialStep.highlight ?? "center"}-${historyOpen}`}
          color="amber"
          presentation="emphasis"
          tooltipWidth={380}
          tooltipHeight={360}
          spotlightPadding={14}
          scrollBlock="center"
          ariaLabelledBy="roulette-tutorial-title"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                {t("roulette.tutorial.stepCounter", {
                  current: tutorialStepIndex + 1,
                  total: ROULETTE_TUTORIAL_STEPS.length,
                })}
              </p>
              <h2 id="roulette-tutorial-title" className="mt-1 text-lg font-black text-slate-50">
                {t(tutorialStep.titleKey)}
              </h2>
            </div>
            <button
              type="button"
              onClick={closeRouletteTutorial}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-950/60 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              aria-label={t("roulette.tutorial.close")}
              title={t("roulette.tutorial.close")}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{t(tutorialStep.bodyKey)}</p>
          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setTutorialStepIndex((i) => Math.max(0, i - 1))}
              disabled={tutorialStepIndex === 0}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-950/60 px-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
              {t("roulette.tutorial.prev")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (tutorialDone) closeRouletteTutorial();
                else setTutorialStepIndex((i) => Math.min(ROULETTE_TUTORIAL_STEPS.length - 1, i + 1));
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/15 px-4 text-sm font-black text-amber-100 transition hover:bg-amber-400/25"
            >
              {tutorialDone ? t("roulette.tutorial.finish") : t("roulette.tutorial.next")}
              {!tutorialDone ? <ChevronRight className="h-4 w-4" /> : null}
            </button>
          </div>
        </TutorialSpotlight>
      ) : null}
    </div>
  );
}
