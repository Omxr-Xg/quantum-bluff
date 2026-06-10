import {
  WHEEL_SEGMENT_COUNT,
  WHEEL_SLICE_RAD,
  wheelRotationRadForSegmentAtPointer,
  wheelSegmentIndexAtPointerRad,
} from "./wheelMath";

const NUM = WHEEL_SEGMENT_COUNT;
const SLICE = WHEEL_SLICE_RAD;

export type WheelSpinAnimationHandle = {
  cancel: () => void;
};

export function runWheelSpinAnimation(options: {
  startRotationRad: number;
  targetSegmentIndex: number;
  onFrame: (rotationRad: number, pointerDeflect: number) => void;
  onComplete: (finalRotationRad: number) => void;
}): WheelSpinAnimationHandle {
  const { startRotationRad, targetSegmentIndex, onFrame, onComplete } = options;

  let rafId = 0;
  let cancelled = false;

  const segMidAngle = targetSegmentIndex * SLICE + SLICE / 2;
  const currentNorm = ((startRotationRad % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  // rot = start - totalDelta ; atterrissage : rot ≡ -segMidAngle (mod 2π), segment 0 en haut.
  const shortDelta =
    (((currentNorm + segMidAngle) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const extraSpins = (6 + Math.random() * 4) * 2 * Math.PI;
  const totalDelta = extraSpins + shortDelta;

  const duration = 4000 + Math.random() * 1500;
  const friction = 0.00085 + Math.random() * 0.0003;
  const v0 = (totalDelta * friction) / (1 - Math.exp(-friction * duration));

  const startRotation = startRotationRad;
  const startTime = performance.now();
  let lastTickSeg = -1;
  let tickDecay: { start: number; from: number } | null = null;
  let pointerDeflect = 0;

  const tickDecayStep = (now: number) => {
    if (!tickDecay) return;
    const elapsed = now - tickDecay.start;
    const dur = 80;
    if (elapsed >= dur) {
      pointerDeflect = 0;
      tickDecay = null;
      return;
    }
    const t = elapsed / dur;
    pointerDeflect = tickDecay.from * (1 - t);
  };

  const frame = (now: number) => {
    if (cancelled) return;

    const elapsed = now - startTime;
    const traveled = (v0 / friction) * (1 - Math.exp(-friction * elapsed));
    const currentVel = v0 * Math.exp(-friction * elapsed);
    const rot = startRotation - traveled;

    const currentSeg = wheelSegmentIndexAtPointerRad(rot);
    if (currentSeg !== lastTickSeg && lastTickSeg !== -1) {
      const speedFactor = Math.min(1, currentVel / (v0 * 0.1));
      pointerDeflect = 0.6 + speedFactor * 0.4;
      tickDecay = { start: now, from: pointerDeflect };
    }
    lastTickSeg = currentSeg;
    tickDecayStep(now);

    onFrame(rot, pointerDeflect);

    if (elapsed < duration && currentVel > 0.0001) {
      rafId = requestAnimationFrame(frame);
      return;
    }

    const rawFinal = startRotation - totalDelta;
    const targetBase = wheelRotationRadForSegmentAtPointer(targetSegmentIndex);
    const fullTurns = Math.round((rawFinal - targetBase) / (2 * Math.PI));
    const snappedRot = targetBase + fullTurns * 2 * Math.PI;

    const settleStart = performance.now();
    const settleDuration = 350;

    const settleAnim = (t2: number) => {
      if (cancelled) return;
      const st = Math.min((t2 - settleStart) / settleDuration, 1);
      const amp = SLICE * 0.06 * (1 - st);
      const osc = amp * Math.sin(st * Math.PI * 4) * Math.exp(-st * 6);
      pointerDeflect = Math.max(0, 0.8 * (1 - st * 2));
      tickDecayStep(t2);
      onFrame(snappedRot + osc, pointerDeflect);
      if (st < 1) {
        rafId = requestAnimationFrame(settleAnim);
      } else {
        onFrame(snappedRot, 0);
        onComplete(snappedRot);
      }
    };
    rafId = requestAnimationFrame(settleAnim);
  };

  rafId = requestAnimationFrame(frame);

  return {
    cancel: () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    },
  };
}
