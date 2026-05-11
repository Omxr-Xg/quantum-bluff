import { useMemo, useState } from "react";

/** Mini-jeu client-only (placeholder léger). */
export function ZipRushMiniGame({ paused }: { paused: boolean }) {
  const [score, setScore] = useState(0);
  const label = useMemo(() => (paused ? "Pause" : "Zip Rush"), [paused]);
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4 text-center text-sm text-white/80">
      <div className="mb-2 font-medium text-white">{label}</div>
      <button
        type="button"
        disabled={paused}
        className="rounded-lg bg-cyan-600/80 px-4 py-2 text-white disabled:opacity-40"
        onClick={() => setScore((s) => s + 1)}
      >
        +1
      </button>
      <div className="mt-2 text-xs">Score {score}</div>
    </div>
  );
}
