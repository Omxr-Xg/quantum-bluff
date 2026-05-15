/**
 * Paris cachés « vainqueur de tournoi » — panneau client.
 *
 * Marché parimutuel dynamique :
 *  - Cote temps réel par candidat = `totalPool / poolSurCeCandidat` (affichée au format "×N.NN").
 *  - À la résolution finale (TOURNAMENT_WINNER_BETS_RESOLVED), on refetch pool + mes paris.
 *  - Marché fermé automatiquement à COMPLETED / CANCELLED côté serveur.
 *  - Toujours visible : le user peut parier sur n'importe quel inscrit, y compris lui-même.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Coins, Crown, Eye, Loader2, TrendingUp } from "lucide-react";
import {
  NUMBER_FIELD_INVALID_CLASS,
  useNumberFieldInput,
} from "../../../hooks/useNumberFieldInput";
import { getPlayerAvatar } from "../../../utils/avatars";
import {
  fetchTournamentWinnerBetPool,
  fetchMyTournamentWinnerBets,
  placeTournamentWinnerBet,
  TOURNAMENT_WINNER_BET_MAX_STAKE,
  TOURNAMENT_WINNER_BET_MIN_STAKE,
  type MyTournamentBetRow,
  type TournamentBetCandidate,
  type TournamentBetPoolSnapshot,
} from "../services/tournamentWinnerBetsApi";
import {
  fetchBalanceFromServer,
  updateUserBalance,
} from "../../../utils/userProfile";
import { useToast } from "../../../contexts/ToastContext";
import { ImageWithFallback } from "../../../components/figma/ImageWithFallback";
import { useSocket } from "../../../hooks/useSocket";

type Props = {
  tournamentId: string;
  authUserId: string | null;
  /** Statut du tournoi côté parent (REGISTRATION_OPEN / ROUND_IN_PROGRESS / COMPLETED / CANCELLED…). */
  tournamentStatus: string | undefined;
  /** Identifiant du vainqueur final (uniquement quand COMPLETED) — utile pour styliser la ligne gagnante. */
  winnerUserId?: string | null;
  /** Trigger externe (socket) pour forcer un refetch du pool / des paris. */
  refreshKey?: number;
};

