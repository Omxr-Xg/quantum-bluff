import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronRight, Eye, Minus, Plus, Trophy } from "lucide-react";
import { useSocket } from "../../../hooks/useSocket";
import {
  createTournament,
  fetchLiveSpectateTournaments,
  fetchTournaments,
} from "../services/tournamentApi";
import {
  TOURNAMENT_MAX_PLAYERS,
  TOURNAMENT_MIN_PLAYERS,
} from "../tournamentConstants";

type Row = {
  id: string;
  name: string;
  startAt: string;
  maxPlayers: number;
  blindSmall: number;
  blindBig: number;
  _count: { players: number };
};

type LiveSpectateTournament = {
  tournamentId: string;
  name: string;
  status: string;
  tables: { gameId: string; roundNumber: number; playerCount: number }[];
};

type Visibility = "PUBLIC" | "PRIVATE";

const field =
  "w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-violet-400/50 focus:ring-2 focus:ring-violet-500/25";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateToStartAtLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function defaultStartLocal(): string {
  return dateToStartAtLocal(new Date(Date.now() + 60 * 60 * 1000));
}

function startAtLocalFromNowPlusMinutes(minutes: number): string {
  return dateToStartAtLocal(new Date(Date.now() + minutes * 60 * 1000));
}

function clampTournamentMaxPlayers(raw: string): number {
  const v = Number.parseInt(raw, 10);
  if (Number.isNaN(v)) return TOURNAMENT_MIN_PLAYERS;
  return Math.min(TOURNAMENT_MAX_PLAYERS, Math.max(TOURNAMENT_MIN_PLAYERS, v));
}

