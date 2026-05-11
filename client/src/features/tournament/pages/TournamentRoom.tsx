import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  fetchTournament,
  joinTournament,
  leaveTournament,
  startTournamentHost,
} from "../services/tournamentApi";
import { useTournamentSocket } from "../hooks/useTournamentSocket";
import { TournamentBracketPanel } from "../components/TournamentBracketPanel";

export function TournamentRoom() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setErr(null);
      setData(await fetchTournament(id));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useTournamentSocket(id, {
    onTableAssigned: (p) => {
      nav(`/game?gameId=${encodeURIComponent(p.gameId)}`);
    },
    onCompleted: () => {
      void reload();
    },
    onStarted: () => {
      void reload();
    },
  });

  if (!id) return null;
  const hostId = data?.hostId as string | undefined;
  const me = data?.me as { userId?: string } | undefined;
  const isHost = hostId && me?.userId === hostId;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-white">
      <Link to="/tournaments" className="text-sm text-cyan-300 hover:underline">
        ← Tournois
      </Link>
      <h1 className="text-2xl font-semibold">
        {(data?.name as string) ?? "Tournoi"}
      </h1>
      {err && (
        <div className="rounded border border-red-500/40 bg-red-950/40 p-3 text-sm">
          {err}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-emerald-600/90 px-4 py-2 text-sm"
          onClick={async () => {
            try {
              await joinTournament(id);
              await reload();
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
        >
          Rejoindre
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/10 px-4 py-2 text-sm"
          onClick={async () => {
            try {
              await leaveTournament(id);
              await reload();
            } catch (e) {
              setErr((e as Error).message);
            }
          }}
        >
          Quitter
        </button>
        {isHost && (
          <button
            type="button"
            className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-black"
            onClick={async () => {
              try {
                await startTournamentHost(id);
                await reload();
              } catch (e) {
                setErr((e as Error).message);
              }
            }}
          >
            Démarrer maintenant
          </button>
        )}
        <Link
          to={`/tournaments/${id}/waiting`}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm"
        >
          Salle d’attente
        </Link>
      </div>
      <TournamentBracketPanel bracketJson={data?.bracketJson} />
    </div>
  );
}