function StatusPill({ status }: { status: MyTournamentBetRow["status"] }) {
  const { t } = useTranslation();
  const cls: Record<MyTournamentBetRow["status"], string> = {
    PENDING: "border-violet-500/40 bg-violet-500/15 text-violet-100",
    WON: "border-amber-400/45 bg-amber-500/15 text-amber-100",
    LOST: "border-white/15 bg-white/5 text-white/55",
    REFUNDED: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cls[status]}`}
    >
      {t(`tournament.bets.status.${status}`)}
    </span>
  );
}

const ELIGIBLE_STATUSES = new Set([
  "REGISTERED",
  "ACTIVE",
  "WAITING_NEXT_ROUND",
]);

export function TournamentWinnerBetsPanel({
  tournamentId,
  authUserId,
  tournamentStatus,
  winnerUserId,
  refreshKey,
}: Props) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const [pool, setPool] = useState<TournamentBetPoolSnapshot | null>(null);
  const [myBets, setMyBets] = useState<MyTournamentBetRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [stake, setStake] = useState<number>(TOURNAMENT_WINNER_BET_MIN_STAKE);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const stakeField = useNumberFieldInput({
    value: stake,
    onChange: setStake,
    min: TOURNAMENT_WINNER_BET_MIN_STAKE,
    max: TOURNAMENT_WINNER_BET_MAX_STAKE,
  });

  const reloadPool = useCallback(async () => {
    try {
      setLoadError(null);
      const snap = await fetchTournamentWinnerBetPool(tournamentId);
      setPool(snap);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [tournamentId]);

  const reloadMine = useCallback(async () => {
    if (!authUserId) return;
    try {
      const res = await fetchMyTournamentWinnerBets(tournamentId);
      setMyBets(res.bets);
    } catch {
      /* non bloquant : silencieux */
    }
  }, [authUserId, tournamentId]);

  useEffect(() => {
    void reloadPool();
    void reloadMine();
  }, [reloadPool, reloadMine, refreshKey]);

  useEffect(() => {
    if (!socket) return;

    const joinTournamentRoom = () => {
      if (socket.connected) {
        socket.emit("JOIN_TOURNAMENT_ROOM", { tournamentId });
      }
    };

    const onPoolUpdated = (payload: {
      tournamentId?: string;
      pool?: TournamentBetPoolSnapshot | null;
    }) => {
      if (payload?.tournamentId !== tournamentId) return;
      if (payload.pool) {
        setPool(payload.pool);
      } else {
        void reloadPool();
      }
      void reloadMine();
    };

    const onBetsResolved = (payload: { tournamentId?: string }) => {
      if (payload?.tournamentId !== tournamentId) return;
      void reloadPool();
      void reloadMine();
    };

    joinTournamentRoom();
    socket.on("connect", joinTournamentRoom);
    socket.on("TOURNAMENT_WINNER_BET_POOL_UPDATED", onPoolUpdated);
    socket.on("TOURNAMENT_WINNER_BETS_RESOLVED", onBetsResolved);
    return () => {
      socket.off("connect", joinTournamentRoom);
      socket.off("TOURNAMENT_WINNER_BET_POOL_UPDATED", onPoolUpdated);
      socket.off("TOURNAMENT_WINNER_BETS_RESOLVED", onBetsResolved);
    };
  }, [socket, tournamentId, reloadPool, reloadMine]);

  /* Marché fermé localement quand le tournoi est terminé/annulé.
   * Le serveur applique aussi son propre verrou : ceinture + bretelles. */
  const marketOpen = useMemo(() => {
    if (pool?.marketOpen != null) return pool.marketOpen;
    return tournamentStatus !== "COMPLETED" && tournamentStatus !== "CANCELLED";
  }, [pool?.marketOpen, tournamentStatus]);

  /* Candidats actuellement éligibles à recevoir une nouvelle mise. */
  const eligibleCandidates = useMemo<TournamentBetCandidate[]>(() => {
    if (!pool) return [];
    return pool.candidates.filter((c) => ELIGIBLE_STATUSES.has(c.status));
  }, [pool]);

  /* Auto-sélection : si on a une cible déjà choisie qui sort d'éligibilité,
   * on bascule sur le premier candidat éligible. */
  useEffect(() => {
    if (selectedUserId == null) return;
    const stillEligible = eligibleCandidates.some(
      (c) => c.userId === selectedUserId,
    );
    if (!stillEligible) setSelectedUserId(eligibleCandidates[0]?.userId ?? null);
  }, [eligibleCandidates, selectedUserId]);

  const handlePlace = useCallback(async () => {
    if (!authUserId) {
      setSubmitError(t("tournament.bets.notLoggedIn"));
      return;
    }
    if (!selectedUserId) {
      setSubmitError(t("tournament.bets.pickCandidate"));
      return;
    }
    if (stakeField.isInvalid) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await placeTournamentWinnerBet(tournamentId, {
        predictedWinnerUserId: selectedUserId,
        stake,
      });
      if (
        typeof res.newBalance === "number" &&
        Number.isFinite(res.newBalance)
      ) {
        updateUserBalance(res.newBalance);
      } else {
        void fetchBalanceFromServer({ authoritative: true });
      }
      addToast(t("tournament.bets.placed", { amount: stake }), "success");
      await Promise.all([reloadPool(), reloadMine()]);
    } catch (e) {
      setSubmitError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }, [
    addToast,
    authUserId,
    reloadMine,
    reloadPool,
    selectedUserId,
    stake,
    stakeField.isInvalid,
    t,
    tournamentId,
  ]);

  if (!pool && loadError) {
    return (
      <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-red-200/90">
        {loadError}
      </div>
    );
  }
  if (!pool) {
    return (
      <div className="rounded-2xl border border-white/8 bg-black/20 p-4 text-sm text-white/55">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden />
        {t("tournament.bets.loading")}
      </div>
    );
  }

  const totalPool = pool.totalPool;
  const totalBets = pool.totalBets;
  const selected = selectedUserId
    ? pool.candidates.find((c) => c.userId === selectedUserId)
    : null;

  return (
    <section className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-950/30 via-violet-950/20 to-slate-950/30 p-4 shadow-lg shadow-fuchsia-900/10 sm:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-fuchsia-500/20 text-fuchsia-200">
            <Eye className="h-4 w-4" aria-hidden />
          </span>
          <h3 className="text-sm font-bold text-fuchsia-100 sm:text-base">
            {t("tournament.bets.title")}
          </h3>
          {!marketOpen && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/55">
              {t("tournament.bets.marketClosed")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-white/65">
          <span className="inline-flex items-center gap-1">
            <Coins className="h-3.5 w-3.5 text-amber-300" aria-hidden />
            <span className="font-mono font-semibold tabular-nums text-amber-100">
              {totalPool.toLocaleString()}
            </span>
            <span className="text-white/45">
              {t("tournament.bets.totalPool")}
            </span>
          </span>
          <span className="text-white/40">·</span>
          <span>{t("tournament.bets.totalBets", { count: totalBets })}</span>
        </div>
      </header>

      <p className="mb-3 text-xs leading-relaxed text-white/55">
        {t("tournament.bets.explainer", {
          min: TOURNAMENT_WINNER_BET_MIN_STAKE,
          max: TOURNAMENT_WINNER_BET_MAX_STAKE.toLocaleString(),
        })}
      </p>

      <div className="mb-4 space-y-1.5">
        {pool.candidates.length === 0 && (
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-3 text-xs text-white/50">
            {t("tournament.bets.noCandidates")}
          </div>
        )}
        {pool.candidates.map((c) => {
          const eligible = ELIGIBLE_STATUSES.has(c.status);
          const isSelected = c.userId === selectedUserId;
          const isWinner = winnerUserId && c.userId === winnerUserId;
          const avatarSrc = getPlayerAvatar(
            c.username ?? "",
            c.userId,
            authUserId ?? undefined,
            c.avatarUrl,
          );
          return (
            <button
              key={c.userId}
              type="button"
              onClick={() => marketOpen && eligible && setSelectedUserId(c.userId)}
              disabled={!marketOpen || !eligible}
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                isWinner
                  ? "border-amber-400/50 bg-amber-500/15"
                  : isSelected
                    ? "border-fuchsia-400/50 bg-fuchsia-500/15 shadow-sm shadow-fuchsia-700/20"
                    : "border-white/8 bg-black/25 hover:border-white/15 hover:bg-white/5"
              } disabled:cursor-not-allowed disabled:opacity-50`}
              aria-pressed={isSelected}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-violet-500/40 to-fuchsia-600/30 text-xs font-bold text-white">
                {avatarSrc ? (
                  <ImageWithFallback
                    src={avatarSrc}
                    alt={c.username ?? "avatar"}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                ) : (
                  (c.username ?? "?").slice(0, 1).toUpperCase()
                )}
                {isWinner && (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-amber-400/60 bg-amber-900/85">
                    <Crown className="h-2.5 w-2.5 text-amber-200" aria-hidden />
                  </span>
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {c.username ?? t("tournament.room.playerUnknown")}
                  </span>
                  {!eligible && (
                    <span className="rounded-full border border-white/12 bg-white/5 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/55">
                      {t(`tournament.bets.candidateStatus.${c.status}`, {
                        defaultValue: c.status,
                      })}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-white/50">
                  <span className="inline-flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-300/85" aria-hidden />
                    <span className="font-mono tabular-nums text-amber-100/95">
                      {c.totalStake.toLocaleString()}
                    </span>
                    <span className="text-white/35">
                      {t("tournament.bets.candidateStake")}
                    </span>
                  </span>
                  <span>
                    {t("tournament.bets.candidateBetCount", {
                      count: c.betCount,
                    })}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-black/35 px-2 py-1 text-xs font-bold tabular-nums">
                  <TrendingUp className="h-3 w-3 text-emerald-300" aria-hidden />
                  <span className="text-emerald-200">
                    {c.odds != null ? `×${c.odds.toFixed(2)}` : "—"}
                  </span>
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-wider text-white/35">
                  {t("tournament.bets.odds")}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {marketOpen && eligibleCandidates.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-black/30 p-3 sm:p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-white/65">
            <span>
              {selected
                ? t("tournament.bets.selectedHint", {
                    name:
                      selected.username ?? t("tournament.room.playerUnknown"),
                  })
                : t("tournament.bets.pickCandidate")}
            </span>
            {selected?.odds != null && (
              <span className="font-mono font-semibold text-emerald-200 tabular-nums">
                ×{selected.odds.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={TOURNAMENT_WINNER_BET_MIN_STAKE}
              max={TOURNAMENT_WINNER_BET_MAX_STAKE}
              step={1}
              aria-label={t("tournament.bets.stakeLabel")}
              aria-invalid={stakeField.isInvalid}
              value={stakeField.inputValue}
              onChange={stakeField.handleChange}
              onFocus={stakeField.handleFocus}
              onBlur={stakeField.handleBlur}
              className={`w-32 rounded-lg border border-white/12 bg-black/40 px-3 py-2 font-mono text-sm tabular-nums text-white outline-none focus:border-fuchsia-400/50 focus:ring-2 focus:ring-fuchsia-500/25 ${
                stakeField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""
              }`}
            />
            <button
              type="button"
              disabled={
                submitting ||
                !selectedUserId ||
                stakeField.isInvalid ||
                !authUserId
              }
              onClick={handlePlace}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-fuchsia-900/30 transition hover:from-fuchsia-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t("tournament.bets.placeCta")}
            </button>
            <span className="ml-auto text-[11px] text-white/40">
              {t("tournament.bets.stakeRange", {
                min: TOURNAMENT_WINNER_BET_MIN_STAKE,
                max: TOURNAMENT_WINNER_BET_MAX_STAKE.toLocaleString(),
              })}
            </span>
          </div>
          {submitError && (
            <p className="mt-2 text-xs text-red-200/95" role="alert">
              {submitError}
            </p>
          )}
        </div>
      )}

      {myBets.length > 0 && (
        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
            {t("tournament.bets.myBetsTitle")}
          </h4>
          <ul className="space-y-1.5">
            {myBets.map((b) => (
              <li
                key={b.id}
                className="flex flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-black/25 px-3 py-2 text-xs"
              >
                <span className="truncate font-medium text-white/85">
                  {b.predictedWinnerUsername ??
                    t("tournament.room.playerUnknown")}
                </span>
                <span className="font-mono text-white/55 tabular-nums">
                  {b.stake.toLocaleString()}
                </span>
                <StatusPill status={b.status} />
                {b.status === "WON" && b.payout != null && b.payout > 0 && (
                  <span className="font-mono text-amber-200 tabular-nums">
                    +{b.payout.toLocaleString()}
                  </span>
                )}
                {b.status === "REFUNDED" && (
                  <span className="font-mono text-cyan-200 tabular-nums">
                    +{b.stake.toLocaleString()}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
