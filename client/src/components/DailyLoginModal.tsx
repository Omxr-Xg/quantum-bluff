import { useEffect, useState } from "react";
import { Gift, X, Flame, Check } from "lucide-react";
import {
  claimDailyLogin,
  fetchDailyLoginStatus,
  type DailyLoginStatus,
} from "../utils/userProfile";
import { ChipIcon } from "./ChipIcon";

type DailyLoginModalProps = {
  open: boolean;
  onClose: () => void;
  /** Notifie le parent quand le solde change (pour rafraîchir l'affichage). */
  onClaimed?: (newBalance: number) => void;
};

/**
 * Modal d'affichage de la récompense de connexion quotidienne (daily streak).
 *
 * Récompenses progressives sur 7 jours :
 *   J1=100, J2=150, J3=200, J4=300, J5=400, J6=500, J7=1000.
 * Si le joueur rate un jour, la série retombe à 1.
 */
export function DailyLoginModal({ open, onClose, onClaimed }: DailyLoginModalProps) {
  const [status, setStatus] = useState<DailyLoginStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setError(null);
      setJustClaimed(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchDailyLoginStatus()
      .then((s) => {
        if (cancelled) return;
        setStatus(s);
        if (!s) setError("Impossible de récupérer la récompense.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClaim = async () => {
    if (!status || status.claimedToday || claiming) return;
    setClaiming(true);
    setError(null);
    try {
      const result = await claimDailyLogin();
      if (!result) {
        setError("Récompense indisponible. Réessaie plus tard.");
        return;
      }
      setJustClaimed(result.rewardTokens);
      setStatus({
        ...status,
        streakCount: result.streakCount,
        claimedToday: true,
        nextAction: "ALREADY_CLAIMED",
        nextReward: 0,
      });
      onClaimed?.(result.chips);
    } finally {
      setClaiming(false);
    }
  };

  if (!open) return null;

  const rewards = status?.rewards ?? [100, 150, 200, 300, 400, 500, 1000];
  // Position du jour qui SERA réclamé (ou qui vient de l'être) — pour mettre en valeur la bonne case.
  const highlightDay = status?.nextDayIndex ?? 1;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-300/20 bg-[#070b12] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.62),0_0_24px_rgba(245,158,11,0.08)]">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />

        <div className="relative z-10">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-amber-300" aria-hidden />
              <h3 className="text-xl font-bold text-amber-100">Récompense quotidienne</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-amber-100/55 transition hover:text-amber-50"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {status && status.streakCount > 0 ? (
            <div className="mb-4 flex items-center justify-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/[0.05] py-2 text-sm text-amber-100">
              <Flame className="h-4 w-4 text-orange-400" aria-hidden />
              <span>
                Série en cours :{" "}
                <span className="font-bold text-amber-200">
                  {status.streakCount} jour{status.streakCount > 1 ? "s" : ""}
                </span>
              </span>
            </div>
          ) : null}

          <p className="mb-4 text-center text-sm text-slate-300">
            Connecte-toi chaque jour pour augmenter ta récompense. Si tu rates un jour, la série
            recommence à zéro.
          </p>

          <div className="mb-5 grid grid-cols-7 gap-1.5">
            {rewards.map((amount, idx) => {
              const dayNumber = idx + 1;
              // Une case est "déjà gagnée" si elle est avant le streak courant.
              // Note : si la série a été cassée à 1 aujourd'hui, seules les cases jusqu'au streakCount sont colorées.
              const completed = status ? dayNumber <= status.streakCount : false;
              const isToday = dayNumber === highlightDay && !status?.claimedToday;
              const isLastDay = dayNumber === 7;
              return (
                <div
                  key={dayNumber}
                  className={`relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition ${
                    completed
                      ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                      : isToday
                        ? "border-amber-200/65 bg-amber-400/15 text-amber-50 shadow-[0_0_18px_rgba(245,158,11,0.28)] ring-1 ring-amber-200/40"
                        : isLastDay
                          ? "border-amber-300/25 bg-amber-400/[0.04] text-amber-100/80"
                          : "border-white/10 bg-white/[0.03] text-slate-300"
                  }`}
                >
                  <span className="text-[0.65rem] font-semibold uppercase tracking-wide opacity-80">
                    J{dayNumber}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <ChipIcon size="sm" className="h-3 w-3 brightness-110" />
                    <span className="text-[0.7rem] font-bold tabular-nums">
                      {amount.toLocaleString()}
                    </span>
                  </div>
                  {completed ? (
                    <Check className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 p-0.5 text-slate-950" aria-hidden />
                  ) : null}
                </div>
              );
            })}
          </div>

          {loading ? (
            <p className="py-3 text-center text-sm text-slate-300">Chargement…</p>
          ) : error ? (
            <p className="py-3 text-center text-sm text-rose-300">{error}</p>
          ) : justClaimed != null ? (
            <p className="py-3 text-center text-emerald-300 font-medium">
              +{justClaimed.toLocaleString()} jetons ajoutés à ton solde !
            </p>
          ) : status?.claimedToday ? (
            <p className="py-3 text-center text-sm text-slate-300">
              Récompense déjà récupérée aujourd’hui. Reviens demain !
            </p>
          ) : (
            <button
              type="button"
              onClick={handleClaim}
              disabled={claiming || !status}
              className="w-full rounded-full border border-amber-200/35 bg-amber-400/16 py-2.5 font-bold text-amber-100 transition hover:bg-amber-400/24 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-800/60 disabled:text-slate-500"
            >
              {claiming
                ? "Récupération…"
                : `Récupérer ${status ? status.nextReward.toLocaleString() : ""} jetons`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
