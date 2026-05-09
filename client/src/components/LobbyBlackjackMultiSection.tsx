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
  X,
} from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { useGetFriendsQuery } from "../services/api";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import {
  getDisplayedBlackjackMaxBet,
  refreshGamificationFromServer,
  GAMIFICATION_CHANGED_EVENT,
} from "../utils/gamificationStorage";

type BjVisibility = "PUBLIC" | "PRIVATE";

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
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type LobbyBlackjackMultiSectionProps = {
  active: boolean;
  className?: string;
};

/**
 * Tables blackjack multijoueur intégrées dans le lobby (onglet Blackjack).
 * `bjRoom` dans l’URL ouvre la salle d’attente ; `tab=blackjack` est conservé.
 */
export function LobbyBlackjackMultiSection({ active, className = "" }: LobbyBlackjackMultiSectionProps) {
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
  const [bjMaxDisplay, setBjMaxDisplay] = useState(() => getDisplayedBlackjackMaxBet());

  useEffect(() => {
    void refreshGamificationFromServer().then(() => setBjMaxDisplay(getDisplayedBlackjackMaxBet()));
  }, []);

  useEffect(() => {
    const sync = () => setBjMaxDisplay(getDisplayedBlackjackMaxBet());
    window.addEventListener(GAMIFICATION_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GAMIFICATION_CHANGED_EVENT, sync);
  }, []);

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
      const res = await fetch(apiUrl(`/api/blackjack-tables/${id}/ready`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ ready }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        addToast(err.error ?? t("common.error"), "error");
        return;
      }
      // Update optimiste (améliore le ressenti côté invité)
      if (userId) {
        setRoomDetail((prev) => {
          if (!prev || prev.id !== id) return prev;
          return {
            ...prev,
            seats: prev.seats.map((s) => (s.userId === userId ? { ...s, isReady: ready } : s)),
          };
        });
      }
      await loadRoom(id);
    } finally {
      setBusy(null);
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
      <div className={`space-y-4 ${className}`}>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                clearBjRoomInUrl();
                setRoomDetail(null);
              }}
              className="inline-flex items-center gap-2 text-sm font-medium text-rose-200/90 transition hover:text-rose-100"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("bjMulti.backToList")}
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearBjRoomInUrl();
                  setRoomDetail(null);
                }}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
                aria-label={t("common.close")}
                title={t("common.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <Club className="h-9 w-9 shrink-0 text-rose-300" aria-hidden />
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-600/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
                      <Globe className="h-2.5 w-2.5" />
                      {t("lobby.public")}
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {t("bjMulti.betLimitsLine", { min: roomDetail.minBet, max: bjMaxDisplay })} ·{" "}
                    {t("bjMulti.seatsCount", { n: roomDetail.seats.length, max: roomDetail.maxSeats })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
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
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2.5 backdrop-blur-md"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-white">
                          {s.user.username}
                          {s.userId === roomDetail.hostId ? (
                            <span className="ml-2 text-xs font-normal text-rose-200/80">
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
                            : "border border-rose-300/25 bg-rose-600/15 text-rose-200"
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
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-200">
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 backdrop-blur-md"
                    >
                      <span className="min-w-0 truncate text-sm text-white">{friend.username}</span>
                      <button
                        type="button"
                        disabled={invitedFriendIds.includes(friend.id)}
                        onClick={() => inviteFriendToTable(roomDetail.id, friend.id)}
                        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          invitedFriendIds.includes(friend.id)
                            ? "cursor-not-allowed bg-emerald-800/50 text-emerald-200"
                            : "bg-rose-900 text-white hover:bg-rose-800"
                        }`}
                      >
                        {invitedFriendIds.includes(friend.id) ? t("bjMulti.invited") : t("bjMulti.invite")}
                      </button>
                    </div>
                  ))
                )}
              </div>
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
                className="w-full rounded-xl border border-rose-300/15 bg-rose-950/70 py-3.5 font-bold text-white transition hover:border-rose-200/25 hover:bg-rose-900/80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-6"
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
                  className="w-full rounded-xl border border-rose-300/15 bg-rose-950/70 py-3.5 font-bold text-white transition hover:border-rose-200/25 hover:bg-rose-900/80 disabled:opacity-50 sm:w-auto sm:px-6"
                >
                  {mySeat.isReady ? t("bjMulti.unready") : t("bjMulti.imReady")}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => leaveSeat(roomDetail.id)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.045] py-3.5 font-bold text-slate-200 backdrop-blur-md transition hover:bg-white/[0.08] disabled:opacity-50 sm:w-auto sm:px-6"
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
      <div className={`flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055] py-10 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl ${className}`}>
        <Loader2 className="h-10 w-10 animate-spin text-rose-300" />
      </div>
    );
  }

  const createModal = showCreate && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 pt-12 shadow-2xl shadow-black/40 backdrop-blur-xl sm:pt-6"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          onClick={() => setShowCreate(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] text-slate-300 backdrop-blur-md transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          aria-label={t("common.close")}
          title={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>
        <h3 className="flex items-center gap-2 text-lg font-bold text-white">
          <Club className="h-6 w-6 text-rose-300" />
          {t("bjMulti.createTable")}
        </h3>
        <label className="mt-4 block text-sm text-slate-300">
          {t("bjMulti.roomName")}
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-white backdrop-blur-md"
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
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-white backdrop-blur-md"
          />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          {t("bjMulti.minBetField")}
          <input
            type="number"
            min={10}
            value={newMinBet}
            onChange={(e) => setNewMinBet(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-white backdrop-blur-md"
          />
        </label>
        <label className="mt-3 block text-sm text-slate-300">
          {t("bjMulti.visibility")}
          <select
            value={newVis}
            onChange={(e) => setNewVis(e.target.value as BjVisibility)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-white backdrop-blur-md"
          >
            <option value="PUBLIC">{t("bjMulti.public")}</option>
            <option value="PRIVATE">{t("bjMulti.private")}</option>
          </select>
        </label>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setShowCreate(false)}
            className="rounded-lg px-4 py-2 text-slate-300 hover:bg-white/[0.08]"
          >
            {t("bjMulti.cancel")}
          </button>
          <button
            type="button"
            disabled={creating}
            onClick={createRoom}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300/15 bg-rose-950/70 px-5 py-2.5 font-bold text-white hover:border-rose-200/25 hover:bg-rose-900/80 disabled:opacity-50"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t("bjMulti.confirmCreate")}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
        <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-white">
          <Users className="h-8 w-8 text-rose-300" aria-hidden />
          {t("bjMulti.lobbyTitle")}
        </h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-300/90">{t("bjMulti.lobbySubtitle")}</p>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300/15 bg-rose-950/70 py-4 font-bold text-white shadow-lg shadow-black/25 transition hover:border-rose-200/25 hover:bg-rose-900/80 sm:w-auto sm:px-8"
          >
            <Plus className="h-5 w-5" />
            {t("bjMulti.createTable")}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md">
          <p className="mb-3 text-sm font-semibold text-gray-300">{t("lobby.waitingRooms")}</p>
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-8 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-rose-300" />
              {t("common.loading")}
            </p>
          ) : rooms.length === 0 ? (
            <p className="flex items-center justify-center py-6 text-center text-sm text-gray-500">{t("bjMulti.noRooms")}</p>
          ) : (
            <ul className="space-y-2">
              {rooms.map((r) => {
                const isPrivate = r.visibility === "PRIVATE";
                const isFull = r.seats.length >= r.maxSeats;
                return (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2.5 backdrop-blur-md"
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
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-600/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-200">
                            <Globe className="h-2.5 w-2.5" />
                            {t("lobby.public")}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
                        <Users className="h-3.5 w-3.5 shrink-0 opacity-70" />
                        {t("lobby.playersCount", { count: r.seats.length, max: r.maxSeats })} ·{" "}
                        {t("bjMulti.betLimitsLine", { min: r.minBet, max: bjMaxDisplay })}
                        {isFull ? (
                          <span className="ml-1 text-rose-200/90">· {t("lobby.roomFull")}</span>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openRoom(r.id)}
                        className="rounded-lg border border-white/10 bg-white/[0.055] px-3 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/[0.09]"
                      >
                        {t("bjMulti.open")}
                      </button>
                      {r.status === "WAITING" && !isFull && (
                        <button
                          type="button"
                          disabled={!!busy}
                          onClick={() => joinSeat(r.id)}
                          className="rounded-lg bg-rose-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-rose-800 disabled:opacity-50"
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
