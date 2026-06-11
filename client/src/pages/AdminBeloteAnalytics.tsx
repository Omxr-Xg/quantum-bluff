import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { RefreshCw } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { getAdminAuthToken } from "../utils/adminAuth";

type DecisionStat = {
  decisionSource: string;
  variant: string;
  count: number;
  avgDecisionMs: number | null;
};

type BenchmarkRow = {
  id: string;
  matchup: string;
  variant: string;
  gamesPlayed: number;
  teamAWins: number;
  teamBWins: number;
  illegalActions: number;
  avgDecisionMs: number;
  finishedAt: string;
};

type ModelRow = {
  id: string;
  slug: string;
  label: string;
  isActive: boolean;
};

export function AdminBeloteAnalytics() {
  const [decisionStats, setDecisionStats] = useState<DecisionStat[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkRow[]>([]);
  const [models, setModels] = useState<ModelRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = getAdminAuthToken();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/console/belote-analytics"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        decisionStats?: DecisionStat[];
        benchmarks?: BenchmarkRow[];
        models?: ModelRow[];
      };
      setDecisionStats(data.decisionStats ?? []);
      setBenchmarks(data.benchmarks ?? []);
      setModels(data.models ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Belote Analytics</h1>
            <p className="text-sm text-slate-400">HUMAN / HEURISTIC / NEURAL — baseline décisions</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
            <Link
              to="/admin/bot-analytics"
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              Poker bots
            </Link>
            <Link
              to="/admin/console"
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
            >
              Console admin
            </Link>
          </div>
        </header>

        {loading ? <p>Chargement…</p> : null}
        {error ? <p className="text-red-400">{error}</p> : null}

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-lg font-semibold">Décisions (30 j)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-2">Source</th>
                <th>Variante</th>
                <th>Count</th>
                <th>Avg ms</th>
              </tr>
            </thead>
            <tbody>
              {decisionStats.map((r) => (
                <tr key={`${r.decisionSource}-${r.variant}`} className="border-t border-white/5">
                  <td className="py-2">{r.decisionSource}</td>
                  <td>{r.variant}</td>
                  <td>{r.count}</td>
                  <td>{r.avgDecisionMs?.toFixed(1) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-lg font-semibold">Modèles</h2>
          <ul className="space-y-1 text-sm">
            {models.map((m) => (
              <li key={m.id}>
                {m.slug} — {m.label} {m.isActive ? "(actif)" : ""}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
          <h2 className="mb-3 text-lg font-semibold">Benchmarks récents</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400">
                <th className="py-2">Matchup</th>
                <th>Variante</th>
                <th>Parties</th>
                <th>Illégales</th>
                <th>Avg ms</th>
              </tr>
            </thead>
            <tbody>
              {benchmarks.map((b) => (
                <tr key={b.id} className="border-t border-white/5">
                  <td className="py-2">{b.matchup}</td>
                  <td>{b.variant}</td>
                  <td>{b.gamesPlayed}</td>
                  <td>{b.illegalActions}</td>
                  <td>{b.avgDecisionMs.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
