import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Crown, Eye, UserX } from "lucide-react";
import {
  fetchTournament,
  joinTournament,
  kickTournamentPlayer,
  leaveTournament,
  startTournamentHost,
} from "../services/tournamentApi";
import { useTournamentSocket } from "../hooks/useTournamentSocket";
import { TOURNAMENT_MIN_PLAYERS } from "../tournamentConstants";
import { getAuthItem } from "../../../utils/authStorage";
import { useToast } from "../../../contexts/ToastContext";

type PlayerRow = {
  userId: string;
  status: string;
  user?: { id: string; username: string };
};

type MeRow = { userId?: string; status?: string } | undefined;

const btnGhost =
  "rounded-xl border border-white/12 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40";
const btnPrimary =
  "rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/25 transition hover:from-emerald-400 hover:to-teal-400 disabled:opacity-40";
const btnHost =
  "rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-900/25 transition hover:from-amber-300 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-40";
const fieldJoin =
  "min-w-[11rem] rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/25";

function statusPillClass(status: string | undefined): string {
  switch (status) {
    case "REGISTRATION_OPEN":
      return "border-emerald-500/40 bg-emerald-500/15 text-emerald-200";
    case "COMPLETED":
      return "border-amber-500/40 bg-amber-500/10 text-amber-200";
    case "CANCELLED":
      return "border-white/20 bg-white/5 text-white/50";
    default:
      return "border-violet-500/40 bg-violet-500/15 text-violet-200";
  }
}

function initialFromUsername(name: string | undefined) {
  const u = (name ?? "?").trim();
  return u.slice(0, 1).toUpperCase() || "?";
}

