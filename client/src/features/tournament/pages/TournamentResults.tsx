import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Trophy } from "lucide-react";
import { fetchTournamentResults } from "../services/tournamentApi";
import { getAuthItem } from "../../../utils/authStorage";
import { getPlayerAvatar } from "../../../utils/avatars";
import { ImageWithFallback } from "../../../components/figma/ImageWithFallback";

type Row = {
  userId: string;
  username: string | null;
  avatarUrl: string | null;
  finalRank: number | null;
  eliminationOrder: number | null;
  xpAwarded: number;
  chipsAwarded: number | null;
};

type ResultsPayload = {
  tournamentId: string;
  name: string;
  status: string;
  leaderboardAvailable: boolean;
  rows: Row[];
};

function rankLabel(
  rank: number | null,
  t: (k: string) => string,
): string {
  if (rank === 1) return t("tournament.results.rankGold");
  if (rank === 2) return t("tournament.results.rankSilver");
  if (rank === 3) return t("tournament.results.rankBronze");
  if (rank != null && rank >= 99) return t("tournament.results.rankOther");
  if (rank != null) return String(rank);
  return t("tournament.results.rankDash");
}

export function TournamentResults() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ResultsPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setErr(null);
      setData(await fetchTournamentResults(id));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Le classement peut arriver quelques instants après COMPLETED (grant serveur). */
  useEffect(() => {
    if (!data || data.leaderboardAvailable || data.status !== "COMPLETED") return;
    const interval = setInterval(() => {
      void load();
    }, 1200);
    const stop = setTimeout(() => clearInterval(interval), 30000);
    return () => {
      clearInterval(interval);
      clearTimeout(stop);
    };
  }, [data?.leaderboardAvailable, data?.status, load]);

  const authUserId = getAuthItem("userId");
  const showChipsCol = Boolean(data?.rows.some((r) => r.chipsAwarded != null && r.chipsAwarded > 0));

  if (!id) return null;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 pb-20 pt-8 text-white">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <Link
            to={`/tournaments/${id}`}
            className="inline-flex items-center gap-2 text-violet-300/90 transition hover:text-violet-200"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("tournament.results.backRoom")}
          </Link>
          <span className="text-white/25">·</span>
          <Link
            to="/lobby"
            className="text-white/50 transition hover:text-violet-200"
          >
            {t("tournament.results.backLobby")}
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/30 ring-1 ring-violet-500/10">
          <div className="border-b border-white/5 bg-gradient-to-r from-violet-600/25 via-fuchsia-600/10 to-transparent px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15">
                <Trophy className="h-7 w-7 text-amber-200/90" aria-hidden strokeWidth={1.25} />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {t("tournament.results.title")}
                </h1>
                <p className="mt-1 text-sm text-white/50">
                  {data?.name ? `${data.name} · ` : ""}
                  {t("tournament.results.subtitle")}
                </p>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {err && (
              <div
                className="mb-4 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100/95"
                role="alert"
              >
                {err}
              </div>
            )}

            {!data && !err && (
              <p className="text-sm text-white/50">{t("tournament.room.loading")}</p>
            )}

            {data && !data.leaderboardAvailable && (
              <p className="text-sm text-white/60">{t("tournament.results.pending")}</p>
            )}

            {data?.leaderboardAvailable && data.rows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="w-full min-w-[320px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-black/30 text-xs font-semibold uppercase tracking-wider text-white/45">
                      <th className="px-4 py-3">{t("tournament.results.colRank")}</th>
                      <th className="px-4 py-3">{t("tournament.results.colPlayer")}</th>
                      <th className="px-4 py-3 text-right tabular-nums">
                        {t("tournament.results.colXp")}
                      </th>
                      {showChipsCol && (
                        <th className="px-4 py-3 text-right tabular-nums">
                          {t("tournament.results.colChips")}
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((r) => {
                      const username = r.username ?? r.userId;
                      const avatarSrc = getPlayerAvatar(
                        username,
                        r.userId,
                        authUserId,
                        r.avatarUrl,
                      );
                      return (
                      <tr
                        key={r.userId}
                        className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3 font-medium text-violet-100/95">
                          {rankLabel(r.finalRank, t)}
                        </td>
                        <td className="px-4 py-3 text-white/90">
                          <span className="inline-flex flex-wrap items-center gap-2">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-violet-500/15">
                              {avatarSrc ? (
                                <ImageWithFallback
                                  src={avatarSrc}
                                  alt={username}
                                  className="h-7 w-7 rounded-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-white/80">
                                  {username.slice(0, 1).toUpperCase()}
                                </span>
                              )}
                            </span>
                            <span className="truncate">{username}</span>
                            {authUserId === r.userId && (
                              <span className="shrink-0 rounded bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-violet-200">
                                {t("tournament.results.youBadge")}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-emerald-200/95">
                          +{r.xpAwarded}
                        </td>
                        {showChipsCol && (
                          <td className="px-4 py-3 text-right font-mono text-sm tabular-nums text-amber-200/90">
                            {r.chipsAwarded != null && r.chipsAwarded > 0
                              ? t("tournament.results.chipsWinner", {
                                  amount: r.chipsAwarded.toLocaleString(),
                                })
                              : "—"}
                          </td>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