function formatStartShort(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function TournamentLobby() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { socket } = useSocket();
  const [rows, setRows] = useState<Row[]>([]);
  const [liveSpectate, setLiveSpectate] = useState<LiveSpectateTournament[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const [formName, setFormName] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [initialStack, setInitialStack] = useState(2000);
  const [blindSmall, setBlindSmall] = useState(10);
  const [blindBig, setBlindBig] = useState(20);
  const [startAtLocal, setStartAtLocal] = useState(defaultStartLocal);

  const load = useCallback(async () => {
    try {
      setErr(null);
      const [open, live] = await Promise.all([
        fetchTournaments(),
        fetchLiveSpectateTournaments(),
      ]);
      setRows(open);
      setLiveSpectate(live as LiveSpectateTournament[]);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const joinLobby = () => {
      if (socket.connected) socket.emit("JOIN_TOURNAMENT_LOBBY");
    };
    const onListUpdated = () => {
      void load();
    };
    joinLobby();
    socket.on("connect", joinLobby);
    socket.on("TOURNAMENT_LOBBY_LIST_UPDATED", onListUpdated);
    return () => {
      socket.off("connect", joinLobby);
      socket.off("TOURNAMENT_LOBBY_LIST_UPDATED", onListUpdated);
      if (socket.connected) socket.emit("LEAVE_TOURNAMENT_LOBBY");
    };
  }, [socket, load]);

  const resetForm = useCallback(() => {
    setFormName("");
    setVisibility("PUBLIC");
    setJoinCode("");
    setMaxPlayers(8);
    setInitialStack(2000);
    setBlindSmall(10);
    setBlindBig(20);
    setStartAtLocal(defaultStartLocal());
  }, []);

  const validateForm = useCallback((): string | null => {
    if (!formName.trim()) return t("tournament.arena.valName");
    if (visibility === "PRIVATE" && joinCode.trim().length < 4) {
      return t("tournament.arena.valJoinCode");
    }
    if (
      !Number.isFinite(maxPlayers) ||
      Math.floor(maxPlayers) !== maxPlayers ||
      maxPlayers < TOURNAMENT_MIN_PLAYERS ||
      maxPlayers > TOURNAMENT_MAX_PLAYERS
    ) {
      return t("tournament.arena.valMaxPlayers", {
        min: TOURNAMENT_MIN_PLAYERS,
        max: TOURNAMENT_MAX_PLAYERS,
      });
    }
    const start = new Date(startAtLocal);
    if (Number.isNaN(start.getTime())) return t("tournament.arena.valStartInvalid");
    if (start.getTime() < Date.now() - 15_000) {
      return t("tournament.arena.valStartFuture");
    }
    if (
      !Number.isFinite(initialStack) ||
      Math.floor(initialStack) !== initialStack ||
      initialStack < 100 ||
      initialStack > 100_000_000
    ) {
      return t("tournament.arena.valStack");
    }
    if (
      !Number.isFinite(blindSmall) ||
      !Number.isFinite(blindBig) ||
      Math.floor(blindSmall) !== blindSmall ||
      Math.floor(blindBig) !== blindBig
    ) {
      return t("tournament.arena.valBlinds");
    }
    if (blindSmall < 1 || blindBig < 1) return t("tournament.arena.valBlinds");
    if (blindSmall > 10_000_000 || blindBig > 10_000_000)
      return t("tournament.arena.valBlindsMax");
    if (blindSmall > blindBig) {
      return t("tournament.arena.valSbBb");
    }
    return null;
  }, [
    t,
    formName,
    visibility,
    joinCode,
    maxPlayers,
    startAtLocal,
    initialStack,
    blindSmall,
    blindBig,
  ]);

  const submitCreate = async () => {
    const v = validateForm();
    if (v) {
      setErr(v);
      return;
    }
    setCreating(true);
    try {
      setErr(null);
      const body: Record<string, unknown> = {
        name: formName.trim(),
        visibility,
        maxPlayers,
        initialStack,
        blindSmall,
        blindBig,
        startAt: new Date(startAtLocal).toISOString(),
      };
      if (visibility === "PRIVATE") body.joinCode = joinCode.trim();
      const { id } = await createTournament(body);
      setShowModal(false);
      resetForm();
      await load();
      nav(`/tournaments/${id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const quickCreate = async () => {
    setCreating(true);
    try {
      setErr(null);
      const start = new Date(Date.now() + 60_000).toISOString();
      const { id } = await createTournament({
        name: t("tournament.arena.quickName", {
          time: new Date().toLocaleTimeString(),
        }),
        visibility: "PUBLIC",
        maxPlayers: 8,
        initialStack: 2000,
        startAt: start,
        blindSmall: 10,
        blindBig: 20,
      });
      await load();
      nav(`/tournaments/${id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-violet-950/20 to-slate-950 pb-20 pt-8 text-white">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Link
          to="/lobby"
          className="mb-6 inline-flex items-center gap-2 text-sm text-violet-300/90 transition hover:text-violet-200"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          {t("tournament.arena.backToLobby")}
        </Link>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300/80">
              {t("tournament.arena.badge")}
            </p>
            <h1 className="mt-1 bg-gradient-to-r from-white to-violet-200/90 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              {t("tournament.arena.title")}
            </h1>
            <p className="mt-2 max-w-md text-sm text-white/50">
              {t("tournament.arena.subtitle")}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-lg shadow-amber-900/30 transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-50"
              disabled={creating}
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
            >
              {t("tournament.arena.create")}
            </button>
            <button
              type="button"
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/90 transition hover:border-white/25 hover:bg-white/10 disabled:opacity-50"
              disabled={creating}
              onClick={() => void quickCreate()}
            >
              {t("tournament.arena.quickCreate")}
            </button>
          </div>
        </div>

        {err && (
          <div
            className="mt-8 rounded-xl border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100/95 shadow-inner"
            role="alert"
          >
            {err}
          </div>
        )}

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
              {t("tournament.arena.listTitle")}
            </h2>
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/45">
              {rows.length}
            </span>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10">
                <Trophy className="h-9 w-9 text-amber-300/90" aria-hidden strokeWidth={1.25} />
              </div>
              <p className="text-base font-medium text-white/80">
                {t("tournament.arena.emptyTitle")}
              </p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-white/45">
                {t("tournament.arena.emptyHint")}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const fill = Math.min(
                  100,
                  Math.round((row._count.players / row.maxPlayers) * 100),
                );
                return (
                  <li key={row.id}>
                    <Link
                      to={`/tournaments/${row.id}`}
                      className="group relative flex items-stretch overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-lg shadow-black/20 transition hover:border-violet-400/30 hover:bg-white/[0.07]"
                    >
                      <div className="w-1 shrink-0 bg-gradient-to-b from-violet-500 to-fuchsia-600 opacity-80 group-hover:opacity-100" />
                      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <div className="font-semibold tracking-tight text-white group-hover:text-violet-100">
                            {row.name}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/45">
                            <span>
                              {t("tournament.arena.rowStarts")}{" "}
                              <span className="text-white/70">
                                {formatStartShort(row.startAt)}
                              </span>
                            </span>
                            <span className="hidden sm:inline">·</span>
                            <span>
                              {t("tournament.arena.rowBlinds", {
                                small: row.blindSmall,
                                big: row.blindBig,
                              })}
                            </span>
                          </div>
                          <div className="mt-3 h-1.5 max-w-xs overflow-hidden rounded-full bg-black/40">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all group-hover:from-violet-400 group-hover:to-fuchsia-400"
                              style={{ width: `${fill}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                          <div className="rounded-lg bg-black/30 px-3 py-1.5 text-center text-xs">
                            <span className="font-mono text-lg font-bold tabular-nums text-white">
                              {row._count.players}
                            </span>
                            <span className="text-white/35"> / </span>
                            <span className="font-mono text-white/60">
                              {row.maxPlayers}
                            </span>
                          </div>
                          <ChevronRight
                            className="h-5 w-5 text-violet-300/80 transition group-hover:translate-x-0.5 group-hover:text-violet-200"
                            aria-hidden
                          />
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mt-14 border-t border-white/10 pt-10">
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white/40">
              {t("tournament.arena.liveSpectateTitle")}
            </h2>
            <p className="mt-1 max-w-xl text-xs text-white/45">
              {t("tournament.arena.liveSpectateSubtitle")}
            </p>
          </div>
          {liveSpectate.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-10 text-center text-sm text-white/45">
              {t("tournament.arena.liveSpectateEmpty")}
            </div>
          ) : (
            <ul className="space-y-4">
              {liveSpectate.map((tour) => (
                <li
                  key={tour.tournamentId}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/15"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      to={`/tournaments/${tour.tournamentId}`}
                      className="font-semibold text-white transition hover:text-violet-200"
                    >
                      {tour.name}
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      {tour.tables.map((tab) => (
                        <Link
                          key={tab.gameId}
                          to={`/game?gameId=${encodeURIComponent(tab.gameId)}&spectate=1&tournamentId=${encodeURIComponent(tour.tournamentId)}`}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/35 bg-cyan-500/10 px-3 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-500/20"
                        >
                          <Eye className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
                          <span>
                            {t("tournament.arena.spectateCta")} ·{" "}
                            {t("tournament.room.spectateTableLabel", {
                              round: tab.roundNumber,
                              count: tab.playerCount,
                            })}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tournament-create-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
              setErr(null);
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-violet-950/40 ring-1 ring-violet-500/15">
            <div className="border-b border-white/5 bg-gradient-to-r from-violet-600/25 via-fuchsia-600/10 to-transparent px-6 py-5">
              <h2
                id="tournament-create-title"
                className="text-lg font-semibold tracking-tight"
              >
                {t("tournament.arena.modalTitle")}
              </h2>
              <p className="mt-1 text-xs text-white/50">
                {t("tournament.arena.modalHint")}
              </p>
            </div>
            <div className="space-y-6 p-6 text-sm">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300/80">
                  {t("tournament.arena.sectionGeneral")}
                </p>
                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-white/50">
                      {t("tournament.arena.labelName")}
                    </span>
                    <input
                      className={field}
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      maxLength={80}
                      placeholder={t("tournament.arena.namePlaceholder")}
                      autoComplete="off"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-white/50">
                      {t("tournament.arena.labelVisibility")}
                    </span>
                    <select
                      className={field}
                      value={visibility}
                      onChange={(e) =>
                        setVisibility(e.target.value as Visibility)
                      }
                    >
                      <option value="PUBLIC">
                        {t("tournament.arena.visibilityPublic")}
                      </option>
                      <option value="PRIVATE">
                        {t("tournament.arena.visibilityPrivate")}
                      </option>
                    </select>
                  </label>
                  {visibility === "PRIVATE" && (
                    <label className="block space-y-1.5">
                      <span className="text-xs text-white/50">
                        {t("tournament.arena.labelJoinCode")}
                      </span>
                      <input
                        className={field}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        type="password"
                        placeholder="••••"
                        autoComplete="new-password"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300/80">
                  {t("tournament.arena.sectionStructure")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-white/50">
                      {t("tournament.arena.labelMaxPlayers")}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        aria-label={t("tournament.arena.ariaDecPlayers")}
                        disabled={maxPlayers <= TOURNAMENT_MIN_PLAYERS}
                        className="flex h-[2.625rem] w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/35 text-white transition hover:border-violet-400/40 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-35"
                        onClick={() =>
                          setMaxPlayers((p) => Math.max(TOURNAMENT_MIN_PLAYERS, p - 1))
                        }
                      >
                        <Minus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </button>
                      <input
                        type="number"
                        min={TOURNAMENT_MIN_PLAYERS}
                        max={TOURNAMENT_MAX_PLAYERS}
                        className={`${field} min-w-0 flex-1 text-center tabular-nums`}
                        value={maxPlayers}
                        onChange={(e) =>
                          setMaxPlayers(clampTournamentMaxPlayers(e.target.value))
                        }
                      />
                      <button
                        type="button"
                        aria-label={t("tournament.arena.ariaIncPlayers")}
                        disabled={maxPlayers >= TOURNAMENT_MAX_PLAYERS}
                        className="flex h-[2.625rem] w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/35 text-white transition hover:border-violet-400/40 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-35"
                        onClick={() =>
                          setMaxPlayers((p) => Math.min(TOURNAMENT_MAX_PLAYERS, p + 1))
                        }
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </button>
                    </div>
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-white/50">
                      {t("tournament.arena.labelStack")}
                    </span>
                    <input
                      type="number"
                      min={100}
                      className={field}
                      value={initialStack}
                      onChange={(e) =>
                        setInitialStack(Number.parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </label>
                </div>
              </div>

              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300/80">
                  {t("tournament.arena.sectionBlinds")}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs text-white/50">
                      {t("tournament.arena.labelSmallBlind")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      className={field}
                      value={blindSmall}
                      onChange={(e) =>
                        setBlindSmall(Number.parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs text-white/50">
                      {t("tournament.arena.labelBigBlind")}
                    </span>
                    <input
                      type="number"
                      min={1}
                      className={field}
                      value={blindBig}
                      onChange={(e) =>
                        setBlindBig(Number.parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </label>
                </div>
                <label className="mt-3 block space-y-1.5">
                  <span className="text-xs text-white/50">
                    {t("tournament.arena.labelStart")}
                  </span>
                  <input
                    type="datetime-local"
                    className={field}
                    value={startAtLocal}
                    onChange={(e) => setStartAtLocal(e.target.value)}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {([2, 5, 15] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        className="rounded-lg border border-violet-400/35 bg-violet-500/15 px-3 py-1.5 text-xs font-semibold text-violet-100 transition hover:border-violet-300/50 hover:bg-violet-500/25"
                        onClick={() => setStartAtLocal(startAtLocalFromNowPlusMinutes(m))}
                      >
                        {t("tournament.arena.plusMinutes", { minutes: m })}
                      </button>
                    ))}
                  </div>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-white/5 bg-black/20 px-6 py-4">
              <button
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 hover:text-white"
                disabled={creating}
                onClick={() => {
                  setShowModal(false);
                  setErr(null);
                }}
              >
                {t("tournament.arena.cancel")}
              </button>
              <button
                type="button"
                className="rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-900 shadow-md shadow-amber-900/25 transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-50"
                disabled={creating}
                onClick={() => void submitCreate()}
              >
                {creating
                  ? t("tournament.arena.submitting")
                  : t("tournament.arena.submit")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
