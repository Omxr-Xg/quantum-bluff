import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trophy, Home, Loader2 } from "lucide-react";
import { fetchHiddenBetHistory } from "../api/hiddenBetsApi";

type TicketRow = {
  id: string;
  gameId: string;
  handId: string;
  status: string;
  stake: number;
  quotedOdds: number;
  potentialPayout: number;
  placedAt: string;
  resolvedAt?: string | null;
};

export function HiddenBetsResult() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { tickets: list } = await fetchHiddenBetHistory(80);
        if (!cancelled) setTickets((list ?? []) as TicketRow[]);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="w-full min-h-screen app-shell-bg flex items-center justify-center p-4">
      <div className="app-shell-bg rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border-4 border-yellow-500">
        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-6 relative">
          <button
            type="button"
            onClick={() => navigate("/lobby")}
            className="absolute top-4 left-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all flex items-center justify-center"
            title={t("hiddenBets.backHome")}
          >
            <Home className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center gap-4 justify-center">
            <div className="bg-white/20 p-4 rounded-2xl">
              <Trophy className="w-12 h-12 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-white mb-1">{t("hiddenBets.results")}</h2>
              <p className="text-yellow-100 text-sm">{t("hiddenBets.serverHistory", "Historique serveur")}</p>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {loading && (
            <div className="flex justify-center py-12 text-slate-300">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
          )}
          {error && <p className="text-red-400 text-center">{error}</p>}
          {!loading && !error && tickets.length === 0 && (
            <p className="text-slate-400 text-center py-8">{t("hiddenBets.noTickets", "Aucun ticket pour le moment.")}</p>
          )}
          <ul className="space-y-3">
            {tickets.map((tk) => (
              <li
                key={tk.id}
                className="rounded-xl border border-slate-600 bg-slate-800/80 p-4 text-sm text-slate-200"
              >
                <div className="flex justify-between font-semibold text-white">
                  <span>{tk.status}</span>
                  <span>
                    {tk.stake} → {tk.potentialPayout} (x{tk.quotedOdds.toFixed?.(2) ?? tk.quotedOdds})
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-mono truncate">
                  {tk.gameId} / {tk.handId}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {tk.placedAt}
                  {tk.resolvedAt ? ` → ${tk.resolvedAt}` : ""}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
