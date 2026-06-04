import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Loader2, LogOut, Play, Users } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import type { BeloteRoomListItem } from "../components/LobbyBeloteSection";
import { BlackjackLobbyBackdrop } from "../components/blackjack/BlackjackLobbyBackdrop";
import { NeonButton } from "../components/NeonButton";
import { BeloteSeatAvatar } from "../components/belote/BeloteSeatAvatar";

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

  const [room, setRoom] = useState<(BeloteRoomListItem & { presentUserIds?: string[] }) | null>(null);
  const [busy, setBusy] = useState(false);

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
      await fetch(apiUrl(`/api/belote-rooms/${roomId}/join`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      await loadRoom();
    })();
    const iv = window.setInterval(() => void loadRoom(), 4000);
    return () => window.clearInterval(iv);
  }, [loadRoom, roomId]);

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
        navigate(`/belote/game?gameId=${encodeURIComponent(payload.gameId)}`);
      }
    };
    socket.on("BELOTE_ROOM_UPDATED", onUpdate);
    return () => {
      socket.emit("LEAVE_BELOTE_ROOM", { roomId });
      socket.off("BELOTE_ROOM_UPDATED", onUpdate);
    };
  }, [socket, roomId, navigate]);

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
      if (!res.ok) throw new Error((data as { error?: string }).error ?? t("common.error"));
      navigate(`/belote/game?gameId=${encodeURIComponent((data as { gameId: string }).gameId)}`);
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
    navigate("/lobby?tab=belote");
  };

  if (!room) {
    return (
      <div className="relative flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden app-shell-bg pt-[5.25rem]">
        <BlackjackLobbyBackdrop />
        <Loader2 className="relative z-10 h-10 w-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  const me = room.players.find((p) => p.id === userId);
  const allReady = room.players.length === 4 && room.players.every((p) => p.isReady);
  const isHost = room.hostId === userId;
  const presentSet = new Set(room.presentUserIds ?? []);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden app-shell-bg pt-[5.25rem]">
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
          <p className="text-sm text-emerald-200/70">
            {t("belote.targetScoreLabel", { score: room.targetScore })}
          </p>
        </div>

        <ul className="mb-6 space-y-3">
          {Array.from({ length: 4 }).map((_, pos) => {
            const p = room.players.find((x) => x.position === pos);
            const isPresent = p ? presentSet.has(p.id) : false;
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
                      isYou={p.id === userId}
                      isPresent={isPresent}
                      size="sm"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-white/20 bg-black/30">
                      <Users className="h-4 w-4 text-emerald-400/60" />
                    </div>
                  )}
                  <span className="font-semibold text-white">
                    {p ? p.username : t("belote.emptySeat")}
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
                    <span
                      className={`text-[10px] font-semibold ${
                        isPresent ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {isPresent ? t("belote.present") : t("belote.absent")}
                    </span>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

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
    </div>
  );
}
