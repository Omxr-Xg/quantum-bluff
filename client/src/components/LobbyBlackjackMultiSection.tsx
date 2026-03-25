import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Loader2,
  Users,
  Plus,
  Check,
  Play,
  Club,
  Lock,
  Globe,
  UserPlus,
  Link2,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { useGetFriendsQuery } from "../services/api";
import { apiUrl } from "../utils/apiBase";

type BjVisibility = "PUBLIC" | "PRIVATE";

type MainTab = "poker" | "roulette" | "blackjack";

interface BjSeat {
  id: string;
  userId: string;
  position: number;
  isReady: boolean;
  user: { id: string; username: string };
}

interface BjRoom {
  id: string;
  name: string;
  hostId: string;
  maxSeats: number;
  visibility: BjVisibility;
  status: "WAITING" | "PLAYING";
  gameId: string | null;
  minBet: number;
  seats: BjSeat[];
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type LobbyBlackjackMultiSectionProps = {
  active: boolean;
  onSwitchTab: (tab: MainTab) => void;
};

/**
 * Tables blackjack multijoueur intégrées dans le lobby (onglet Blackjack).
 * `bjRoom` dans l’URL ouvre la salle d’attente ; `tab=blackjack` est conservé.
 */
export function LobbyBlackjackMultiSection({ active, onSwitchTab }: LobbyBlackjackMultiSectionProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId } = useUser();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const { data: friends } = useGetFriendsQuery(userId!, { skip: !userId });

  const roomIdParam = searchParams.get("bjRoom") ?? undefined;

