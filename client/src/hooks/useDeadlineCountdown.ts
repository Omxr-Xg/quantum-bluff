import { useEffect, useState } from "react";

/** Compte à rebours local synchronisé sur une échéance ISO (timer serveur / déconnexion). */
export function useDeadlineCountdown(deadlineIso: string | null | undefined): number | null {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!deadlineIso) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const ms = new Date(deadlineIso).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.ceil(ms / 1000)));
    };

    tick();
    const iv = window.setInterval(tick, 250);
    return () => window.clearInterval(iv);
  }, [deadlineIso]);

  return secondsLeft;
}
