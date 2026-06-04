import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Loader2, Play, Users } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import type { BeloteRoomListItem } from "../components/LobbyBeloteSection";

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

  const [room, setRoom] = useState<BeloteRoomListItem | null>(null);
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
    const onUpdate = (payload: BeloteRoomListItem | null) => {
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
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const me = room.players.find((p) => p.id === userId);
  const allReady = room.players.length === 4 && room.players.every((p) => p.isReady);
  const isHost = room.hostId === userId;

  return (
    <div className="mx-auto max-w-lg p-4 text-white">
      <button
        type="button"
        onClick={() => void leave()}
        className="mb-4 flex items-center gap-2 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("belote.backLobby")}
      </button>
      <h1 className="mb-2 text-2xl font-bold">{room.name}</h1>
      <p className="mb-6 text-sm text-gray-400">
        {t("belote.targetScoreLabel", { score: room.targetScore })}
      </p>
      <ul className="mb-6 space-y-2">
        {Array.from({ length: 4 }).map((_, pos) => {
          const p = room.players.find((x) => x.position === pos);
          return (
            <li
              key={pos}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                {p ? p.username : t("belote.emptySeat")}
              </span>
              {p ? (
                p.isReady ? (
                  <span className="text-xs font-semibold text-emerald-400">{t("belote.ready")}</span>
                ) : (
                  <span className="text-xs text-gray-500">{t("belote.notReady")}</span>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          disabled={busy || !me}
          onClick={() => void toggleReady()}
          className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/60 py-3 font-bold"
        >
          <Check className="h-5 w-5" />
          {me?.isReady ? t("belote.unready") : t("belote.markReady")}
        </button>
        {isHost ? (
          <button
            type="button"
            disabled={busy || !allReady}
            onClick={() => void startGame()}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 font-bold disabled:opacity-40"
          >
            <Play className="h-5 w-5" />
            {t("belote.start")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
