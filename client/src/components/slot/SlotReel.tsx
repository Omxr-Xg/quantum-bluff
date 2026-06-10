import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SlotSymbol } from "./SlotSymbols";
import type { SlotSymbolId } from "../../features/slot/slotTypes";
import { SLOT_SYMBOLS } from "../../features/slot/slotTypes";

const SYM_H = 100;
const VISIBLE = 3;

function randSymbol(): SlotSymbolId {
  return SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]!;
}

function buildStrip(target: SlotSymbolId): SlotSymbolId[] {
  const strip: SlotSymbolId[] = Array.from({ length: 30 }, () => randSymbol());
  strip[strip.length - 2] = target;
  return strip;
}

type SlotReelProps = {
  target: SlotSymbolId;
  spinning: boolean;
  delay: number;
  onStop: () => void;
  lit: boolean;
};

export function SlotReel({ target, spinning, delay, onStop, lit }: SlotReelProps) {
  const [strip, setStrip] = useState<SlotSymbolId[]>(() => buildStrip(target));
  const [yOffset, setYOffset] = useState(() => (buildStrip(target).length - VISIBLE) * SYM_H);
  const rafRef = useRef<number>(0);
  const stopped = useRef(false);

  useEffect(() => {
    if (!spinning) return;
    stopped.current = false;
    const newStrip = buildStrip(target);
    setStrip(newStrip);

    const spinMs = 1400 + delay * 450;
    let start = 0;
    let currentOffset = 0;
    setYOffset(0);

    const tick = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start - delay * 200;
      if (elapsed < 0) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(elapsed / spinMs, 1);
      const eased = progress < 0.85 ? progress : 0.85 + (progress - 0.85) * 0.3;
      currentOffset = eased * (newStrip.length - VISIBLE) * SYM_H * (1 / 0.85);
      const pos = Math.min(currentOffset, (newStrip.length - VISIBLE) * SYM_H);
      setYOffset(pos);

      if (elapsed >= spinMs && !stopped.current) {
        stopped.current = true;
        setYOffset((newStrip.length - VISIBLE) * SYM_H);
        onStop();
        return;
      }
      if (!stopped.current) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [delay, onStop, spinning, target]);

  const windowH = SYM_H * VISIBLE;
  const ty = -yOffset;

  return (
    <div className="relative overflow-hidden" style={{ width: 96, height: windowH }}>
      <AnimatePresence>
        {lit ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 rounded-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 1, 0.4], transition: { duration: 0.8, repeat: Infinity } }}
            exit={{ opacity: 0 }}
            style={{ boxShadow: "inset 0 0 20px rgba(212,168,67,0.9), 0 0 20px rgba(212,168,67,0.5)" }}
          />
        ) : null}
      </AnimatePresence>

      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.65) 100%)",
        }}
      />

      <div
        className="pointer-events-none absolute left-0 right-0 z-10"
        style={{
          top: SYM_H,
          height: SYM_H,
          background: "rgba(212,168,67,0.03)",
          borderTop: "1px solid rgba(212,168,67,0.18)",
          borderBottom: "1px solid rgba(212,168,67,0.18)",
        }}
      />

      <div style={{ transform: `translateY(${ty}px)`, willChange: "transform" }}>
        {strip.map((sym, i) => (
          <div
            key={`${sym}-${i}`}
            style={{
              width: 96,
              height: SYM_H,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SlotSymbol id={sym} size={74} lit={lit && i === strip.length - 2} />
          </div>
        ))}
      </div>
    </div>
  );
}
