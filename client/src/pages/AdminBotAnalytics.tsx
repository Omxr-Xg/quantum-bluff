import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";

type BotMetrics = {
  botId: string;
  winRate: number;
  bbPer100: number;
  vpip: number;
  pfr: number;
  foldToRaiseRate: number;
  bluffFrequency: number;
  callFrequency: number;
};

type RunRow = {
  id: string;
  matchup: string;
  handsPlayed: number;
  gitSha: string | null;
  engineVersion: string | null;
  isBaseline: boolean;
  completedAt: string;
  metrics: { bots?: BotMetrics[] };
};

export function AdminBotAnalytics() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = getAuthItem("token");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/console/bot-analytics"), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { runs?: RunRow[] };
      setRuns(data.runs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur chargement");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const runSmoke = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/console/bot-analytics/run"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ tier: "smoke" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur simulation");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Bot Analytics</h1>
            <p className="text-slate-400 text-sm mt-1">
              VPIP, PFR, BB/100, win rate — self-play expert / adaptive
            </p>
          </div>
          <button
            type="button"
            onClick={() => void runSmoke()}
            disabled={running}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
          >
            {running ? "Simulation…" : "Lancer smoke (1k mains)"}
          </button>
        </header>

        {error && (
          <p className="text-red-400 text-sm" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-slate-400">Chargement…</p>
        ) : runs.length === 0 ? (
          <p className="text-slate-400">Aucune run enregistrée.</p>
        ) : (
          <div className="space-y-4">
            {runs.map((run) => (
              <section
                key={run.id}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <div className="flex flex-wrap gap-3 text-sm text-slate-300 mb-3">
                  <span className="font-medium text-white">{run.matchup}</span>
                  <span>{run.handsPlayed} mains</span>
                  <span>{new Date(run.completedAt).toLocaleString()}</span>
                  {run.gitSha && <span>sha {run.gitSha}</span>}
                  {run.isBaseline && (
                    <span className="text-amber-400">baseline</span>
                  )}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-2 pr-4">Bot</th>
                        <th className="py-2 pr-4">Win %</th>
                        <th className="py-2 pr-4">BB/100</th>
                        <th className="py-2 pr-4">VPIP</th>
                        <th className="py-2 pr-4">PFR</th>
                        <th className="py-2 pr-4">Fold to raise</th>
                        <th className="py-2 pr-4">Bluff</th>
                        <th className="py-2">Call</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(run.metrics.bots ?? []).map((b) => (
                        <tr key={b.botId} className="border-b border-slate-800/60">
                          <td className="py-2 pr-4">{b.botId}</td>
                          <td className="py-2 pr-4">
                            {(b.winRate * 100).toFixed(1)}%
                          </td>
                          <td
                            className={`py-2 pr-4 ${
                              Math.abs(b.bbPer100) > 8 ? "text-amber-400" : ""
                            }`}
                          >
                            {b.bbPer100.toFixed(2)}
                          </td>
                          <td className="py-2 pr-4">{(b.vpip * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-4">{(b.pfr * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-4">
                            {(b.foldToRaiseRate * 100).toFixed(1)}%
                          </td>
                          <td className="py-2 pr-4">
                            {(b.bluffFrequency * 100).toFixed(1)}%
                          </td>
                          <td className="py-2">
                            {(b.callFrequency * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