  const [rooms, setRooms] = useState<BjRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomDetail, setRoomDetail] = useState<BjRoom | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMax, setNewMax] = useState(5);
  const [newMinBet, setNewMinBet] = useState(10);
  const [newVis, setNewVis] = useState<BjVisibility>("PUBLIC");
  const [busy, setBusy] = useState<string | null>(null);
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);

  const setBjRoomInUrl = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.set("tab", "blackjack");
          p.set("bjRoom", id);
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearBjRoomInUrl = useCallback(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete("bjRoom");
        p.set("tab", "blackjack");
        return p;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const loadList = useCallback(async () => {
    const res = await fetch(apiUrl("/api/blackjack-tables"), { headers: authHeaders() });
    if (!res.ok) return;
    const data = (await res.json()) as { rooms: BjRoom[] };
    setRooms(data.rooms ?? []);
  }, []);

  const loadRoom = useCallback(
    async (id: string) => {
      const res = await fetch(apiUrl(`/api/blackjack-tables/${id}`), { headers: authHeaders() });
      if (res.status === 404) {
        addToast(t("bjMulti.roomNotFound"), "error");
        clearBjRoomInUrl();
        setRoomDetail(null);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { room: BjRoom };
      setRoomDetail(data.room);
      if (data.room.status === "PLAYING" && data.room.gameId) {
        navigate(`/blackjack/table/${data.room.gameId}`);
      }
    },
    [addToast, clearBjRoomInUrl, navigate, t]
  );

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadList();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, loadList]);

  useEffect(() => {
    if (!active || !roomIdParam) {
      setRoomDetail(null);
      return;
    }
    loadRoom(roomIdParam);
    const id = window.setInterval(() => loadRoom(roomIdParam), 4000);
    return () => window.clearInterval(id);
  }, [active, roomIdParam, loadRoom]);

  useEffect(() => {
    if (!active) return;
    const iv = window.setInterval(() => loadList(), 5000);
    return () => window.clearInterval(iv);
  }, [active, loadList]);

  useEffect(() => {
    setInvitedFriendIds([]);
  }, [roomIdParam]);

  const openRoom = (id: string) => {
    setBjRoomInUrl(id);
  };

  const createRoom = async () => {
    const name = newName.trim() || t("bjMulti.defaultRoomName");
    setCreating(true);
    try {
      const res = await fetch(apiUrl("/api/blackjack-tables"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          maxSeats: newMax,
          minBet: newMinBet,
          visibility: newVis,
        }),
      });
      if (!res.ok) {
        addToast(t("bjMulti.createFailed"), "error");
        return;
      }
      const data = (await res.json()) as { room: BjRoom };
      setShowCreate(false);
      setNewName("");
      await loadList();
      setBjRoomInUrl(data.room.id);
      addToast(t("bjMulti.created"), "success");
    } finally {
      setCreating(false);
    }
  };

  const joinSeat = async (id: string) => {
    setBusy(`join-${id}`);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/${id}/join`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        addToast(t("bjMulti.joinFailed"), "error");
        return;
      }
      setBjRoomInUrl(id);
      await loadRoom(id);
    } finally {
      setBusy(null);
    }
  };

  const leaveSeat = async (id: string) => {
    setBusy(`leave-${id}`);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/${id}/leave`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as { roomDeleted?: boolean };
      if (data.roomDeleted) {
        addToast(t("bjMulti.roomClosed"), "info");
        clearBjRoomInUrl();
        setRoomDetail(null);
        await loadList();
        return;
      }
      if (!res.ok) {
        addToast(t("bjMulti.leaveFailed"), "error");
        return;
      }
      clearBjRoomInUrl();
      setRoomDetail(null);
      await loadList();
    } finally {
      setBusy(null);
    }
  };

  const setReady = async (id: string, ready: boolean) => {
    setBusy(`ready-${id}`);
    try {
      await fetch(apiUrl(`/api/blackjack-tables/${id}/ready`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ ready }),
      });
      await loadRoom(id);
    } finally {
      setBusy(null);
    }
  };

  const copyTableLink = async (roomId: string) => {
    const path = `/lobby?tab=blackjack&bjRoom=${roomId}`;
    const full = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(full);
      addToast(t("bjMulti.linkCopied"), "success");
    } catch {
      addToast(t("bjMulti.linkCopyFailed"), "error");
    }
  };

  const inviteFriendToTable = (roomId: string, friendId: string) => {
    if (!socket?.connected || !userId) {
      addToast(t("bjMulti.inviteNeedConnection"), "error");
      return;
    }
    socket.emit("invite-to-blackjack-room", {
      blackjackRoomId: roomId,
      invitedUserId: friendId,
      inviterId: userId,
    });
    setInvitedFriendIds((prev) => (prev.includes(friendId) ? prev : [...prev, friendId]));
    addToast(t("bjMulti.inviteSent"), "info");
  };

  const deleteTableAsHost = async (roomId: string) => {
    if (!window.confirm(t("bjMulti.deleteTableConfirm"))) return;
    setBusy(`delete-${roomId}`);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/${roomId}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        addToast(err.error ?? t("bjMulti.deleteTableFailed"), "error");
        return;
      }
      addToast(t("bjMulti.tableDeleted"), "success");
      if (roomIdParam === roomId) {
        clearBjRoomInUrl();
        setRoomDetail(null);
      }
      await loadList();
    } finally {
      setBusy(null);
    }
  };

  const startGame = async (id: string) => {
    setBusy(`start-${id}`);
    try {
      const res = await fetch(apiUrl(`/api/blackjack-tables/${id}/start`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        addToast(err.error ?? t("bjMulti.startFailed"), "error");
        return;
      }
      const data = (await res.json()) as { gameId: string };
      navigate(`/blackjack/table/${data.gameId}`);
    } finally {
      setBusy(null);
    }
  };

  if (!active) return null;

  if (roomIdParam && roomDetail) {
    const isHost = roomDetail.hostId === userId;
    const mySeat = roomDetail.seats.find((s) => s.userId === userId);
    const allReady = roomDetail.seats.length > 0 && roomDetail.seats.every((s) => s.isReady);
    const canStartAsHost =
      isHost &&
      roomDetail.seats.length > 0 &&
      (roomDetail.seats.length === 1 || allReady);
    const isPrivate = roomDetail.visibility === "PRIVATE";
    const seatedIds = new Set(roomDetail.seats.map((s) => s.userId));
    const friendsToInvite =
      friends?.filter((f) => f.id !== userId && !seatedIds.has(f.id)) ?? [];

    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-500/50 bg-slate-800 p-6 shadow-lg shadow-rose-950/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                clearBjRoomInUrl();
                setRoomDetail(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-300/90 transition hover:text-rose-200"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("bjMulti.backToList")}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              {isHost && roomDetail.status === "WAITING" ? (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => deleteTableAsHost(roomDetail.id)}
                  className="inline-flex items-center gap-2 rounded-lg border border-rose-600/60 bg-rose-950/50 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-900/60 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("bjMulti.deleteTable")}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  clearBjRoomInUrl();
                  setRoomDetail(null);
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-900/80 text-slate-300 transition hover:border-rose-500/50 hover:bg-slate-800 hover:text-white"
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <Club className="h-9 w-9 shrink-0 text-rose-400" aria-hidden />
              <div className="min-w-0">
                <h2 className="text-2xl font-bold text-white">{roomDetail.name}</h2>
                <p className="mt-1 text-sm leading-relaxed text-gray-400">{t("lobby.blackjackIntro")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isPrivate ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-600/30 px-2 py-0.5 text-[10px] font-semibold text-purple-200">
                      <Lock className="h-2.5 w-2.5" />
                      {t("lobby.private")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-600/25 px-2 py-0.5 text-[10px] font-semibold text-rose-200">
                      <Globe className="h-2.5 w-2.5" />
                      {t("lobby.public")}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {t("bjMulti.minBetLabel")} {roomDetail.minBet} ·{" "}
                    {t("bjMulti.seatsCount", { n: roomDetail.seats.length, max: roomDetail.maxSeats })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-700/50 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-300">{t("lobby.waitingRooms")}</p>
              {roomDetail.seats.length > 0 ? (
                <p className="text-xs text-gray-500">
                  {t("lobby.playersCount", {
                    count: roomDetail.seats.length,
                    max: roomDetail.maxSeats,
                  })}
                </p>
              ) : null}
            </div>
            {roomDetail.seats.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t("bjMulti.noRooms")}</p>
            ) : (
              <ul className="space-y-2">
                {roomDetail.seats
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {s.user.username}
                          {s.userId === roomDetail.hostId ? (
                            <span className="ml-2 text-xs font-normal text-rose-300/80">
                              ({t("bjMulti.host")})
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-gray-500">{t("bjMulti.seatPosition", { n: s.position + 1 })}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                          s.isReady
                            ? "border border-emerald-500/40 bg-emerald-600/25 text-emerald-200"
                            : "border border-amber-500/40 bg-amber-600/20 text-amber-200"
                        }`}
                      >
                        {s.isReady ? t("bjMulti.ready") : t("bjMulti.notReady")}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {isHost && (
            <div className="mt-4 rounded-xl border border-rose-500/30 bg-slate-900/40 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-200">
                <UserPlus className="h-4 w-4 shrink-0" />
                {t("bjMulti.inviteFriends")}
              </h3>
              <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                {friendsToInvite.length === 0 ? (
                  <p className="text-center text-xs text-gray-500">{t("bjMulti.noFriendsToInvite")}</p>
                ) : (
                  friendsToInvite.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-600/80 bg-slate-800/60 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm text-white">{friend.username}</span>
                      <button
                        type="button"
                        disabled={invitedFriendIds.includes(friend.id)}
                        onClick={() => inviteFriendToTable(roomDetail.id, friend.id)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          invitedFriendIds.includes(friend.id)
                            ? "cursor-not-allowed bg-emerald-800/50 text-emerald-200"
                            : "bg-rose-600 text-white hover:bg-rose-500"
                        }`}
                      >
                        {invitedFriendIds.includes(friend.id) ? t("bjMulti.invited") : t("bjMulti.invite")}
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => copyTableLink(roomDetail.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-500 bg-slate-800 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                <Link2 className="h-4 w-4" />
                {t("bjMulti.copyTableLink")}
              </button>
              {isPrivate ? (
                <p className="mt-2 text-xs text-amber-200/80">{t("bjMulti.privateLinkHint")}</p>
              ) : null}
            </div>
          )}

          {roomDetail.seats.length === 1 && mySeat ? (
            <p className="mt-3 text-center text-xs text-emerald-200/90">{t("bjMulti.soloStartHint")}</p>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            {!mySeat && roomDetail.seats.length < roomDetail.maxSeats && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => joinSeat(roomDetail.id)}
                className="w-full rounded-xl bg-rose-700 py-3.5 font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
              >
                {t("bjMulti.takeSeat")}
              </button>
            )}
            {mySeat && (
              <>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => setReady(roomDetail.id, !mySeat.isReady)}
                  className="w-full rounded-xl bg-amber-600 py-3.5 font-bold text-white transition hover:bg-amber-500 disabled:opacity-50 sm:w-auto sm:px-6"
                >
                  {mySeat.isReady ? t("bjMulti.unready") : t("bjMulti.imReady")}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => leaveSeat(roomDetail.id)}
                  className="w-full rounded-xl border-2 border-rose-400/50 bg-slate-800 py-3.5 font-bold text-rose-100 transition hover:bg-slate-700 disabled:opacity-50 sm:w-auto sm:px-6"
                >
                  {t("bjMulti.leaveTable")}
                </button>
              </>
            )}
            {isHost && (
              <button
                type="button"
                disabled={!!busy || !canStartAsHost}
                onClick={() => startGame(roomDetail.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto sm:w-auto sm:px-8"
              >
                <Play className="h-5 w-5" />
                {t("bjMulti.startTable")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (roomIdParam && !roomDetail) {
    return (
      <div className="flex min-h-[12rem] items-center justify-center rounded-2xl border border-rose-500/50 bg-slate-800/80 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
      </div>
    );
  }

  const createModal = showCreate && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-2xl border border-rose-500/50 bg-slate-900 p-6 pt-12 shadow-2xl shadow-rose-950/40 sm:pt-6"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={() => setShowCreate(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800/80 text-slate-300 transition hover:border-rose-500/50 hover:bg-slate-800 hover:text-white"
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Club className="h-6 w-6 text-rose-400" />
          {t("bjMulti.createTable")}
        </h3>
        <label className="mt-4 block text-sm text-slate-300">
          {t("bjMulti.roomName")}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
            placeholder={t("bjMulti.roomNamePlaceholder")}
          />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          {t("bjMulti.maxSeats")}
          <input
            type="number"
            min={2}
            max={7}
            value={newMax}
            onChange={(e) => setNewMax(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
          />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          {t("bjMulti.minBetField")}
          <input
            type="number"
            min={10}
            value={newMinBet}
            onChange={(e) => setNewMinBet(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
          />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          {t("bjMulti.visibility")}
          <select
            value={newVis}
            onChange={(e) => setNewVis(e.target.value as BjVisibility)}
            className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white"
          >
            <option value="PUBLIC">{t("bjMulti.public")}</option>
            <option value="PRIVATE">{t("bjMulti.private")}</option>
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="rounded-lg px-4 py-2 text-slate-300 hover:bg-slate-800"
          >
            {t("bjMulti.cancel")}
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={createRoom}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-700 px-5 py-2.5 font-bold text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("bjMulti.confirmCreate")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-rose-500/50 bg-slate-800 p-6 shadow-lg shadow-rose-950/20">
        <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-white">
          <Users className="h-8 w-8 text-rose-400" aria-hidden />
          {t("bjMulti.lobbyTitle")}
        </h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-rose-200/85">{t("bjMulti.lobbySubtitle")}</p>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => onSwitchTab("poker")}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-rose-200"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("bjMulti.backToPokerTab")}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 py-4 font-bold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-600 sm:w-auto sm:px-8"
          >
            <Plus className="h-5 w-5" />
            {t("bjMulti.createTable")}
          </button>
        </div>

        <div className="rounded-xl bg-slate-700/50 p-4">
          <p className="mb-3 text-sm font-semibold text-gray-300">{t("lobby.waitingRooms")}</p>
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
              {t("common.loading")}
            </p>
          ) : rooms.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">{t("bjMulti.noRooms")}</p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) => {
                const isPrivate = r.visibility === "PRIVATE";
                const isFull = r.seats.length >= r.maxSeats;
                const isHost = r.hostId === userId;
                const canDeleteFromList = isHost && r.status === "WAITING";
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-600 bg-slate-800/70 px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-white">{r.name}</p>
                        {isPrivate ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-purple-500/40 bg-purple-600/30 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300">
                            <Lock className="h-2.5 w-2.5" />
                            {t("lobby.private")}
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-rose-500/40 bg-rose-600/25 px-1.5 py-0.5 text-[10px] font-semibold text-rose-200">
                            <Globe className="h-2.5 w-2.5" />
                            {t("lobby.public")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                        <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        {t("lobby.playersCount", { count: r.seats.length, max: r.maxSeats })} ·{" "}
                        {t("bjMulti.minBetLabel")} {r.minBet}
                        {isFull ? (
                          <span className="ml-1 text-amber-200/90">· {t("lobby.roomFull")}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openRoom(r.id)}
                        className="rounded-lg border border-slate-500 bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
                      >
                        {t("bjMulti.open")}
                      </button>
                      {canDeleteFromList ? (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => void deleteTableAsHost(r.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-600/60 bg-rose-950/50 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                          title={t("bjMulti.deleteTable")}
                        >
                          <Trash2 className="h-4 w-4 shrink-0" />
                          {t("bjMulti.deleteTable")}
                        </button>
                      ) : null}
                      {r.status === "WAITING" && !isFull && (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => joinSeat(r.id)}
                          className="rounded-lg bg-rose-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-600 disabled:opacity-50"
                        >
                          {t("bjMulti.join")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {createModal}
    </div>
  );
}
