import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createTournament,
  fetchTournaments,
} from "../services/tournamentApi";

type Row = {
  id: string;
  name: string;
  startAt: string;
  maxPlayers: number;
  _count: { players: number };
};

export function TournamentLobby() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const data = await fetchTournaments();
      setRows(data);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Tournois</h1>
        <button
          type="button"
          className="rounded-lg bg-amber-500/90 px-4 py-2 text-sm font-medium text-black"
          disabled={creating}
          onClick={async () => {
            setCreating(true);
            try {
              const start = new Date(Date.now() + 60_000).toISOString();
              const { id } = await createTournament({
                name: `Quick ${new Date().toLocaleTimeString()}`,
                visibility: "PUBLIC",
                maxPlayers: 8,
                initialStack: 2000,
                startAt: start,
                blindSmall: 10,
                blindBig: 20,
              });
              await load();
              window.location.href = `/tournaments/${id}`;
            } catch (e) {
              setErr((e as Error).message);
            } finally {
              setCreating(false);
            }
          }}
        >
          Créer (démo)
        </button>
      </div>
      {err && (
        <div className="rounded border border-red-500/40 bg-red-950/40 p-3 text-sm">
          {err}
        </div>
      )}
      <ul className="space-y-3">
        {rows.map((t) => (
          <li key={t.id}>
            <Link
              to={`/tournaments/${t.id}`}
              className="block rounded-xl border border-white/10 bg-white/5 p-4 transition hover:bg-white/10"
            >
              <div className="font-medium">{t.name}</div>
              <div className="mt-1 text-xs text-white/60">
                {t._count.players}/{t.maxPlayers} — départ{" "}
                {new Date(t.startAt).toLocaleString()}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
