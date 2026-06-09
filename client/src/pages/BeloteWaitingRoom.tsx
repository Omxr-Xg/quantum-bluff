import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Bot, Check, Loader2, LogOut, Play, UserPlus, Users, X } from "lucide-react";
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
import { belotePotTotal, beloteWinnerShare } from "../features/belote/beloteBuyIn";
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

export function BeloteWaitingRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "";
  const { userId } = useUser();
  const { addToast } = useToast();
  const { socket } = useSocket();
  const voice = useVoice();

  const [room, setRoom] = useState<(BeloteRoomListItem & { presentUserIds?: string[] }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [invitedFriendIds, setInvitedFriendIds] = useState<string[]>([]);
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

  useEffect(() => {
    if (!roomId) return;
    (async () => {
      const joinRes = await fetch(apiUrl(`/api/belote-rooms/${roomId}/join`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!joinRes.ok) {
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
      }
      await loadRoom();
    })();
    const iv = window.setInterval(() => void loadRoom(), 4000);
    return () => window.clearInterval(iv);
  }, [loadRoom, roomId, addToast, t, navigate]);

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
    setInvitedFriendIds([]);
  }, [roomId]);

  useEffect(() => {
    if (!room) return;
    const seatedIds = new Set(room.players.filter((p) => !p.isBot).map((p) => p.id));
    setInvitedFriendIds((prev) => prev.filter((id) => !seatedIds.has(id)));
  }, [room]);

  const inviteFriend = async (friendId: string) => {
    if (!roomId || invitedFriendIds.includes(friendId)) return;
    try {
      const res = await fetch(apiUrl("/api/belote-rooms/invitations"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ roomId, receiverId: friendId }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        addToast(err.error ?? t("common.error"), "error");
        return;
      }
      setInvitedFriendIds((prev) => (prev.includes(friendId) ? prev : [...prev, friendId]));
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

  if (!room) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <BlackjackLobbyBackdrop />
        <Loader2 className="relative z-10 h-10 w-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  const me = room.players.find((p) => p.id === userId);
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
  const seatedIds = new Set(humanPlayers.map((p) => p.id));
  const friendsToInvite =
    friends?.filter((f) => f.id !== userId && !seatedIds.has(f.id)) ?? [];
  const roomHasSpace = room.players.length < 4;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <BlackjackLobbyBackdrop />

      <div className="relative z-10 mx-auto w-full max-w-lg flex-1 overflow-y-auto px-4 py-5 pb-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => void leave()}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-black/55"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("belote.backLobby")}
          </button>
          <button
            type="button"
            onClick={() => void leave()}
            className="flex items-center gap-2 rounded-xl border border-slate-600/80 bg-slate-900/80 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:border-red-500/50 hover:text-red-100"
          >
            <LogOut className="h-4 w-4" />
            {t("bjMulti.leaveTable")}
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-black/40 p-5 shadow-xl backdrop-blur-sm">
          <h1 className="mb-1 text-2xl font-bold text-white">{room.name}</h1>
          <p className="text-sm font-medium text-purple-200/90">
            {t(variantLabelKey(room.variant ?? "CONTEE"))}
          </p>
          <p className="text-sm text-emerald-200/70">
            {t("belote.targetScoreLabel", { score: room.targetScore })}
          </p>
          <p className="mt-2 text-sm text-amber-200/90">
            {t("belote.buyInRoomLine", { amount: room.buyIn })}
          </p>
          <p className="mt-1 text-xs text-emerald-200/60">
            {t("belote.buyInPotHint", {
              pot: belotePotTotal(room.buyIn),
              share: beloteWinnerShare(belotePotTotal(room.buyIn)),
            })}
          </p>
          {room.counts ? (
            <p className="mt-2 text-xs font-semibold text-cyan-200/90">
              {t("belote.seatCounts", {
                humans: room.counts.humans,
                bots: room.counts.bots,
              })}
            </p>
          ) : null}
        </div>

        <ul className="mb-6 space-y-3">
          {Array.from({ length: 4 }).map((_, pos) => {
            const p = room.players.find((x) => x.position === pos);
            const isPresent = p ? p.isBot || presentSet.has(p.id) : false;
            return (
              <li
                key={pos}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 shadow-inner"
              >
                <span className="flex items-center gap-3">
                  {p ? (
                    <BeloteSeatAvatar
                      username={p.username}
                      userId={p.id}
                      heroUserId={userId ?? ""}
                      avatarUrl={p.avatarUrl}
                      team={pos % 2 === 0 ? "A" : "B"}
                      isYou={p.id === userId}
                      isPresent={isPresent}
                      isBot={Boolean(p.isBot)}
                      size="sm"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-white/20 bg-black/30">
                      <Users className="h-4 w-4 text-emerald-400/60" />
                    </div>
                  )}
                  <span className="font-semibold text-white">
                    {p ? p.username : t("belote.emptySeat")}
                    {p?.isBot ? (
                      <span className="ml-2 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-200">
                        {t("belote.aiBadge")}
                      </span>
                    ) : null}
                  </span>
                </span>
                {p ? (
                  <div className="flex flex-col items-end gap-1">
                    {p.isReady ? (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                        {t("belote.ready")}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">{t("belote.notReady")}</span>
                    )}
                    {p.isBot ? (
                      <span className="text-[10px] font-semibold text-emerald-400">
                        {t("belote.present")}
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-semibold ${
                          isPresent ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {isPresent ? t("belote.present") : t("belote.absent")}
                      </span>
                    )}
                    {p.isBot && isHost ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleRemoveBot(p.botId ?? p.id)}
                        className="flex items-center gap-1 rounded-full border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-200 hover:bg-red-950/50"
                      >
                        <X className="h-3 w-3" />
                        {t("belote.removeAi")}
                      </button>
                    ) : null}
                  </div>
                ) : isHost ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void handleAddBot()}
                    className="flex items-center gap-1 rounded-full border border-cyan-500/40 px-2 py-1 text-[10px] font-bold text-cyan-200"
                  >
                    <Bot className="h-3 w-3" />
                    {t("belote.addAi")}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>

        {isHost && roomHasSpace ? (
          <div className="mb-6 rounded-2xl border border-emerald-500/25 bg-slate-950/50 p-4 shadow-inner">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-100">
              <UserPlus className="h-4 w-4 shrink-0" />
              {t("belote.inviteFriends")}
            </h3>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {friendsToInvite.length === 0 ? (
                <p className="text-center text-xs text-slate-500">{t("belote.noFriendsToInvite")}</p>
              ) : (
                friendsToInvite.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm font-medium text-white">
                      {friend.username}
                    </span>
                    <button
                      type="button"
                      disabled={invitedFriendIds.includes(friend.id) || busy}
                      onClick={() => void inviteFriend(friend.id)}
                      className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                        invitedFriendIds.includes(friend.id)
                          ? "cursor-not-allowed bg-emerald-800/50 text-emerald-200"
                          : "bg-emerald-700 text-white hover:bg-emerald-600"
                      }`}
                    >
                      {invitedFriendIds.includes(friend.id)
                        ? t("belote.invited")
                        : t("belote.invite")}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {userId && presentSet.has(userId) ? (
          <p className="mb-3 text-center text-xs text-emerald-300/80">{t("belote.youArePresent")}</p>
        ) : (
          <p className="mb-3 text-center text-xs text-amber-300/80">{t("belote.connectingPresence")}</p>
        )}

        <div className="flex flex-col gap-3">
          <NeonButton
            disabled={busy || !me}
            onClick={() => void toggleReady()}
            variant={me?.isReady ? "amber" : "green"}
            className="w-full py-4"
            icon={<Check className="h-5 w-5" />}
          >
            {me?.isReady ? t("belote.unready") : t("belote.markReady")}
          </NeonButton>
          {isHost && canFill ? (
            <NeonButton
              disabled={busy}
              onClick={() => void handleFillTable()}
              variant="green"
              className="w-full py-4"
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
            <p className="text-center text-sm text-emerald-200/50">
              {t("belote.waitingHost")}
            </p>
          )}
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
