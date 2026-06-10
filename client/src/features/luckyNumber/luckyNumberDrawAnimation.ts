import { LUCKY_NUMBER_MAX } from "./luckyNumberMath";

/** Animation du numéro maison pendant le tirage (résultat serveur à la fin). */
export function runLuckyNumberHouseDrawAnimation(
  finalNumber: number,
  onHouseTick: (n: number) => void,
  durationMs = 1800,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now();
    let lastShown = -1;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - (1 - t) ** 3;

      if (t < 1) {
        const intervalMs = 40 + eased * 220;
        const frame = Math.floor(elapsed / intervalMs);
        if (frame !== lastShown) {
          lastShown = frame;
          onHouseTick(Math.floor(Math.random() * LUCKY_NUMBER_MAX) + 1);
        }
        requestAnimationFrame(tick);
        return;
      }

      onHouseTick(finalNumber);
      resolve();
    };

    requestAnimationFrame(tick);
  });
}
