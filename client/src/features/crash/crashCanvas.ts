import { CRASH_GROWTH_RATE } from "./crashMath";

const CURVE_POINTS = 200;

export function getCrashMultiplierColor(m: number): string {
  if (m < 2) return "#60efff";
  if (m < 5) return "#a78bfa";
  if (m < 10) return "#f59e0b";
  return "#f43f5e";
}

export function historyPillStyle(mult: number): { background: string; color: string; border: string } {
  if (mult < 2) {
    return {
      background: "rgba(244,63,94,0.15)",
      color: "#f43f5e",
      border: "1px solid rgba(244,63,94,0.3)",
    };
  }
  if (mult < 5) {
    return {
      background: "rgba(96,239,255,0.12)",
      color: "#60efff",
      border: "1px solid rgba(96,239,255,0.2)",
    };
  }
  if (mult < 10) {
    return {
      background: "rgba(167,139,250,0.15)",
      color: "#a78bfa",
      border: "1px solid rgba(167,139,250,0.25)",
    };
  }
  return {
    background: "rgba(245,158,11,0.15)",
    color: "#f59e0b",
    border: "1px solid rgba(245,158,11,0.3)",
  };
}

function multiplierAtCurveT(t: number, displayMaxMult: number): number {
  const maxT = Math.log(Math.max(displayMaxMult, 1.01)) / CRASH_GROWTH_RATE;
  const elapsedSec = t * maxT;
  return Math.exp(CRASH_GROWTH_RATE * elapsedSec);
}

/** Progression 0–1 le long de la courbe — dérivée du multiplicateur affiché (pas d’horloge locale). */
export function crashCurveProgress(
  _elapsedMs: number,
  currentMult: number,
  crashPoint: number | null,
  crashed: boolean,
): number {
  if (crashed) return 1;
  if (currentMult <= 1) return 0;
  const elapsedSec = Math.log(currentMult) / CRASH_GROWTH_RATE;
  const targetMult = crashPoint ?? Math.max(currentMult * 1.2, 2.5);
  const totalSec = Math.log(Math.max(targetMult, 1.01)) / CRASH_GROWTH_RATE;
  return Math.min(0.98, elapsedSec / Math.max(totalSec, 0.35));
}

export function drawCrashCanvas(
  canvas: HTMLCanvasElement,
  progress: number,
  currentMult: number,
  crashed: boolean,
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y <= H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  if (progress <= 0) return;

  const displayMax = Math.max(currentMult, 1.5);
  const pts: [number, number][] = [];
  const steps = Math.floor(CURVE_POINTS * Math.min(progress, 1));
  for (let i = 0; i <= steps; i++) {
    const t = i / CURVE_POINTS;
    const m = multiplierAtCurveT(t, displayMax);
    const px = W * 0.1 + t * (W * 0.85);
    const py = H - 40 - Math.min((m - 1) / (displayMax - 1 + 0.001), 1) * (H - 80);
    pts.push([px, py]);
  }

  if (pts.length < 2) return;

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  if (crashed) {
    grad.addColorStop(0, "rgba(244,63,94,0.35)");
    grad.addColorStop(1, "rgba(244,63,94,0.02)");
  } else {
    grad.addColorStop(0, "rgba(96,239,255,0.25)");
    grad.addColorStop(1, "rgba(96,239,255,0.02)");
  }

  ctx.beginPath();
  ctx.moveTo(pts[0][0], H - 40);
  pts.forEach(([px, py]) => ctx.lineTo(px, py));
  ctx.lineTo(pts[pts.length - 1][0], H - 40);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  const lineColor = crashed ? "#f43f5e" : "#60efff";
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 16;
  ctx.shadowColor = lineColor;
  ctx.stroke();
  ctx.shadowBlur = 0;

  const [rx, ry] = pts[pts.length - 1];
  if (!crashed) {
    const prev = pts[Math.max(0, pts.length - 3)];
    const angle = Math.atan2(ry - prev[1], rx - prev[0]);
    const flameT = Date.now() / 80;

    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(angle);

    const fl1 = ctx.createRadialGradient(
      -28 + Math.sin(flameT) * 3,
      0,
      1,
      -20,
      0,
      26 + Math.sin(flameT * 1.3) * 4,
    );
    fl1.addColorStop(0, "rgba(255,240,120,1)");
    fl1.addColorStop(0.3, "rgba(255,140,20,0.85)");
    fl1.addColorStop(0.7, "rgba(220,50,20,0.5)");
    fl1.addColorStop(1, "rgba(200,30,0,0)");
    ctx.fillStyle = fl1;
    ctx.beginPath();
    ctx.ellipse(-22 + Math.sin(flameT) * 2, 0, 20 + Math.sin(flameT * 0.9) * 3, 7 + Math.cos(flameT) * 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const wingGrad = ctx.createLinearGradient(-12, -20, 0, -8);
    wingGrad.addColorStop(0, "#4c1d95");
    wingGrad.addColorStop(1, "#7c3aed");
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-16, -22);
    ctx.lineTo(-6, -16);
    ctx.lineTo(-2, -9);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 8);
    ctx.lineTo(-16, 22);
    ctx.lineTo(-6, 16);
    ctx.lineTo(-2, 9);
    ctx.closePath();
    ctx.fill();

    const bodyGrad = ctx.createLinearGradient(-14, -10, 14, 10);
    bodyGrad.addColorStop(0, "#c4b5fd");
    bodyGrad.addColorStop(0.35, "#818cf8");
    bodyGrad.addColorStop(0.7, "#4338ca");
    bodyGrad.addColorStop(1, "#312e81");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    const wGrad = ctx.createRadialGradient(3, -1, 0, 3, 0, 5.5);
    wGrad.addColorStop(0, "#7dd3fc");
    wGrad.addColorStop(0.5, "#0284c7");
    wGrad.addColorStop(1, "#0c4a6e");
    ctx.fillStyle = wGrad;
    ctx.beginPath();
    ctx.arc(3, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#60efff";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const noseGrad = ctx.createLinearGradient(10, -8, 22, 0);
    noseGrad.addColorStop(0, "#fb7185");
    noseGrad.addColorStop(1, "#be123c");
    ctx.fillStyle = noseGrad;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(10, -7);
    ctx.lineTo(10, 7);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    const halo = ctx.createRadialGradient(
      rx + Math.cos(angle + Math.PI) * 28,
      ry + Math.sin(angle + Math.PI) * 28,
      0,
      rx,
      ry,
      55,
    );
    halo.addColorStop(0, "rgba(251,146,60,0.35)");
    halo.addColorStop(0.4, "rgba(124,58,237,0.12)");
    halo.addColorStop(1, "rgba(96,239,255,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(rx, ry, 55, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const t = Date.now() / 300;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + t;
      const r = 20 + Math.sin(t * 3 + i) * 8;
      const eg = ctx.createRadialGradient(
        rx + Math.cos(a) * r,
        ry + Math.sin(a) * r,
        0,
        rx,
        ry,
        50,
      );
      eg.addColorStop(0, "rgba(255,150,0,0.8)");
      eg.addColorStop(1, "rgba(244,63,94,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(rx + Math.cos(a) * r, ry + Math.sin(a) * r, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
