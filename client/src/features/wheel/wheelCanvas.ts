import { WHEEL_SEGMENTS } from "./wheelMath";
import { getWheelSegmentVisual } from "./wheelVisuals";

function lighten(hex: string, amt: number): string {
  const c = Number.parseInt(hex.slice(1), 16);
  const r = Math.min(255, (c >> 16) + Math.round(amt * 80));
  const g = Math.min(255, ((c >> 8) & 0xff) + Math.round(amt * 80));
  const b = Math.min(255, (c & 0xff) + Math.round(amt * 80));
  return `rgb(${r},${g},${b})`;
}

function darken(hex: string, amt: number): string {
  const c = Number.parseInt(hex.slice(1), 16);
  const r = Math.max(0, (c >> 16) - Math.round(amt * 60));
  const g = Math.max(0, ((c >> 8) & 0xff) - Math.round(amt * 60));
  const b = Math.max(0, (c & 0xff) - Math.round(amt * 60));
  return `rgb(${r},${g},${b})`;
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(0,240,255,0.04)";
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x < w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  rotation: number,
) {
  const num = WHEEL_SEGMENTS.length;
  const slice = (2 * Math.PI) / num;

  const outerGlow = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r + 18);
  outerGlow.addColorStop(0, "rgba(200,168,76,0.0)");
  outerGlow.addColorStop(0.5, "rgba(200,168,76,0.25)");
  outerGlow.addColorStop(1, "rgba(200,168,76,0.0)");
  ctx.beginPath();
  ctx.arc(cx, cy, r + 18, 0, 2 * Math.PI);
  ctx.fillStyle = outerGlow;
  ctx.fill();

  for (let i = 0; i < num; i++) {
    const seg = getWheelSegmentVisual(WHEEL_SEGMENTS[i]!);
    const startAngle = rotation + i * slice;
    const endAngle = startAngle + slice;
    const midAngle = startAngle + slice / 2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();

    const gx = cx + Math.cos(midAngle) * r * 0.5;
    const gy = cy + Math.sin(midAngle) * r * 0.5;
    const grad = ctx.createRadialGradient(cx, cy, 0, gx, gy, r);
    grad.addColorStop(0, lighten(seg.color, 0.3));
    grad.addColorStop(0.5, seg.color);
    grad.addColorStop(1, darken(seg.color, 0.4));
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = seg.glow;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = seg.glow;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(midAngle);
    const textR = r * 0.65;
    ctx.translate(textR, 0);

    if (seg.label === "JACKPOT") {
      ctx.font = `bold ${Math.floor(r * 0.085)}px ui-monospace, monospace`;
    } else if (seg.multiplier === 0) {
      ctx.font = `${Math.floor(r * 0.07)}px ui-monospace, monospace`;
    } else {
      ctx.font = `bold ${Math.floor(r * 0.11)}px ui-monospace, monospace`;
    }

    ctx.fillStyle = seg.text;
    ctx.shadowColor = seg.glow;
    ctx.shadowBlur = 14;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(seg.label, 0, 0);
    ctx.restore();
  }

  for (let i = 0; i < num; i++) {
    const angle = rotation + i * slice;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
    ctx.strokeStyle = "rgba(200,168,76,0.6)";
    ctx.lineWidth = 1.5;
    ctx.shadowColor = "#C9A84C";
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.restore();
  }

  const rimGrad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  rimGrad.addColorStop(0, "#8a6a10");
  rimGrad.addColorStop(0.25, "#f0d060");
  rimGrad.addColorStop(0.5, "#C9A84C");
  rimGrad.addColorStop(0.75, "#f0d060");
  rimGrad.addColorStop(1, "#8a6a10");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, 2 * Math.PI);
  ctx.strokeStyle = rimGrad;
  ctx.lineWidth = 6;
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.restore();

  const boltCount = 16;
  for (let i = 0; i < boltCount; i++) {
    const angle = ((2 * Math.PI * i) / boltCount) + rotation * 0.1;
    const bx = cx + Math.cos(angle) * (r - 4);
    const by = cy + Math.sin(angle) * (r - 4);
    ctx.save();
    ctx.beginPath();
    ctx.arc(bx, by, 3.5, 0, 2 * Math.PI);
    const boltGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 3.5);
    boltGrad.addColorStop(0, "#fff8d0");
    boltGrad.addColorStop(1, "#8a6a10");
    ctx.fillStyle = boltGrad;
    ctx.shadowColor = "#FFD700";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }

  const hubR = r * 0.14;
  const hubGrad = ctx.createRadialGradient(cx - hubR * 0.3, cy - hubR * 0.3, 1, cx, cy, hubR);
  hubGrad.addColorStop(0, "#fff8d0");
  hubGrad.addColorStop(0.4, "#C9A84C");
  hubGrad.addColorStop(1, "#3a2800");
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, hubR, 0, 2 * Math.PI);
  ctx.fillStyle = hubGrad;
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.strokeStyle = "#FFD700";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, hubR * 0.55, 0, 2 * Math.PI);
  ctx.strokeStyle = "rgba(255,255,255,0.4)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawPointer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  size: number,
  deflect = 0,
) {
  ctx.save();
  const py = top + 2 + deflect * size * 0.6;

  const glowIntensity = 0.35 + Math.abs(deflect) * 0.5;
  const g = ctx.createRadialGradient(cx, py + size * 0.6, 2, cx, py + size * 0.6, size * 1.8);
  g.addColorStop(0, `rgba(255,215,0,${glowIntensity})`);
  g.addColorStop(0.5, `rgba(255,215,0,${glowIntensity * 0.3})`);
  g.addColorStop(1, "rgba(255,215,0,0)");
  ctx.beginPath();
  ctx.arc(cx, py + size * 0.6, size * 1.8, 0, 2 * Math.PI);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx, py + size * 1.4);
  ctx.lineTo(cx - size * 0.55, py);
  ctx.lineTo(cx + size * 0.55, py);
  ctx.closePath();

  const pg = ctx.createLinearGradient(cx - size * 0.55, py, cx + size * 0.55, py + size * 1.4);
  pg.addColorStop(0, "#fff8d0");
  pg.addColorStop(0.3, "#FFD700");
  pg.addColorStop(1, "#8a5a00");
  ctx.fillStyle = pg;
  ctx.shadowColor = "#FFD700";
  ctx.shadowBlur = deflect !== 0 ? 28 : 18;
  ctx.fill();
  ctx.strokeStyle = "#fff8d0";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

export function renderWheelFrame(
  canvas: HTMLCanvasElement,
  dims: { w: number; h: number },
  rotationRad: number,
  pointerDeflect = 0,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { w, h } = dims;
  const dpr = window.devicePixelRatio || 1;
  ctx.clearRect(0, 0, w * dpr, h * dpr);
  ctx.save();
  ctx.scale(dpr, dpr);

  drawGrid(ctx, w, h);

  const padding = 36;
  const cx = w / 2;
  const cy = h / 2 + 10;
  const r = Math.min(w, h) / 2 - padding;

  drawWheel(ctx, cx, cy, r, rotationRad);
  drawPointer(ctx, cx, cy - r - padding + 4, 14, pointerDeflect);

  ctx.restore();
}

export function resizeWheelCanvas(canvas: HTMLCanvasElement, dims: { w: number; h: number }) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = dims.w * dpr;
  canvas.height = dims.h * dpr;
  canvas.style.width = `${dims.w}px`;
  canvas.style.height = `${dims.h}px`;
}
