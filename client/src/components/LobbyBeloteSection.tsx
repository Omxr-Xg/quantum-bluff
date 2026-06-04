import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Eye, Globe, Loader2, Lock, Plus, Server } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";

type BeloteVisibility = "PUBLIC" | "PRIVATE";

export type BeloteRoomListItem = {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  visibility: BeloteVisibility;
  status: string;
  targetScore: number;
  gameId: string | null;
  players: Array<{
    id: string;
    username: string;
    position: number;
    isReady: boolean;
    avatarUrl?: string | null;
  }>;
  presentUserIds?: string[];
};

export type BeloteGameInProgressItem = {
  roomId: string;
  roomName: string;
  gameId: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  canJoin: boolean;
};

const beloteAccent = {
  serverIcon: "text-emerald-200",
  primaryBtn:
    "border-emerald-300/15 bg-emerald-950/75 hover:border-emerald-200/25 hover:bg-emerald-900/80",
  joinBtn: "bg-emerald-900 hover:bg-emerald-800",
  minBalance: "text-emerald-200/95",
};

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function phaseLabel(phase: string, t: (k: string) => string): string {
  if (phase === "BIDDING" || phase === "BIDDING_ROUND_1" || phase === "BIDDING_ROUND_2") {
    return t("belote.phaseBidding");
  }
  if (phase === "CONTREE_ROUND") return t("belote.phaseContree");
  if (phase === "PLAYING") return t("belote.phasePlaying");
  if (phase === "DEAL_END") return t("belote.phaseDealEnd");
  return phase;
}