export function TournamentRoom() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { addToast } = useToast();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [kickingUserId, setKickingUserId] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    setErr(null);
  }, [id]);

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

  const hostId = data?.hostId as string | undefined;
  const me = data?.me as MeRow;
  const status = data?.status as string | undefined;
  const visibility = data?.visibility as string | undefined;
  const maxPlayers = (data?.maxPlayers as number) ?? 0;
  const initialStack = (data?.initialStack as number) ?? 0;
  const blindSmall = (data?.blindSmall as number) ?? 0;
  const blindBig = (data?.blindBig as number) ?? 0;
  const startAt = data?.startAt as string | undefined;
  const players = (data?.players as PlayerRow[]) ?? [];
  const playerCount =
    (data?._count as { players?: number } | undefined)?.players ??
    players.length;

  const authUserId = getAuthItem("userId");
  const isHost = Boolean(hostId && authUserId && authUserId === hostId);
  const isMember = Boolean(me?.userId);
  const registrationOpen = status === "REGISTRATION_OPEN";
  const completed = status === "COMPLETED";
  const cancelled = status === "CANCELLED";
  const inProgress =
    status && !registrationOpen && !completed && !cancelled;

  const spectateTables =
    (data?.spectateTables as
      | { gameId: string; roundNumber: number; playerCount: number }[]
      | undefined) ?? [];
  const isEliminated = me?.status === "ELIMINATED";

  const winner = useMemo(
    () => players.find((p) => p.status === "WINNER"),
    [players],
  );

  const isFull = maxPlayers > 0 && playerCount >= maxPlayers;
  const joinNeedsCode = visibility === "PRIVATE";
  const canSubmitJoin =
    registrationOpen &&
    !isFull &&
    !isMember &&
    (!joinNeedsCode || joinCode.trim().length >= 4);

  const fillPct =
    maxPlayers > 0 ? Math.min(100, Math.round((playerCount / maxPlayers) * 100)) : 0;

  const canHostStartNow =
    isHost && registrationOpen && playerCount >= TOURNAMENT_MIN_PLAYERS;

  const statusText = useMemo(() => {
    if (!status) return t("tournament.room.status_unknown");
    return t(`tournament.room.status_${status}`, { defaultValue: status });
  }, [status, t]);

  const shouldJoinTournamentRoom = Boolean(
    data &&
      id &&
      authUserId &&
      (isHost || isMember || visibility === "PUBLIC"),
  );
  useTournamentSocket(id, {
    shouldJoinTournamentRoom,
    onTableAssigned: (p) => {
      if (!id) return;
      nav(
        `/game?gameId=${encodeURIComponent(p.gameId)}&tournamentId=${encodeURIComponent(id)}`,
      );
    },
    onCompleted: () => {
      void reload();
    },
    onStarted: () => {
      void reload();
    },
    onCancelled: () => {
      void reload();
    },
    onRosterUpdated: () => {
      void reload();
    },
    onLiveTablesChanged: () => {
      void reload();
    },
    onKicked: () => {
      addToast(t("tournament.room.kickedToast"), "warning");
      void reload();
    },
  });

  if (!id) return null;

  if (!data && !err) {
    return (
      <div className="flex min-h-full items-center justify-center bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 px-4 pt-8 pb-20 text-white">
        <p className="text-sm text-white/55">{t("tournament.room.loading")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 pb-20 pt-8 text-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            to="/tournaments"
            className="inline-flex items-center gap-2 text-sm text-violet-300/90 transition hover:text-violet-200"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("tournament.room.backList")}
          </Link>
          <Link
            to="/lobby"
            className="inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-violet-200"
          >
            {t("tournament.room.backLobby")}
          </Link>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-xl shadow-black/30 ring-1 ring-violet-500/10">
          <div className="border-b border-white/5 bg-gradient-to-r from-violet-600/20 via-fuchsia-600/10 to-transparent px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  {(data?.name as string) ?? t("tournament.room.fallbackName")}
                </h1>
                {startAt && (
                  <p className="mt-2 text-sm text-white/45">
                    {t("tournament.room.startLabel")}{" "}
                    <span className="text-white/75">
                      {new Date(startAt).toLocaleString()}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusPillClass(status)}`}
                >
                  {statusText}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    visibility === "PRIVATE"
                      ? "border-fuchsia-500/35 bg-fuchsia-500/10 text-fuchsia-200"
                      : "border-white/15 bg-white/5 text-white/60"
                  }`}
                >
                  {visibility === "PRIVATE"
                    ? t("tournament.room.private")
                    : t("tournament.room.public")}
                </span>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-sm">
              <div className="rounded-xl bg-black/25 px-4 py-2">
                <span className="text-xs text-white/40">
                  {t("tournament.room.blinds")}
                </span>
                <div className="font-mono text-base font-semibold tabular-nums text-white">
                  {blindSmall} / {blindBig}
                </div>
              </div>
              <div className="rounded-xl bg-black/25 px-4 py-2">
                <span className="text-xs text-white/40">
                  {t("tournament.room.stack")}
                </span>
                <div className="font-mono text-base font-semibold tabular-nums text-emerald-200/90">
                  {initialStack.toLocaleString()}
                </div>
              </div>
              <div className="min-w-[8rem] flex-1 rounded-xl bg-black/25 px-4 py-2">
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{t("tournament.room.registered")}</span>
                  <span className="font-mono text-white/70">
                    {playerCount}/{maxPlayers}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {completed && (
              <div className="mb-6 space-y-4">
                {winner?.user && (
                  <div className="flex items-center gap-4 rounded-xl border border-amber-500/35 bg-gradient-to-r from-amber-950/50 to-amber-900/20 px-4 py-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                      <Crown className="h-8 w-8 text-amber-200" aria-hidden strokeWidth={1.25} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-200/70">
                        {t("tournament.room.winner")}
                      </p>
                      <p className="text-lg font-bold text-amber-100">
                        {winner.user.username}
                      </p>
                    </div>
                  </div>
                )}
                {id && (
                  <Link
                    to={`/tournaments/${id}/results`}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-100 transition hover:border-amber-300/55 hover:bg-amber-500/25 sm:w-auto"
                  >
                    {t("tournament.room.resultsCta")}
                  </Link>
                )}
              </div>
            )}
            {cancelled && (
              <div className="mb-6 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/65">
                {t("tournament.room.cancelled")}
              </div>
            )}
            {err && (
              <div
                className="mb-6 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100/95"
                role="alert"
              >
                {err}
              </div>
            )}

            {inProgress && spectateTables.length > 0 && (
              <div className="mb-6 rounded-xl border border-cyan-500/25 bg-cyan-950/20 px-4 py-4">
                {isEliminated && (
                  <p className="mb-3 text-sm text-cyan-100/90">
                    {t("tournament.room.spectateEliminatedHint")}
                  </p>
                )}
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-200/70">
                  {t("tournament.room.spectateTitle")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {spectateTables.map((tab) => (
                    <Link
                      key={tab.gameId}
                      to={`/game?gameId=${encodeURIComponent(tab.gameId)}&spectate=1&tournamentId=${encodeURIComponent(id)}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/35 bg-cyan-500/15 px-4 py-2.5 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/50 hover:bg-cyan-500/25"
                    >
                      <Eye className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                      {t("tournament.room.spectateTableLabel", {
                        round: tab.roundNumber,
                        count: tab.playerCount,
                      })}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {players.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/35">
                  {t("tournament.room.playersSection")}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <li
                      key={p.userId}
                      className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 py-1 pl-1 pr-2"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/40 to-fuchsia-600/30 text-xs font-bold text-white">
                        {initialFromUsername(p.user?.username)}
                      </span>
                      <span className="max-w-[10rem] truncate text-sm text-white/85">
                        {p.user?.username ?? t("tournament.room.playerUnknown")}
                      </span>
                      {p.userId === hostId && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-amber-200/90">
                          {t("tournament.room.hostBadge")}
                        </span>
                      )}
                      {isHost && registrationOpen && p.userId !== hostId && (
                        <button
                          type="button"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-500/35 bg-red-500/10 text-red-200/95 transition hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-40"
                          disabled={kickingUserId !== null}
                          aria-busy={kickingUserId === p.userId}
                          aria-label={t("tournament.room.kickAria", {
                            name: p.user?.username ?? "",
                          })}
                          title={t("tournament.room.kick")}
                          onClick={async () => {
                            const name = p.user?.username ?? p.userId;
                            if (
                              !window.confirm(
                                t("tournament.room.kickConfirm", { name }),
                              )
                            ) {
                              return;
                            }
                            if (!id) return;
                            setKickingUserId(p.userId);
                            setErr(null);
                            try {
                              await kickTournamentPlayer(id, p.userId);
                              await reload();
                            } catch (e) {
                              setErr((e as Error).message);
                            } finally {
                              setKickingUserId(null);
                            }
                          }}
                        >
                          <UserX className="h-4 w-4" aria-hidden strokeWidth={2.25} />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-xl border border-white/8 bg-black/20 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/35">
                {t("tournament.room.actions")}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {registrationOpen && !isMember && (
                  <>
                    {joinNeedsCode && (
                      <input
                        type="password"
                        placeholder={t("tournament.room.joinPlaceholder")}
                        className={fieldJoin}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        autoComplete="new-password"
                      />
                    )}
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={!canSubmitJoin}
                      onClick={async () => {
                        try {
                          await joinTournament(
                            id,
                            joinNeedsCode ? joinCode.trim() : undefined,
                          );
                          setJoinCode("");
                          await reload();
                        } catch (e) {
                          setErr((e as Error).message);
                        }
                      }}
                    >
                      {t("tournament.room.join")}
                    </button>
                  </>
                )}
                {registrationOpen && isMember && (
                  <span className="rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-200/95">
                    {t("tournament.room.badgeIn")}
                  </span>
                )}
                {registrationOpen && isFull && !isMember && (
                  <span className="rounded-lg bg-white/5 px-3 py-2 text-sm text-white/45">
                    {t("tournament.room.full")}
                  </span>
                )}
                {registrationOpen && isMember && (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={async () => {
                      try {
                        await leaveTournament(id);
                        await reload();
                      } catch (e) {
                        setErr((e as Error).message);
                      }
                    }}
                  >
                    {t("tournament.room.leave")}
                  </button>
                )}
                {isHost && registrationOpen && (
                  <button
                    type="button"
                    className={btnHost}
                    disabled={!canHostStartNow}
                    title={
                      playerCount < TOURNAMENT_MIN_PLAYERS
                        ? t("tournament.room.startMinHint", {
                            min: TOURNAMENT_MIN_PLAYERS,
                            current: playerCount,
                          })
                        : undefined
                    }
                    onClick={async () => {
                      if (!canHostStartNow) return;
                      try {
                        await startTournamentHost(id);
                        await reload();
                      } catch (e) {
                        setErr((e as Error).message);
                      }
                    }}
                  >
                    {t("tournament.room.startNow")}
                  </button>
                )}
                {inProgress && (
                  <Link
                    to={`/tournaments/${id}/waiting`}
                    className={`${btnGhost} inline-flex items-center no-underline`}
                  >
                    {t("tournament.room.waitingRoom")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
