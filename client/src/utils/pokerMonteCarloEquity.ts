import {
  buildDeckExcluding,
  evaluateSevenEval,
  toEvalCards,
  type EvalCard,
} from "./pokerHandCategory";

/** Équilibre précision / coût pour le HUD (main thread). */
export const MONTE_CARLO_DEFAULT_ITERATIONS = 2000;

function drawWithoutReplacement(deck: EvalCard[], n: number): EvalCard[] {
  if (n > deck.length) {
    throw new Error("drawWithoutReplacement: sample larger than deck");
  }
  const a = deck.slice();
  const len = a.length;
  const out: EvalCard[] = [];
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(Math.random() * (len - i));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
    out.push(a[i]);
  }
  return out;
}

export interface MonteCarloEquityResult {
  /** Part du pot attendue (0–1), parts égales en cas d’égalité de meilleure main. */
  equity: number;
  /** Histogramme des catégories 0–9 au showdown simulé. */
  categoryCounts: number[];
  iterations: number;
}

/**
 * Équité hero vs `opponentCount` adversaires avec trous aléatoires (cartes inconnues),
 * board complété aléatoirement jusqu’à 5 cartes. Évaluateur aligné sur le serveur.
 */
export function estimateEquityMonteCarlo(
  playerCards: { suit: string; value: string }[],
  communityCards: ({ suit: string; value: string } | null)[],
  opponentCount: number,
  iterations: number = MONTE_CARLO_DEFAULT_ITERATIONS,
): MonteCarloEquityResult {
  const categoryCounts = Array.from({ length: 10 }, () => 0);
  if (playerCards.length < 2) {
    return { equity: 0, categoryCounts, iterations: 0 };
  }

  const comm = communityCards.filter(
    (c): c is { suit: string; value: string } => c != null,
  );
  const known = [...playerCards, ...comm];
  const deck = buildDeckExcluding(known);
  const heroEval = toEvalCards(playerCards);
  const boardPrefix = toEvalCards(comm);
  const boardSlots = Math.max(0, 5 - boardPrefix.length);
  const opp = Math.max(0, opponentCount);
  const need = boardSlots + 2 * opp;

  if (need > deck.length || iterations <= 0) {
    return { equity: 0, categoryCounts, iterations: 0 };
  }

  let equitySum = 0;

  for (let it = 0; it < iterations; it++) {
    const drawn = drawWithoutReplacement(deck, need);
    const board = [...boardPrefix, ...drawn.slice(0, boardSlots)];
    const holesFlat = drawn.slice(boardSlots);

    const heroSeven = [...heroEval, ...board];
    const heroResult = evaluateSevenEval(heroSeven);
    categoryCounts[heroResult.category]++;

    const heroScore = heroResult.score;
    let best = heroScore;
    const scores: number[] = [heroScore];

    for (let o = 0; o < opp; o++) {
      const s = evaluateSevenEval([
        holesFlat[o * 2],
        holesFlat[o * 2 + 1],
        ...board,
      ]).score;
      scores.push(s);
      if (s > best) best = s;
    }

    const nWinners = scores.filter((s) => s === best).length;
    if (scores[0] === best) equitySum += 1 / nWinners;
  }

  return {
    equity: equitySum / iterations,
    categoryCounts,
    iterations,
  };
}
