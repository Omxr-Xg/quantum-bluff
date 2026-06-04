import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Diamond, Globe, Loader2, Lock, Plus, Users } from "lucide-react";
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
  }>;
};

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function LobbyBeloteSection({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = useUser();
  const { addToast } = useToast();

  const [rooms, setRooms] = useState<BeloteRoomListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVis, setNewVis] = useState<BeloteVisibility>("PUBLIC");
  const [newTarget, setNewTarget] = useState(1000);
  const [newPassword, setNewPassword] = useState("");

  const loadList = useCallback(async () => {
    const res = await fetch(apiUrl("/api/belote-rooms"), { headers: authHeaders() });
    if (!res.ok) return;
    const data = (await res.json()) as { rooms: BeloteRoomListItem[] };
    setRooms(data.rooms ?? []);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadList();
      if (!cancelled) setLoading(false);
    })();
    const iv = window.setInterval(loadList, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [active, loadList]);

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

  const joinRoom = (id: string) => {
    navigate(`/belote/waiting-room?roomId=${id}`);
  };

  if (!active) return null;

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
        <h2 className="mb-2 flex items-center gap-2 text-xl font-bold text-white">
          <Diamond className="h-6 w-6 text-emerald-300" />
          {t("belote.lobbyTitle")}
        </h2>
        <p className="mb-4 text-sm text-gray-400">{t("belote.lobbyIntro")}</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-950/70 py-3 font-bold text-white hover:bg-emerald-900/80"
        >
          <Plus className="h-5 w-5" />
          {t("belote.createRoom")}
        </button>

        {showCreate ? (
          <div className="mb-4 space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
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
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${newVis === "PUBLIC" ? "bg-emerald-700 text-white" : "bg-slate-800 text-gray-400"}`}
              >
                <Globe className="mx-auto mb-1 h-4 w-4" />
                {t("lobby.public")}
              </button>
              <button
                type="button"
                onClick={() => setNewVis("PRIVATE")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${newVis === "PRIVATE" ? "bg-emerald-700 text-white" : "bg-slate-800 text-gray-400"}`}
              >
                <Lock className="mx-auto mb-1 h-4 w-4" />
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
                onChange={(e) => setNewTarget(Number(e.target.value) || 1000)}
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
              {creating ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t("belote.createRoom")}
            </button>
          </div>
        ) : null}

        {loading && rooms.length === 0 ? (
          <p className="flex items-center justify-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("common.loading")}
          </p>
        ) : rooms.length === 0 ? (
          <p className="text-center text-sm text-gray-500">{t("belote.noRooms")}</p>
        ) : (
          <ul className="space-y-2">
            {rooms.map((room) => {
              const count = room.players?.length ?? 0;
              const full = count >= room.maxPlayers;
              return (
                <li
                  key={room.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{room.name}</p>
                    <p className="text-xs text-gray-400">
                      <Users className="mr-1 inline h-3 w-3" />
                      {count}/{room.maxPlayers} · {room.targetScore} {t("belote.points")}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={full && !room.players.some((p) => p.id === userId)}
                    onClick={() => joinRoom(room.id)}
                    className="shrink-0 rounded-lg bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    {t("belote.join")}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
