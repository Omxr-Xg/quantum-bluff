import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Eye, Loader2, Trophy, Zap } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useNumberFieldInput, NUMBER_FIELD_INVALID_CLASS } from "../hooks/useNumberFieldInput";
import {
  createTournament,
  fetchLiveSpectateTournaments,
  fetchTournaments,
} from "../features/tournament/services/tournamentApi";
import {
  BELOTE_TOURNAMENT_MAX_PLAYERS,
  BELOTE_TOURNAMENT_MIN_PLAYERS,
  BELOTE_TOURNAMENT_PLAYER_OPTIONS,
} from "../features/tournament/tournamentConstants";
import {
  BELOTE_BUY_IN_DEFAULT,
  BELOTE_BUY_IN_PRESETS,
  normalizeBeloteBuyIn,
} from "../features/belote/beloteBuyIn";
import {
  BELOTE_VARIANT_OPTIONS,
  type BeloteGameVariant,
  variantLabelKey,
} from "../features/belote/beloteVariants";
import { formatFetchError } from "../utils/fetchErrors";
import { shouldShowPollError } from "../utils/resilientPoll";
import { LobbyActivitySection, lobbyTournamentSectionClass } from "./LobbyActivityBlocks";

type OpenItem = {
  id: string;
  name: string;
  maxPlayers: number;
  beloteVariant?: BeloteGameVariant;
  beloteTargetScore?: number;
  beloteBuyIn?: number;
  _count: { players: number };
};

type LiveItem = {
  tournamentId: string;
  name: string;
  tables: { gameId: string; roundNumber: number; playerCount: number }[];
};

