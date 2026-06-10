import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Bot,
  Check,
  Clock,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Play,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { getPlayerAvatar } from "../utils/avatars";
import { addBeloteBot, fillBeloteBots, removeBeloteBot } from "../services/beloteApi";
import { useGetFriendsQuery } from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import type { BeloteRoomListItem } from "../components/LobbyBeloteSection";
import { BlackjackLobbyBackdrop } from "../components/blackjack/BlackjackLobbyBackdrop";
import { NeonButton } from "../components/NeonButton";
import { BeloteSeatAvatar } from "../components/belote/BeloteSeatAvatar";
import { variantLabelKey } from "../features/belote/beloteVariants";
import { useVoice } from "../contexts/VoiceContext";
import { TableVoicePanel } from "../features/voice/TableVoicePanel";
import { pickVoicePanelState } from "../features/voice/useTableVoiceChat";
import {
  buildTableChannelId,
  buildWaitingChannelId,
} from "../features/voice/voiceTypes";

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type BeloteJoinNavState = {
  joinPassword?: string;
  joinCode?: string;
};

export function BeloteWaitingRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "";
  const navJoin = (location.state as BeloteJoinNavState | null) ?? null;
  const { userId, username } = useUser();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const voice = useVoice();

  const [room, setRoom] = useState<(BeloteRoomListItem & { presentUserIds?: string[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [friendInviteStatus, setFriendInviteStatus] = useState<
    Record<string, "pending" | "rejected">
  >({});
  const [roomAccessOk, setRoomAccessOk] = useState(false);
  const [accessGate, setAccessGate] = useState(false);
  const [joinPassword, setJoinPassword] = useState(navJoin?.joinPassword ?? "");
  const [joinCode, setJoinCode] = useState(navJoin?.joinCode ?? "");
  const [gateNeedsCode, setGateNeedsCode] = useState(false);
  const initialJoinDoneRef = useRef(false);
  const { data: friends } = useGetFriendsQuery(userId!, { skip: !userId });

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}`), { headers: authHeaders() });
    if (res.status === 404) {
      addToast(t("belote.roomNotFound"), "error");
      navigate("/lobby?tab=belote");
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as { room: BeloteRoomListItem };
    setRoom(data.room);
    if (data.room.gameId) {
      navigate(`/belote/game?gameId=${encodeURIComponent(data.room.gameId)}`);
    }
  }, [roomId, addToast, navigate, t]);

  const performJoin = useCallback(
    async (creds: { password?: string; joinCode?: string }) => {
      const body: Record<string, string> = {};
      if (creds.password) body.password = creds.password;
      if (creds.joinCode) body.joinCode = creds.joinCode;
      return fetch(apiUrl(`/api/belote-rooms/${roomId}/join`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
    },
    [roomId],
  );

  const handleJoinFailure = useCallback(
    async (joinRes: Response, peek?: BeloteRoomListItem) => {
      const err = (await joinRes.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        buyIn?: number;
      };
      if (err.code === "INSUFFICIENT_CHIPS" && err.buyIn != null) {
        addToast(t("belote.insufficientBuyIn", { amount: err.buyIn }), "error");
        navigate("/lobby?tab=belote");
        return;
      }
      if (err.code === "WRONG_PASSWORD") {
        addToast(t("belote.wrongPassword"), "error");
        setAccessGate(true);
        setGateNeedsCode(peek?.visibility === "PRIVATE");
        return;
      }
      if (err.code === "JOIN_CODE_REQUIRED") {
        setAccessGate(true);
        setGateNeedsCode(true);
        addToast(t("belote.joinCodeRequired"), "error");
        return;
      }
      if (err.error) addToast(err.error, "error");
      else addToast(t("common.error"), "error");
    },
    [addToast, navigate, t],
  );

  const ensureRoomAccess = useCallback(
    async (creds: { password?: string; joinCode?: string }) => {
      if (!roomId || !userId) return;

      const peekRes = await fetch(apiUrl(`/api/belote-rooms/${roomId}`), { headers: authHeaders() });
      if (peekRes.status === 404) {
        addToast(t("belote.roomNotFound"), "error");
        navigate("/lobby?tab=belote");
        return;
      }
      if (!peekRes.ok) return;

      const peekData = (await peekRes.json()) as { room: BeloteRoomListItem };
      const peek = peekData.room;
      const alreadyIn = peek.players.some((p) => p.id === userId);
      const isHost = peek.hostId === userId;

      if (alreadyIn || isHost) {
        setRoomAccessOk(true);
        setAccessGate(false);
        await loadRoom();
        return;
      }

      if (peek.hasPassword && !creds.password) {
        setGateNeedsCode(peek.visibility === "PRIVATE");
        setAccessGate(true);
        return;
      }

      const joinRes = await performJoin(creds);
      if (!joinRes.ok) {
        await handleJoinFailure(joinRes, peek);
        return;
      }

      setRoomAccessOk(true);
      setAccessGate(false);
      await loadRoom();
    },
    [roomId, userId, performJoin, handleJoinFailure, loadRoom, addToast, navigate, t],
  );

  useEffect(() => {
    initialJoinDoneRef.current = false;
    setRoomAccessOk(false);
    setAccessGate(false);
    setRoom(null);
    setJoinPassword(navJoin?.joinPassword ?? "");
    setJoinCode(navJoin?.joinCode ?? "");
  }, [roomId, navJoin?.joinPassword, navJoin?.joinCode]);

  useEffect(() => {
    if (!roomId || !userId || initialJoinDoneRef.current) return;
    initialJoinDoneRef.current = true;
    void ensureRoomAccess({
      password: navJoin?.joinPassword ?? "",
      joinCode: navJoin?.joinCode ?? "",
    });
  }, [roomId, userId, ensureRoomAccess, navJoin?.joinPassword, navJoin?.joinCode]);

  useEffect(() => {
    if (!roomAccessOk || !roomId) return;
    const iv = window.setInterval(() => void loadRoom(), 4000);
    return () => window.clearInterval(iv);
  }, [roomAccessOk, roomId, loadRoom]);

  const submitAccessGate = async () => {
    const pwd = joinPassword.trim();
    if (!pwd) {
      addToast(t("belote.passwordRequired"), "error");
      return;
    }
    setBusy(true);
    try {
      await ensureRoomAccess({
        password: pwd,
        joinCode: joinCode.trim().toUpperCase(),
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!userId || !roomId || !room) return;
    voice.joinWaitingRoom(roomId);
  }, [userId, roomId, room, voice.joinWaitingRoom]);

  useEffect(() => {
    if (!socket || !roomId) return;
    socket.emit("JOIN_BELOTE_ROOM", { roomId });
    const onUpdate = (payload: (BeloteRoomListItem & { presentUserIds?: string[] }) | null) => {
      if (!payload) {
        navigate("/lobby?tab=belote");
        return;
      }
      setRoom(payload);
      if (payload.gameId) {
        voice.applyMigrateHint(
          {
            fromChannelId: buildWaitingChannelId(roomId),
            toChannelId: buildTableChannelId(payload.gameId),
            mode: "continue",
          },
          payload.players.map((p) => p.id),
        );
        navigate(`/belote/game?gameId=${encodeURIComponent(payload.gameId)}`);
      }
    };
    socket.on("BELOTE_ROOM_UPDATED", onUpdate);
    return () => {
      socket.emit("LEAVE_BELOTE_ROOM", { roomId });
      socket.off("BELOTE_ROOM_UPDATED", onUpdate);
    };
  }, [socket, roomId, navigate]);

  useEffect(() => {
    setFriendInviteStatus({});
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    const seatedIds = new Set(room.players.map((p) => p.id));
    setFriendInviteStatus((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (seatedIds.has(id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [room]);

  useEffect(() => {
    if (!socket || !roomId) return;
    const onInviteRejected = (data: { userId?: string; roomId?: string }) => {
      if (data.roomId && data.roomId !== roomId) return;
      if (!data.userId) return;
      setFriendInviteStatus((prev) => {
        if (prev[data.userId!] !== "pending") return prev;
        return { ...prev, [data.userId!]: "rejected" };
      });
      const name =
        friends?.find((f) => f.id === data.userId)?.username ??
        t("waitingRoom.inviteRejectedSomeone");
      addToast(t("waitingRoom.inviteRejectedToast", { name }), "info");
    };
    const onInviteAccepted = (data: { userId?: string; roomId?: string }) => {
      if (data.roomId && data.roomId !== roomId) return;
      if (!data.userId) return;
      setFriendInviteStatus((prev) => {
        if (!(data.userId! in prev)) return prev;
        const { [data.userId!]: _, ...rest } = prev;
        return rest;
      });
    };
    socket.on("INVITATION_REJECTED", onInviteRejected);
    socket.on("INVITATION_ACCEPTED", onInviteAccepted);
    return () => {
      socket.off("INVITATION_REJECTED", onInviteRejected);
      socket.off("INVITATION_ACCEPTED", onInviteAccepted);
    };
  }, [socket, roomId, friends, addToast, t]);

  const inviteFriend = async (friend: { id: string; username: string }) => {
    if (!roomId || friendInviteStatus[friend.id] === "pending") return;
    try {
      const res = await fetch(apiUrl("/api/belote-rooms/invitations"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ roomId, receiverId: friend.id }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        addToast(err.error ?? t("common.error"), "error");
        return;
      }
      setFriendInviteStatus((prev) => ({ ...prev, [friend.id]: "pending" }));
      addToast(t("belote.inviteSent"), "info");
    } catch {
      addToast(t("common.error"), "error");
    }
  };

  const toggleReady = async () => {
    setBusy(true);
    try {
      await fetch(apiUrl(`/api/belote-rooms/${roomId}/ready`), {
        method: "POST",
        headers: authHeaders(),
      });
      await loadRoom();
    } finally {
      setBusy(false);
    }
  };

  const startGame = async () => {
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}/start`), {
        method: "POST",
        headers: authHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = data as { error?: string; code?: string; players?: string[]; buyIn?: number };
        if (err.code === "INSUFFICIENT_CHIPS") {
          const names = err.players?.length ? err.players.join(", ") : "";
          throw new Error(
            names
              ? `${err.error ?? t("common.error")} (${names})`
              : (err.error ?? t("belote.insufficientBuyIn", { amount: err.buyIn ?? room?.buyIn ?? 0 })),
          );
        }
        throw new Error(err.error ?? t("common.error"));
      }
      const started = data as { gameId: string };
      if (room) {
        voice.applyMigrateHint(
          {
            fromChannelId: buildWaitingChannelId(roomId),
            toChannelId: buildTableChannelId(started.gameId),
            mode: "continue",
          },
          room.players.map((p) => p.id),
        );
      }
      navigate(`/belote/game?gameId=${encodeURIComponent(started.gameId)}`);
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const leave = async () => {
    await fetch(apiUrl(`/api/belote-rooms/${roomId}/leave`), {
      method: "POST",
      headers: authHeaders(),
    });
    voice.leaveChannel();
    navigate("/lobby?tab=belote");
  };

  if (accessGate && !roomAccessOk) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden px-4">
        <BlackjackLobbyBackdrop />
        <div className="relative z-10 w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-black/50 p-6 shadow-xl backdrop-blur-sm">
          <h2 className="mb-1 text-xl font-bold text-white">{t("belote.roomAccessTitle")}</h2>
          <p className="mb-4 text-sm text-emerald-200/70">{t("belote.enterPassword")}</p>
          <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="belote-join-password">
            {t("belote.passwordLabel")}
          </label>
          <input
            id="belote-join-password"
            type="password"
            className="mb-3 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none focus:border-emerald-400/50"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitAccessGate();
            }}
            autoComplete="current-password"
            autoFocus
          />
          {gateNeedsCode ? (
            <>
              <label className="mb-1 block text-xs font-semibold text-slate-300" htmlFor="belote-join-code">
                {t("belote.joinCodeLabel")}
              </label>
              <input
                id="belote-join-code"
                type="text"
                className="mb-4 w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 uppercase text-white outline-none focus:border-emerald-400/50"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitAccessGate();
                }}
                autoComplete="off"
              />
            </>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => navigate("/lobby?tab=belote")}
              className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
            >
              {t("belote.backLobby")}
            </button>
            <NeonButton
              disabled={busy}
              onClick={() => void submitAccessGate()}
              variant="green"
              className="flex-1 py-2.5"
            >
              {t("lobby.join")}
            </NeonButton>
          </div>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <BlackjackLobbyBackdrop />
        <Loader2 className="relative z-10 h-10 w-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  const humanPlayers = room.players.filter((p) => !p.isBot);
  const allReady =
    room.canStart ??
    (room.players.length === 4 && humanPlayers.every((p) => p.isReady));
  const isHost = room.hostId === userId;
  const canFill = room.canFillTable ?? (isHost && (room.counts?.empty ?? 4 - room.players.length) > 0);

  const handleFillTable = async () => {
    setBusy(true);
    try {
      const data = await fillBeloteBots(roomId);
      if (data.room) setRoom(data.room);
      else await loadRoom();
    } catch {
      addToast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleAddBot = async () => {
    setBusy(true);
    try {
      const data = await addBeloteBot(roomId);
      if (data.room) setRoom(data.room);
      else await loadRoom();
    } catch {
      addToast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveBot = async (botId: string) => {
    setBusy(true);
    try {
      const data = await removeBeloteBot(roomId, botId);
      if (data.room) setRoom(data.room);
      else await loadRoom();
    } catch {
      addToast(t("common.error"), "error");
    } finally {
      setBusy(false);
    }
  };
  const presentSet = new Set(room.presentUserIds ?? []);
  if (userId) presentSet.add(userId);
  const seatedIds = new Set(room.players.map((p) => p.id));
  const eligibleFriends =
    friends?.filter((f) => f.id !== userId && !seatedIds.has(f.id)) ?? [];
  const friendsToInvite = eligibleFriends.filter((f) => f.isOnline);
  const inviteEmptyMessage =
    !friends?.length
      ? t("friends.noFriendsYet")
      : eligibleFriends.length > 0 && friendsToInvite.length === 0
        ? t("waitingRoom.noFriendsOnline")
        : t("belote.noFriendsToInvite");
  const isPrivate = room.visibility === "PRIVATE";

  const renderPlayerRow = (
    p: (typeof room.players)[number],
    opts?: { showReadyAction?: boolean },
  ) => {
    const isPresent = p.isBot || presentSet.has(p.id);
    const isYou = p.id === userId;
    return (
      <div
        key={p.id}
        className={`mb-3 rounded-xl border p-4 ${
          isYou ? "border-emerald-700/50 bg-emerald-950/20" : "border-slate-700/50 bg-slate-800/50"
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative shrink-0">
              {p.isBot ? (
                <BeloteSeatAvatar
                  username={p.username}
                  userId={p.id}
                  heroUserId={userId ?? ""}
                  avatarUrl={p.avatarUrl}
                  team={p.position % 2 === 0 ? "A" : "B"}
                  isYou={isYou}
                  isPresent
                  isBot
                  size="sm"
                />
              ) : (
                <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-blue-500 shadow-lg">
                  <ImageWithFallback
                    src={getPlayerAvatar(p.username, p.id, userId, p.avatarUrl)}
                    alt={`${p.username} avatar`}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div
                className={`absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-slate-800 ${
                  p.isReady || p.isBot ? "bg-green-500" : isHost && isYou ? "bg-amber-500" : "bg-yellow-500"
                }`}
              />
            </div>
            <div className="min-w-0">
              <div className="truncate font-bold text-white">
                {p.username}
                {isYou ? ` (${t("game.you")})` : ""}
                {p.isBot ? (
                  <span className="ml-2 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                    {t("belote.aiBadge")}
                  </span>
                ) : null}
              </div>
              {!p.isBot && p.level != null ? (
                <div className="text-sm text-gray-400">{t("friends.level", { level: p.level })}</div>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
            {p.isBot ? (
              <span className="text-gray-400">{t("belote.present")}</span>
            ) : p.isReady ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <Check className="h-4 w-4 shrink-0" />
                {t("belote.ready")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-gray-400">
                <Clock className="h-4 w-4 shrink-0 text-amber-400/90" />
                {t("game.waiting")}
              </span>
            )}
            {!p.isBot ? (
              <span
                className={`text-[10px] font-semibold ${
                  isPresent ? "text-emerald-400" : "text-slate-500"
                }`}
              >
                {isPresent ? t("belote.present") : t("belote.absent")}
              </span>
            ) : null}
            {opts?.showReadyAction && isYou && !p.isReady ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleReady()}
                className="mt-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-500"
              >
                {t("belote.markReady")}
              </button>
            ) : null}
            {opts?.showReadyAction && isYou && p.isReady ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleReady()}
                className="mt-1 rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-950/40"
              >
                {t("belote.unready")}
              </button>
            ) : null}
            {p.isBot && isHost ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleRemoveBot(p.botId ?? p.id)}
                className="mt-1 flex items-center gap-1 text-[10px] font-bold text-red-300 hover:text-red-200"
              >
                <X className="h-3 w-3" />
                {t("belote.removeAi")}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <BlackjackLobbyBackdrop />

      <div className="relative z-10 w-full min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-900 shadow-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-white sm:text-3xl">{room.name}</h1>
                {isPrivate ? (
                  <span className="flex items-center gap-1 rounded-full border border-purple-500/40 bg-purple-600/30 px-2 py-0.5 text-xs font-semibold text-purple-200">
                    <Lock className="h-3 w-3" />
                    {t("lobby.private")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full border border-green-500/40 bg-green-600/30 px-2 py-0.5 text-xs font-semibold text-green-200">
                    <Globe className="h-3 w-3" />
                    {t("lobby.public")}
                  </span>
                )}
              </div>
              <p className="text-sm text-purple-200/90">{t(variantLabelKey(room.variant ?? "CONTEE"))}</p>
              <p className="text-sm text-emerald-200/70">
                {t("belote.targetScoreLabel", { score: room.targetScore })} ·{" "}
                {t("belote.buyInRoomLine", { amount: room.buyIn })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate("/lobby?tab=belote")}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-black/55"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("belote.backLobby")}
            </button>
            <button
              type="button"
              onClick={() => void leave()}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/35 bg-red-950/55 px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-900/70"
            >
              <LogOut className="h-4 w-4" />
              {t("bjMulti.leaveTable")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Joueurs dans la salle */}
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-white">
              <Users className="h-6 w-6" />
              {t("waitingRoom.playersInRoom", { count: room.players.length })}
            </h2>

            {[...room.players]
              .sort((a, b) => {
                if (a.id === userId) return -1;
                if (b.id === userId) return 1;
                return a.position - b.position;
              })
              .map((p) => renderPlayerRow(p, { showReadyAction: true }))}

            {Array.from({ length: 4 - room.players.length }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="mb-3 flex items-center justify-between rounded-xl border border-dashed border-slate-700 px-4 py-6 text-center text-gray-400"
              >
                <span>{t("belote.emptySeat")}</span>
                {isHost ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAddBot()}
                    className="flex items-center gap-1 rounded-lg border border-cyan-500/40 px-3 py-1.5 text-xs font-bold text-cyan-200"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {t("belote.addAi")}
                  </button>
                ) : null}
              </div>
            ))}

            {room.players.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-700 py-8 text-center text-gray-400">
                {t("waitingRoom.waitingForOthers")}
              </div>
            ) : null}

            {userId && presentSet.has(userId) ? (
              <p className="mt-3 text-center text-xs text-emerald-300/80">{t("belote.youArePresent")}</p>
            ) : (
              <p className="mt-3 text-center text-xs text-amber-300/80">{t("belote.connectingPresence")}</p>
            )}
          </div>

          {/* Invitations */}
          <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-white">
              <UserPlus className="h-6 w-6" />
              {t("waitingRoom.inviteFriends")}
            </h2>

            <div className="mb-6 max-h-[400px] space-y-3 overflow-y-auto">
              {friendsToInvite.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-slate-800/50 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative shrink-0">
                      <div className="h-12 w-12 overflow-hidden rounded-full border-2 border-white bg-blue-500 shadow-lg">
                        <ImageWithFallback
                          src={getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl)}
                          alt={`${friend.username} avatar`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div
                        className={`absolute bottom-0 right-0 h-5 w-5 rounded-full border-2 border-slate-800 ${
                          friend.isOnline ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                        aria-label={friend.isOnline ? t("friends.online") : t("friends.offline")}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-white">{friend.username}</div>
                      <div className="text-sm text-yellow-400">
                        {t("friends.level", { level: friend.level })}
                      </div>
                      <div
                        className={`text-xs font-semibold ${
                          friend.isOnline ? "text-emerald-300" : "text-slate-500"
                        }`}
                      >
                        {friend.isOnline ? t("friends.online") : t("friends.offline")}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                    <button
                      type="button"
                      onClick={() => void inviteFriend(friend)}
                      disabled={!friend.isOnline || friendInviteStatus[friend.id] === "pending" || busy}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                        friendInviteStatus[friend.id] === "pending"
                          ? "cursor-not-allowed bg-emerald-600 text-white"
                          : "bg-blue-600 text-white hover:bg-blue-500"
                      }`}
                    >
                      {friendInviteStatus[friend.id] === "pending"
                        ? t("waitingRoom.invited")
                        : t("waitingRoom.invite")}
                    </button>
                    {friendInviteStatus[friend.id] === "rejected" ? (
                      <span className="max-w-[11rem] text-right text-[11px] leading-snug text-rose-300/90">
                        {t("waitingRoom.inviteAlreadyRejected")}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}

              {friendsToInvite.length === 0 ? (
                <div className="py-8 text-center text-gray-400">{inviteEmptyMessage}</div>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-slate-700/80 pt-4">
              {isHost && canFill ? (
                <NeonButton
                  disabled={busy}
                  onClick={() => void handleFillTable()}
                  variant="green"
                  className="w-full py-3"
                  icon={<Bot className="h-5 w-5" />}
                >
                  {t("belote.fillTable")}
                </NeonButton>
              ) : null}
              {isHost ? (
                <NeonButton
                  disabled={busy || !allReady}
                  onClick={() => void startGame()}
                  variant="gold"
                  className="w-full py-4"
                  icon={<Play className="h-5 w-5" />}
                >
                  {t("belote.start")}
                </NeonButton>
              ) : (
                <p className="text-center text-sm text-emerald-200/50">{t("belote.waitingHost")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {userId ? (
        <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 z-40 sm:left-6">
          <TableVoicePanel
            layout="room"
            panelHideMs={1000}
            voice={pickVoicePanelState(voice)}
            myUserId={userId}
            channelLabel={voice.channel?.label ?? null}
            tablePlayers={room.players.map((p) => ({
              userId: p.id,
              username: p.username,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
