/**
 * Incréments de relance affichés dans le popover (montant **en plus** du call).
 * Alignés sur la grosse blind : min légal, puis +BB, +2·BB, … jusqu’au tapis.
 */
export function buildRaiseIncrementPresets(
  minIncrement: number,
  maxRaise: number,
  bigBlindStep: number,
): number[] {
  const minInc = Math.max(1, Math.floor(minIncrement));
  const maxR = Math.max(0, Math.floor(maxRaise));
  if (maxR <= 0) return [];
  if (minInc >= maxR) return [maxR];

  const step = Math.max(1, Math.floor(bigBlindStep));
  const out: number[] = [minInc];
  let last = minInc;
  const maxButtons = 8;

  while (out.length < maxButtons) {
    const next = last + step;
    if (next >= maxR) break;
    if (next > out[out.length - 1]!) out.push(next);
    last = next;
  }

  if (out[out.length - 1] !== maxR) out.push(maxR);
  return [...new Set(out)].sort((a, b) => a - b);
}