function defaultStartLocal(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type LobbyBeloteTournamentPanelProps = {
  active: boolean;
};

const beloteTournamentSectionClass =
  "flex min-h-0 min-w-0 flex-col rounded-2xl border border-emerald-400/15 bg-emerald-950/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl sm:p-5";

export function LobbyBeloteTournamentPanel({ active }: LobbyBeloteTournamentPanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [open, setOpen] = useState<OpenItem[]>([]);
  const [live, setLive] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollFailuresRef = useRef(0);

  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [joinCode, setJoinCode] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [variant, setVariant] = useState<BeloteGameVariant>("CONTEE");
  const [targetScore, setTargetScore] = useState(1000);
  const [buyIn, setBuyIn] = useState(BELOTE_BUY_IN_DEFAULT);
  const [customBuyIn, setCustomBuyIn] = useState("");
  const [startAtLocal, setStartAtLocal] = useState(defaultStartLocal);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const targetScoreField = useNumberFieldInput({
    value: targetScore,
    onChange: setTargetScore,
    min: 500,
    max: 2000,
  });

  const load = useCallback(async () => {
    try {
      const [openRes, liveRes] = await Promise.allSettled([
        fetchTournaments("BELOTE"),
        fetchLiveSpectateTournaments("BELOTE"),
      ]);
      const openNext =
        openRes.status === "fulfilled" && Array.isArray(openRes.value)
          ? (openRes.value as OpenItem[])
          : [];
      const liveNext =
        liveRes.status === "fulfilled" && Array.isArray(liveRes.value)
          ? (liveRes.value as LiveItem[])
          : [];
      setOpen(openNext);
      setLive(liveNext);
      pollFailuresRef.current = 0;
      setError(null);
    } catch (e) {
      pollFailuresRef.current += 1;
      if (shouldShowPollError(open.length + live.length > 0, pollFailuresRef.current)) {
        setError(formatFetchError(e, t));
      }
    } finally {
      setLoading(false);
    }
  }, [t, open.length, live.length]);

  useEffect(() => {
    if (!active) return;
    setLoading(true);
    const first = window.setTimeout(() => void load(), 80);
    const iv = window.setInterval(() => void load(), 10_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(iv);
    };
  }, [active, load]);

  useEffect(() => {
    if (!active || !socket) return;
    const join = () => socket.emit("JOIN_TOURNAMENT_LOBBY");
    join();
    socket.on("connect", join);
    const onList = () => void load();
    socket.on("TOURNAMENT_LOBBY_LIST_UPDATED", onList);
    return () => {
      socket.off("connect", join);
      socket.off("TOURNAMENT_LOBBY_LIST_UPDATED", onList);
    };
  }, [active, socket, load]);

  const resetForm = () => {
    setName("");
    setVisibility("PUBLIC");
    setJoinCode("");
    setMaxPlayers(8);
    setVariant("CONTEE");
    setTargetScore(1000);
    setBuyIn(BELOTE_BUY_IN_DEFAULT);
    setCustomBuyIn("");
    setStartAtLocal(defaultStartLocal());
    setCreateError(null);
    setExpanded(false);
  };

  const submitCreate = async (quick = false) => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const body: Record<string, unknown> = {
        gameType: "BELOTE",
        name:
          name.trim() ||
          t("belote.tournament.quickName", {
            defaultValue: "Tournoi Belote {{date}}",
            date: new Date().toLocaleDateString(),
          }),
        visibility,
        maxPlayers: quick ? 8 : maxPlayers,
        variant: quick ? "CONTEE" : variant,
        targetScore: quick ? 1000 : targetScore,
        buyIn: quick ? BELOTE_BUY_IN_DEFAULT : buyIn,
        startAt: new Date(startAtLocal).toISOString(),
      };
      if (visibility === "PRIVATE") body.joinCode = joinCode.trim();
      const { id } = await createTournament(body);
      setShowCreate(false);
      resetForm();
      navigate(`/tournaments/${id}`);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setCreating(false);
    }
  };

  if (!active) return null;

  return (
    <>
      <div className={beloteTournamentSectionClass}>
        <h2 className="mb-2 flex shrink-0 items-center gap-2 text-lg font-bold text-white xl:text-xl">
          <Trophy className="h-6 w-6 shrink-0 text-emerald-300 xl:h-7 xl:w-7" />
          {t("belote.tournament.blockTitle", "Tournois Belote")}
        </h2>

        <div className="flex min-h-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowCreate(true);
            }}
            className="flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300/25 bg-emerald-900/70 py-2.5 font-bold text-white shadow-lg shadow-black/20 transition hover:border-emerald-200/40 hover:bg-emerald-800/80 md:py-3"
          >
            <Trophy className="h-5 w-5" />
            {t("belote.tournament.create", "Créer un tournoi")}
          </button>

          <LobbyActivitySection
            title={t("lobby.tournamentWaiting")}
            loading={loading}
            hasItems={open.length > 0}
            itemCount={open.length}
            scrollAfter={5}
            rowHeightPx={80}
            listGapPx={6}
            sectionClassName={lobbyTournamentSectionClass}
            emptyMessage={t("lobby.noTournamentsAvailable")}
            errorMessage={open.length === 0 && error ? t("lobby.syncing") : null}
          >
            {open.map((tour) => (
              <li
                key={tour.id}
                className="flex min-h-[5rem] flex-col justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-3"
              >
                <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-2">
                  <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">
                    {tour.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/tournaments/${tour.id}`)}
                    className="shrink-0 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 sm:px-3 sm:text-sm"
                  >
                    {t("lobby.join")}
                  </button>
                </div>
                <p className="text-sm text-gray-400">
                  {t("lobby.playersCount", { count: tour._count.players, max: tour.maxPlayers })}
                  {" · "}
                  {tour.beloteTargetScore ?? 1000} {t("belote.points")}
                  {tour.beloteBuyIn != null && tour.beloteBuyIn > 0
                    ? ` · ${t("belote.buyInShort", { amount: tour.beloteBuyIn })}`
                    : ""}
                </p>
              </li>
            ))}
          </LobbyActivitySection>

          <LobbyActivitySection
            title={t("lobby.tournamentInProgress")}
            loading={loading}
            hasItems={live.length > 0}
            itemCount={live.length}
            scrollAfter={3}
            rowHeightPx={90}
            listGapPx={6}
            sectionClassName={lobbyTournamentSectionClass}
            emptyMessage={t("lobby.noTournamentsAvailable")}
          >
            {live.map((tour) => {
              const first = tour.tables[0];
              return (
                <li
                  key={tour.tournamentId}
                  className="flex min-h-[5.5rem] flex-col justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-3"
                >
                  <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-medium text-white">
                      {tour.name}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => navigate(`/tournaments/${tour.tournamentId}`)}
                        className="rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600"
                      >
                        {t("lobby.join")}
                      </button>
                      {first ? (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/belote/game?gameId=${encodeURIComponent(first.gameId)}&spectate=1&tournamentId=${encodeURIComponent(tour.tournamentId)}`,
                            )
                          }
                          className="flex items-center gap-1 rounded-lg bg-slate-700/80 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-600/90"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("lobby.spectate")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    {t("lobby.tournamentTables", { count: tour.tables.length })}
                  </p>
                </li>
              );
            })}
          </LobbyActivitySection>
        </div>
      </div>

      {showCreate ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-md"
          onClick={() => !creating && setShowCreate(false)}
          role="presentation"
        >
          <div
            className={`my-auto w-full ${expanded ? "max-w-xl" : "max-w-md"} rounded-2xl border border-emerald-300/20 bg-slate-950/75 p-6 shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
          >
            <h3 className="mb-4 text-xl font-bold text-white">
              {t("belote.tournament.modalTitle", "Nouveau tournoi Belote")}
            </h3>

            <label className="mb-2 block text-sm text-slate-300">{t("tournament.arena.labelName")}</label>
            <input
              className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("belote.tournament.namePlaceholder", "Tournoi du vendredi")}
            />

            {!expanded ? (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void submitCreate(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/30 bg-emerald-900/80 py-3 font-bold text-white"
                >
                  {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                  {t("tournament.arena.quickCreate")}
                </button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => setExpanded(true)}
                  className="rounded-xl border border-white/10 py-3 text-white"
                >
                  {t("tournament.arena.modalTitle")}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    {t("belote.tournament.maxPlayers", "Joueurs")} ({BELOTE_TOURNAMENT_MIN_PLAYERS}-
                    {BELOTE_TOURNAMENT_MAX_PLAYERS})
                  </label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white"
                    value={maxPlayers}
                    onChange={(e) => setMaxPlayers(Number(e.target.value))}
                  >
                    {BELOTE_TOURNAMENT_PLAYER_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">{t("belote.gameVariant")}</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white"
                    value={variant}
                    onChange={(e) => setVariant(e.target.value as BeloteGameVariant)}
                  >
                    {BELOTE_VARIANT_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {t(variantLabelKey(v))}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">{t("belote.targetScore")}</label>
                  <input
                    type="number"
                    className={`w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white ${targetScoreField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                    value={targetScoreField.inputValue}
                    onChange={targetScoreField.handleChange}
                    onBlur={targetScoreField.handleBlur}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">{t("belote.buyInLabel")}</label>
                  <div className="flex flex-wrap gap-2">
                    {BELOTE_BUY_IN_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setBuyIn(preset);
                          setCustomBuyIn("");
                        }}
                        className={`rounded-lg px-3 py-1.5 text-sm ${buyIn === preset && !customBuyIn ? "bg-emerald-700 text-white" : "bg-white/10 text-slate-300"}`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">{t("tournament.arena.labelStart")}</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white"
                    value={startAtLocal}
                    onChange={(e) => setStartAtLocal(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => void submitCreate(false)}
                  className="w-full rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-600"
                >
                  {creating ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t("lobby.validateCreate")}
                </button>
              </div>
            )}

            {createError ? <p className="mt-3 text-sm text-red-400">{createError}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
