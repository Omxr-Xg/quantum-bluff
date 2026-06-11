import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useTournamentSocket } from "../hooks/useTournamentSocket";
import { ZipRushMiniGame } from "../components/ZipRushMiniGame";
import { fetchTournament } from "../services/tournamentApi";
import {
  navigateToTournamentTable,
  type TournamentTableAssignment,
} from "../tournamentNavigation";

/** Délai Zip uniquement pour le passage vers la table finale (`finalZip=1` depuis Game). */
const TOURNAMENT_FINAL_ZIP_MS = 5000;
const ASSIGNMENT_POLL_MS = 3000;

export function TournamentWaiting() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextGameId = searchParams.get("nextGameId");
  const finalZip = searchParams.get("finalZip") === "1";

  const enteredAtRef = useRef(Date.now());
  const pendingAssignedNavRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigatedAwayRef = useRef(false);

  useLayoutEffect(() => {
    enteredAtRef.current = Date.now();
    navigatedAwayRef.current = false;
  }, [id, nextGameId, finalZip]);

  useEffect(() => {
    return () => {
      if (pendingAssignedNavRef.current) {
        clearTimeout(pendingAssignedNavRef.current);
        pendingAssignedNavRef.current = null;
      }
    };
  }, []);

  const goToAssignedTable = useCallback(
    (
      assign: Pick<TournamentTableAssignment, "gameId" | "isFinalTable"> & {
        gameKind?: string;
      },
    ) => {
      if (!id || navigatedAwayRef.current) return;
      navigatedAwayRef.current = true;
      if (pendingAssignedNavRef.current) {
        clearTimeout(pendingAssignedNavRef.current);
        pendingAssignedNavRef.current = null;
      }
      const isBelote =
        assign.gameKind === "BELOTE" || assign.gameId.startsWith("game_belote_tournament_");
      if (isBelote) {
        navigate(
          `/belote/game?gameId=${encodeURIComponent(assign.gameId)}&tournamentId=${encodeURIComponent(id)}`,
          { replace: true },
        );
        return;
      }
      navigateToTournamentTable(
        navigate,
        {
          tournamentId: id,
          gameId: assign.gameId,
          isFinalTable: assign.isFinalTable,
        },
        { replace: true },
      );
    },
    [id, navigate],
  );

  useEffect(() => {
    if (!id || !nextGameId) return;
    if (finalZip) {
      const h = window.setTimeout(() => {
        goToAssignedTable({ gameId: nextGameId, isFinalTable: true });
      }, TOURNAMENT_FINAL_ZIP_MS);
      return () => window.clearTimeout(h);
    }
    goToAssignedTable({ gameId: nextGameId, isFinalTable: false });
  }, [id, nextGameId, finalZip, goToAssignedTable]);

  const onTableAssigned = useCallback(
    (p: {
      tournamentId: string;
      gameId: string;
      roundNumber: number;
      isFinalTable?: boolean;
      gameKind?: string;
    }) => {
      if (!id) return;
      if (nextGameId) return;
      if (pendingAssignedNavRef.current) {
        clearTimeout(pendingAssignedNavRef.current);
        pendingAssignedNavRef.current = null;
      }
      const elapsed = Date.now() - enteredAtRef.current;
      const wait = finalZip ? Math.max(0, TOURNAMENT_FINAL_ZIP_MS - elapsed) : 0;
      pendingAssignedNavRef.current = window.setTimeout(() => {
        pendingAssignedNavRef.current = null;
        goToAssignedTable({
          gameId: p.gameId,
          isFinalTable: p.isFinalTable === true,
          gameKind: p.gameKind,
        });
      }, wait);
    },
    [id, nextGameId, finalZip, goToAssignedTable],
  );

  useTournamentSocket(id, {
    onTableAssigned,
  });

  useEffect(() => {
    if (!id || nextGameId) return;
    let cancelled = false;

    const pollAssignment = async () => {
      if (cancelled || navigatedAwayRef.current) return;
      try {
        const data = await fetchTournament(id);
        const assign = data.myAssignedTable as TournamentTableAssignment | null | undefined;
        if (!assign?.gameId) return;
        onTableAssigned({
          tournamentId: id,
          gameId: assign.gameId,
          roundNumber: assign.roundNumber,
          isFinalTable: assign.isFinalTable,
        });
      } catch {
        /* poll silencieux */
      }
    };

    void pollAssignment();
    const iv = window.setInterval(() => void pollAssignment(), ASSIGNMENT_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [id, nextGameId, onTableAssigned]);

  if (!id) return null;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-violet-950/15 to-slate-950 pb-16 pt-8 text-white">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            to={`/tournaments/${id}`}
            className="inline-flex items-center gap-1.5 text-violet-300/90 transition hover:text-violet-200"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("tournament.waitingBetween.linkTournament")}
          </Link>
          <span className="text-white/25">·</span>
          <Link
            to="/lobby"
            className="text-white/45 transition hover:text-violet-200"
          >
            {t("tournament.waitingBetween.linkLobby")}
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl shadow-violet-950/20 ring-1 ring-violet-500/10 backdrop-blur-sm">
          <div className="border-b border-white/5 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 px-5 py-3">
            <h1 className="text-base font-semibold tracking-tight">
              {t("tournament.waitingBetween.title")}
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              {t("tournament.waitingBetween.subtitle")}
            </p>
          </div>
          <div className="p-5">
            <ZipRushMiniGame />
          </div>
        </div>
      </div>
    </div>
  );
}
