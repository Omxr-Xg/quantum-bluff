/**
 * Démarre un polling avec décalage initial pour éviter les rafales au chargement
 * (plusieurs onglets / refresh → toutes les requêtes au même instant).
 */
export function startStaggeredPolling(
  fn: () => void | Promise<void>,
  intervalMs: number,
  options?: { initialDelayMs?: number },
): () => void {
  const stagger =
    options?.initialDelayMs ??
    Math.floor(Math.random() * Math.min(intervalMs * 0.6, 2500));

  let intervalId: ReturnType<typeof setInterval> | null = null;

  const kick = () => {
    void fn();
  };

  const startInterval = () => {
    intervalId = setInterval(kick, intervalMs);
  };

  const initialTimer = setTimeout(() => {
    kick();
    startInterval();
  }, stagger);

  return () => {
    clearTimeout(initialTimer);
    if (intervalId) clearInterval(intervalId);
  };
}

/** N’affiche l’erreur qu’après plusieurs échecs consécutifs si des données existent déjà. */
export function shouldShowPollError(hasData: boolean, consecutiveFailures: number): boolean {
  if (!hasData) return true;
  return consecutiveFailures >= 2;
}
