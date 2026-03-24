import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Users, Plus, Check, Play } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { apiUrl } from "../utils/apiBase";

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
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function BlackjackMultiLobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { roomId: roomIdParam } = useParams<{ roomId?: string }>();
  const { userId } = useUser();
  const { addToast } = useToast();

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

  const loadList = useCallback(async () => {
    const res = await fetch(apiUrl("/api/blackjack-tables"), { headers: authHeaders() });
    if (!res.ok) return;
    const data = (await res.json()) as { rooms: BjRoom[] };
    setRooms(data.rooms ?? []);
  }, []);

  const loadRoom = useCallback(async (id: string) => {
    const res = await fetch(apiUrl(`/api/blackjack-tables/${id}`), { headers: authHeaders() });
    if (res.status === 404) {
      addToast(t("bjMulti.roomNotFound"), "error");
      navigate("/blackjack/lobby");
      return;
    }
    if (!res.ok) return;
    const data = (await res.json()) as { room: BjRoom };
    setRoomDetail(data.room);
    if (data.room.status === "PLAYING" && data.room.gameId) {
      navigate(`/blackjack/table/${data.room.gameId}`);
    }
  }, [addToast, navigate, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadList();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadList]);

  useEffect(() => {
    if (!roomIdParam) {
      setRoomDetail(null);
      return;
    }
    loadRoom(roomIdParam);
    const id = window.setInterval(() => loadRoom(roomIdParam), 4000);
    return () => window.clearInterval(id);
  }, [roomIdParam, loadRoom]);

  const openRoom = (id: string) => {
    navigate(`/blackjack/lobby/${id}`);
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
      openRoom(data.room.id);
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
      openRoom(id);
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
        navigate("/blackjack/lobby");
        await loadList();
        return;
      }
      if (!res.ok) {
        addToast(t("bjMulti.leaveFailed"), "error");
        return;
      }
      navigate("/blackjack/lobby");
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

  if (roomIdParam && roomDetail) {
    const isHost = roomDetail.hostId === userId;
    const mySeat = roomDetail.seats.find((s) => s.userId === userId);
    const allReady = roomDetail.seats.length > 0 && roomDetail.seats.every((s) => s.isReady);

    return (
      <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col gap-6 p-4 text-white">
        <button
          type="button"
          onClick={() => navigate("/blackjack/lobby")}
          className="inline-flex items-center gap-2 text-rose-300 hover:text-rose-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("bjMulti.backToList")}
        </button>
        <div className="rounded-2xl border border-rose-500/40 bg-slate-800/90 p-6">
          <h1 className="text-2xl font-bold text-rose-100">{roomDetail.name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {t("bjMulti.minBetLabel")}: {roomDetail.minBet} · {t("bjMulti.seatsCount", { n: roomDetail.seats.length, max: roomDetail.maxSeats })}
          </p>
          <ul className="mt-4 space-y-2">
            {roomDetail.seats
              .slice()
              .sort((a, b) => a.position - b.position)
              .map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-lg bg-slate-900/60 px-3 py-2 text-sm"
                >
                  <span>
                    {s.user.username}
                    {s.userId === roomDetail.hostId ? ` (${t("bjMulti.host")})` : ""}
                  </span>
                  <span className={s.isReady ? "text-emerald-400" : "text-amber-400"}>
                    {s.isReady ? t("bjMulti.ready") : t("bjMulti.notReady")}
                  </span>
                </li>
              ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            {!mySeat && roomDetail.seats.length < roomDetail.maxSeats && (
              <button
                type="button"
                disabled={!!busy}
                onClick={() => joinSeat(roomDetail.id)}
                className="rounded-xl bg-rose-600 px-4 py-2 font-semibold hover:bg-rose-500 disabled:opacity-50"
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
                  className="rounded-xl bg-amber-600 px-4 py-2 font-semibold hover:bg-amber-500 disabled:opacity-50"
                >
                  {mySeat.isReady ? t("bjMulti.unready") : t("bjMulti.imReady")}
                </button>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => leaveSeat(roomDetail.id)}
                  className="rounded-xl border border-slate-500 px-4 py-2 font-semibold hover:bg-slate-700 disabled:opacity-50"
                >
                  {t("bjMulti.leaveTable")}
                </button>
              </>
            )}
            {isHost && (
              <button
                type="button"
                disabled={!!busy || !allReady}
                onClick={() => startGame(roomDetail.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-semibold hover:bg-emerald-500 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
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
      <div className="flex min-h-[50vh] items-center justify-center text-rose-200">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 text-white">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate("/lobby")}
          className="inline-flex items-center gap-2 text-rose-300 hover:text-rose-200"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("bjMulti.backCasino")}
        </button>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 font-semibold hover:bg-rose-500"
        >
          <Plus className="h-4 w-4" />
          {t("bjMulti.createTable")}
        </button>
      </div>
      <h1 className="text-2xl font-bold text-rose-100">{t("bjMulti.lobbyTitle")}</h1>
      <p className="text-sm text-slate-400">{t("bjMulti.lobbySubtitle")}</p>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-rose-400" />
        </div>
      ) : rooms.length === 0 ? (
        <p className="text-slate-400">{t("bjMulti.noRooms")}</p>
      ) : (
        <ul className="space-y-3">
          {rooms.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-600 bg-slate-800/80 p-4"
            >
              <div>
                <div className="font-semibold text-rose-100">{r.name}</div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  <Users className="h-3.5 w-3.5" />
                  {r.seats.length}/{r.maxSeats} · {r.visibility} · {t("bjMulti.minBetLabel")} {r.minBet}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openRoom(r.id)}
                  className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-600"
                >
                  {t("bjMulti.open")}
                </button>
                {r.status === "WAITING" && r.seats.length < r.maxSeats && (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => joinSeat(r.id)}
                    className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium hover:bg-rose-500 disabled:opacity-50"
                  >
                    {t("bjMulti.join")}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/40 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">{t("bjMulti.createTable")}</h2>
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
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 font-semibold hover:bg-rose-500 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {t("bjMulti.confirmCreate")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
