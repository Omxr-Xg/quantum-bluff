import type { WheelSegmentDef } from "./wheelMath";

export type WheelSegmentVisual = {
  label: string;
  multiplier: number;
  color: string;
  glow: string;
  text: string;
};

const KIND_VISUAL: Record<string, Omit<WheelSegmentVisual, "label" | "multiplier">> = {
  x0: { color: "#0a0a12", glow: "#FF2E4C", text: "#FF2E4C" },
  x0_5: { color: "#1a1008", glow: "#FF8800", text: "#FF8800" },
  x1: { color: "#0b1a3a", glow: "#4488FF", text: "#4488FF" },
  x1_5: { color: "#0d0a1f", glow: "#AA44FF", text: "#AA44FF" },
  x2: { color: "#0b1a3a", glow: "#4488FF", text: "#4488FF" },
  x3: { color: "#0d0a1f", glow: "#AA44FF", text: "#AA44FF" },
  x5: { color: "#0a2218", glow: "#00FFB2", text: "#00FFB2" },
  jackpot: { color: "#1a0033", glow: "#EE00FF", text: "#EE00FF" },
};

export function getWheelSegmentVisual(seg: WheelSegmentDef): WheelSegmentVisual {
  const base = KIND_VISUAL[seg.kind] ?? KIND_VISUAL.x1!;
  const label = seg.kind === "x0" ? "VOID" : seg.label;
  return { label, multiplier: seg.multiplier, ...base };
}

/** Entrées uniques pour le panneau gains (par kind). */
export function uniquePaytableEntries(segments: readonly WheelSegmentDef[]): WheelSegmentVisual[] {
  const seen = new Set<string>();
  const out: WheelSegmentVisual[] = [];
  for (const seg of segments) {
    if (seen.has(seg.kind)) continue;
    seen.add(seg.kind);
    out.push(getWheelSegmentVisual(seg));
  }
  return out;
}