export function LobbyBeloteSection({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = useUser();
  const { addToast } = useToast();

  const [rooms, setRooms] = useState<BeloteRoomListItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [games, setGames] = useState<BeloteGameInProgressItem[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVis, setNewVis] = useState<BeloteVisibility>("PUBLIC");
  const [newTarget, setNewTarget] = useState(1500);
  const [newPassword, setNewPassword] = useState("");
  const [requestingRoom, setRequestingRoom] = useState<string | null>(null);

  const waitingRooms = useMemo(
    () => rooms.filter((r) => r.status === "WAITING"),
    [rooms],
  );

  const loadWaitingRooms = useCallback(async () => {
    const res = await fetch(apiUrl("/api/belote-rooms"), { headers: authHeaders() });
    if (!res.ok) {
      setRoomsError(t("common.error"));
      return;
    }
    const data = (await res.json()) as { rooms: BeloteRoomListItem[] };
    setRooms(data.rooms ?? []);
    setRoomsError(null);
  }, [t]);

  const loadGamesInProgress = useCallback(async () => {
    const res = await fetch(apiUrl("/api/belote-rooms/games-in-progress"), {
      headers: authHeaders(),
    });
    if (!res.ok) return;
    const data = (await res.json()) as BeloteGameInProgressItem[];
    setGames(Array.isArray(data) ? data : []);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadWaitingRooms(), loadGamesInProgress()]);
  }, [loadWaitingRooms, loadGamesInProgress]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      setRoomsLoading(true);
      setGamesLoading(true);
      await refresh();
      if (!cancelled) {
        setRoomsLoading(false);
        setGamesLoading(false);
      }
    })();
    const iv = window.setInterval(() => void refresh(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [active, refresh]);

  useEffect(() => {
    const roomId = searchParams.get("beloteRoom");
    if (active && roomId) {
      navigate(`/belote/waiting-room?roomId=${encodeURIComponent(roomId)}`, { replace: true });
    }
  }, [active, searchParams, navigate]);

  const createRoom = async () => {
    const name = newName.trim() || t("belote.defaultRoomName");
    setCreating(true);
    try {
      const res = await fetch(apiUrl("/api/belote-rooms/create"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          visibility: newVis,
          targetScore: newTarget,
          ...(newPassword ? { password: newPassword } : {}),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? t("common.error"));
      }
      const data = (await res.json()) as { room: BeloteRoomListItem };
      setShowCreate(false);
      navigate(`/belote/waiting-room?roomId=${data.room.id}`);
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setCreating(false);
    }
  };

  const joinWaitingRoom = (id: string) => {
    navigate(`/belote/waiting-room?roomId=${id}`);
  };

  const joinGame = (game: BeloteGameInProgressItem) => {
    navigate(`/belote/game?gameId=${encodeURIComponent(game.gameId)}`);
  };

  const handleRequestJoin = async (roomId: string) => {
    setRequestingRoom(roomId);
    try {
      const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}/request-join`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? t("common.error"));
      }
      addToast(t("lobby.requestSent"), "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setRequestingRoom(null);
    }
  };

  const handleSpectateComingSoon = () => {
    addToast(t("belote.spectateComingSoon"), "info");
  };

  if (!active) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
      <h2 className="mb-3 flex items-center gap-3 text-xl font-bold text-white xl:text-2xl">
        <Server className={`h-7 w-7 xl:h-8 xl:w-8 ${beloteAccent.serverIcon}`} />
        {t("lobby.multiplayerServers")}
      </h2>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          disabled={!userId || creating}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 font-bold text-white shadow-lg shadow-black/20 transition disabled:cursor-not-allowed disabled:bg-slate-700/70 md:py-4 ${beloteAccent.primaryBtn}`}
        >
          {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          {creating ? t("lobby.creating") : t("lobby.createNewServer")}
        </button>

        {showCreate ? (
          <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
            <input
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
              placeholder={t("belote.roomName")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewVis("PUBLIC")}
                className={`flex flex-1 flex-col items-center rounded-lg py-2 text-sm font-semibold ${newVis === "PUBLIC" ? "bg-emerald-700 text-white" : "bg-slate-800 text-gray-400"}`}
              >
                <Globe className="mb-1 h-4 w-4" />
                {t("lobby.public")}
              </button>
              <button
                type="button"
                onClick={() => setNewVis("PRIVATE")}
                className={`flex flex-1 flex-col items-center rounded-lg py-2 text-sm font-semibold ${newVis === "PRIVATE" ? "bg-emerald-700 text-white" : "bg-slate-800 text-gray-400"}`}
              >
                <Lock className="mb-1 h-4 w-4" />
                {t("lobby.private")}
              </button>
            </div>
            <label className="block text-xs text-gray-400">
              {t("belote.targetScore")}
              <input
                type="number"
                min={500}
                max={2000}
                step={100}
                className="mt-1 w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
                value={newTarget}
                onChange={(e) => setNewTarget(Number(e.target.value) || 1500)}
              />
            </label>
            <input
              type="password"
              className="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-white"
              placeholder={t("belote.passwordOptional")}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              disabled={creating || !userId}
              onClick={() => void createRoom()}
              className="w-full rounded-xl bg-emerald-700 py-2 font-bold text-white disabled:opacity-50"
            >
              {t("belote.createRoom")}
            </button>
          </div>
        ) : null}

        {/* Salles d'attente */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <p className="mb-2 text-sm font-semibold text-gray-300">{t("lobby.waitingRooms")}</p>
          {roomsLoading && waitingRooms.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-2 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </p>
          ) : roomsError ? (
            <p className="py-2 text-center text-sm text-red-400">{roomsError}</p>
          ) : waitingRooms.length === 0 ? (
            <p className="py-2 text-center text-gray-500">{t("lobby.noServersAvailable")}</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {waitingRooms.map((room) => {
                const count = room.players?.length ?? 0;
                const isHost = userId && room.hostId === userId;
                const isFull = count >= room.maxPlayers;
                const isPrivate = room.visibility === "PRIVATE";
                const alreadyIn = room.players.some((p) => p.id === userId);
                return (
                  <li
                    key={room.id}
                    className="relative rounded-md border border-white/10 bg-white/[0.055] px-1.5 py-1 pr-[13rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md sm:pr-[15rem]"
                  >
                    <div className="min-w-0">
                      <p className="min-w-0 truncate text-left text-xs font-medium leading-none text-white sm:text-[13px]">
                        {room.name}
                      </p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-px text-[10px] leading-none text-gray-400">
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {t("lobby.playersCount", { count, max: room.maxPlayers })}
                        </span>
                        <span className={`shrink-0 text-[10px] ${beloteAccent.minBalance}`}>
                          {room.targetScore} {t("belote.points")}
                        </span>
                      </div>
                    </div>
                    <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap">
                      {isPrivate ? (
                        <span className="flex min-h-7 w-24 shrink-0 items-center justify-center gap-0.5 rounded border border-purple-500/35 bg-purple-600/25 px-1 py-1 text-[9px] font-semibold leading-none text-purple-200 sm:w-28 sm:text-[10px]">
                          <Lock className="h-2.5 w-2.5" aria-hidden />
                          {t("lobby.private")}
                        </span>
                      ) : (
                        <span className="flex min-h-7 w-24 shrink-0 items-center justify-center gap-0.5 rounded border border-green-500/35 bg-green-600/25 px-1 py-1 text-[9px] font-semibold leading-none text-green-200 sm:w-28 sm:text-[10px]">
                          <Globe className="h-2.5 w-2.5" aria-hidden />
                          {t("lobby.public")}
                        </span>
                      )}
                      {isFull && !alreadyIn ? (
                        <span className="flex min-h-7 w-24 cursor-not-allowed items-center justify-center rounded bg-slate-700 px-1 py-1 text-[9px] font-semibold text-gray-500 sm:w-28 sm:text-[10px]">
                          {t("lobby.roomFull")}
                        </span>
                      ) : isPrivate && !isHost && !alreadyIn ? (
                        <button
                          type="button"
                          onClick={() => void handleRequestJoin(room.id)}
                          disabled={requestingRoom === room.id}
                          className="flex min-h-7 w-24 max-w-full items-center justify-center gap-0.5 rounded bg-purple-600 px-1 py-1 text-[9px] font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-800 sm:w-28 sm:text-[10px]"
                        >
                          {requestingRoom === room.id ? (
                            <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
                          ) : (
                            <Lock className="h-2.5 w-2.5 shrink-0" />
                          )}
                          {t("lobby.requestJoin")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => joinWaitingRoom(room.id)}
                          className={`min-h-7 w-24 shrink-0 rounded px-1 py-1 text-[9px] font-semibold text-white transition sm:w-28 sm:text-[10px] ${beloteAccent.joinBtn}`}
                        >
                          {t("lobby.join")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Parties en cours */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <p className="mb-2 text-sm font-semibold text-gray-300">{t("lobby.gamesInProgress")}</p>
          {gamesLoading && games.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-2 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </p>
          ) : games.length === 0 ? (
            <p className="py-2 text-center text-gray-500">{t("belote.noGamesInProgress")}</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {games.map((g) => (
                <li
                  key={g.gameId}
                  className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.055] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
                >
                  <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-1.5 sm:gap-x-2">
                    <p className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-snug text-white sm:text-[15px]">
                      {g.roomName}
                    </p>
                    <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1 sm:gap-1.5">
                      {g.canJoin ? (
                        <button
                          type="button"
                          onClick={() => joinGame(g)}
                          className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold text-white transition sm:px-2 sm:text-[11px] ${beloteAccent.joinBtn}`}
                        >
                          {t("lobby.join")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={handleSpectateComingSoon}
                        className="flex shrink-0 items-center gap-0.5 rounded-md bg-slate-700/80 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-600/90 sm:gap-1 sm:px-2 sm:text-[11px]"
                      >
                        <Eye className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                        <span className="whitespace-nowrap">{t("lobby.spectate")}</span>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {t("lobby.playersCount", { count: g.playerCount, max: g.maxPlayers })} ·{" "}
                    {phaseLabel(g.phase, t)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
