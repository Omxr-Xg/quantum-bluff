import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const PLAY_AREA_MIN = 10;
const PLAY_AREA_MAX = 78;
const SPAWN_MIN_MS = 550;
const SPAWN_MAX_MS = 1700;

function randomInRange(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function TournamentWaitingZipGame() {
  const { t } = useTranslation();
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState<{ left: number; top: number } | null>(null);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const clearSpawn = useCallback(() => {
    if (spawnTimerRef.current != null) {
      clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
  }, []);

  const scheduleNext = useCallback(() => {
    clearSpawn();
    const delay = randomInRange(SPAWN_MIN_MS, SPAWN_MAX_MS);
    spawnTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setTarget({
        left: randomInRange(PLAY_AREA_MIN, PLAY_AREA_MAX),
        top: randomInRange(PLAY_AREA_MIN, PLAY_AREA_MAX),
      });
    }, delay);
  }, [clearSpawn]);

  useEffect(() => {
    mountedRef.current = true;
    scheduleNext();
    return () => {
      mountedRef.current = false;
      clearSpawn();
    };
  }, [scheduleNext, clearSpawn]);

  const onHit = () => {
    setScore((s) => s + 1);
    setTarget(null);
    scheduleNext();
  };

  const onRestart = () => {
    clearSpawn();
    setScore(0);
    setTarget(null);
    scheduleNext();
  };

  return (
    <div className="bg-slate-700/80 rounded-xl p-4 text-left border border-slate-600/80">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <h2 className="text-white font-semibold text-sm">{t('tournament.waiting.zipTitle')}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{t('tournament.waiting.zipHint')}</p>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="shrink-0 text-xs text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
        >
          {t('tournament.waiting.zipRestart')}
        </button>
      </div>
      <p className="text-slate-300 text-sm font-medium mb-2 tabular-nums">
        {t('tournament.waiting.zipScore', { score })}
      </p>
      <div
        className="relative w-full min-h-[220px] rounded-lg bg-slate-900/60 border border-slate-600/50 overflow-hidden touch-manipulation"
        aria-label={t('tournament.waiting.zipHint')}
      >
        {target && (
          <button
            type="button"
            onClick={onHit}
            className="absolute min-w-[4.5rem] px-3 py-2 rounded-lg bg-amber-500 text-slate-900 font-bold text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-transform select-none"
            style={{
              left: `${target.left}%`,
              top: `${target.top}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {t('tournament.waiting.zipTarget')}
          </button>
        )}
      </div>
    </div>
  );
}
