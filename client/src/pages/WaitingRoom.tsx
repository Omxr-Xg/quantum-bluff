import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router";
import { UserPlus, Users, LogOut, Loader2 } from "lucide-react";
import { useSocket } from "../contexts/SocketContext";
import { useUser } from "../hooks/useUser";
import { useGetFriendsQuery } from "../services/api";

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || "";

interface Player {
  id: string;
  name: string;
  avatar: string;
  level: number;
  isReady: boolean;
}

export function WaitingRoom() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, username } = useUser();
  const { socket, isConnected, joinRoom, leaveRoom } = useSocket();
  const queryParams = new URLSearchParams(location.search);
  const rawRoomId = queryParams.get("roomId");
  const roomId = rawRoomId || `room_${Date.now()}`;

  const [players, setPlayers] = useState<Player[]>([]);
  const [invitedPlayers, setInvitedPlayers] = useState<Player[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const { data: friends } = useGetFriendsQuery(userId!, { skip: !userId });

  const fetchRoom = useCallback(
    async (id: string) => {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/${id}` : `/api/waiting-room/${id}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      navigate("/login");
      return;
    }

    let cancelled = false;

    const init = async () => {
      setRoomLoading(true);
      setRoomError(null);
      try {
        if (!rawRoomId || rawRoomId.startsWith("room_")) {
          const createUrl = API_BASE ? `${API_BASE}/api/waiting-room/create` : "/api/waiting-room/create";
          const res = await fetch(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hostId: userId,
              roomName: `Salle de ${username || "Joueur"}`,
              maxPlayers: 5,
            }),
          });
          if (cancelled) return;
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            setRoomError(err?.error || "Impossible de créer la salle");
            setRoomLoading(false);
            return;
          }
          const room = await res.json();
          navigate(`/waiting-room?roomId=${room.id}`, { replace: true });
          return;
        }

        const room = await fetchRoom(rawRoomId);
        if (cancelled) return;
        if (!room) {
          setRoomError("Salle introuvable");
          setRoomLoading(false);
          return;
        }
        if (room.status !== "WAITING") {
          setRoomError("La partie a déjà commencé");
          setRoomLoading(false);
          return;
        }

        const inRoom = room.players?.some((p: { id: string }) => p.id === userId);
        if (!inRoom) {
          const joinUrl = API_BASE ? `${API_BASE}/api/waiting-room/${rawRoomId}/join` : `/api/waiting-room/${rawRoomId}/join`;
          const joinRes = await fetch(joinUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          if (cancelled) return;
          if (!joinRes.ok) {
            const err = await joinRes.json().catch(() => ({}));
            setRoomError(err?.error || "Impossible de rejoindre");
            setRoomLoading(false);
            return;
          }
        }

        setRoomName(room.name || "");
        setIsCreator(room.hostId === userId);
        setPlayers(
          (room.players || [])
            .filter((p: { id: string }) => p.id !== userId)
            .map((p: { id: string; username: string; level?: number; isReady?: boolean }) => ({
              id: p.id,
              name: p.username,
              avatar: (p.username || "?").charAt(0),
              level: p.level ?? 0,
              isReady: p.isReady ?? false,
            }))
        );
      } catch (e) {
        if (!cancelled) setRoomError(e instanceof Error ? e.message : "Erreur");
      } finally {
        if (!cancelled) setRoomLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [userId, username, rawRoomId, navigate, fetchRoom]);

  useEffect(() => {
    if (!userId || !rawRoomId || rawRoomId.startsWith("room_") || roomLoading) return;
    joinRoom(rawRoomId);
    return () => leaveRoom(rawRoomId);
  }, [userId, rawRoomId, roomLoading, joinRoom, leaveRoom]);

  useEffect(() => {
    if (!rawRoomId || rawRoomId.startsWith("room_")) return;
    const interval = setInterval(async () => {
      const room = await fetchRoom(rawRoomId);
      if (!room || room.status !== "WAITING") return;
      setIsCreator(room.hostId === userId);
      setPlayers(
        (room.players || [])
          .filter((p: { id: string }) => p.id !== userId)
          .map((p: { id: string; username: string; level?: number; isReady?: boolean }) => ({
            id: p.id,
            name: p.username,
            avatar: (p.username || "?").charAt(0),
            level: p.level ?? 0,
            isReady: p.isReady ?? false,
          }))
      );
    }, 3000);
    return () => clearInterval(interval);
  }, [rawRoomId, userId, fetchRoom]);

  const handleInvite = (friend: any) => {
    // Envoyer une invitation via socket
    socket?.emit('invite-to-room', {
      roomId,
      invitedUserId: friend.id,
      inviterId: userId
    });

    // Mise à jour locale en attendant la confirmation socket
    setInvitedPlayers(prev => [...prev, {
      id: friend.id,
      name: friend.username,
      avatar: friend.username.charAt(0),
      level: friend.level,
      isReady: false
    }]);
  };

  const handleRemoveInvite = (playerId: string) => {
    socket?.emit('cancel-invitation', {
      roomId,
      playerId
    });
    setInvitedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleReady = () => {
    socket?.emit("player-ready", { roomId, userId });
    if (rawRoomId && !rawRoomId.startsWith("room_")) {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/${rawRoomId}/ready` : `/api/waiting-room/${rawRoomId}/ready`;
      fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isReady: true }),
      }).catch(() => {});
    }
  };

  const handleStartGame = async () => {
    if (!rawRoomId || rawRoomId.startsWith("room_") || !userId) return;
    setStarting(true);
    try {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/${rawRoomId}/start` : `/api/waiting-room/${rawRoomId}/start`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setRoomError(err?.error || "Impossible de démarrer");
        return;
      }
      const data = await res.json();
      leaveRoom(rawRoomId);
      navigate(data.gameId ? `/game?gameId=${data.gameId}` : "/game");
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : "Erreur démarrage");
    } finally {
      setStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (rawRoomId && !rawRoomId.startsWith("room_") && userId) {
      try {
        const url = API_BASE ? `${API_BASE}/api/waiting-room/${rawRoomId}/leave` : `/api/waiting-room/${rawRoomId}/leave`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch (_) {}
    }
    leaveRoom(roomId);
    navigate("/lobby");
  };

  if (roomLoading && !roomName) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <p>Chargement de la salle...</p>
        </div>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-2xl p-8 border border-red-500/50 max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{roomError}</p>
          <button
            onClick={() => navigate("/lobby")}
            className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-6 py-2 rounded-xl"
          >
            Retour au lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-semibold transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Quitter</span>
          </button>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-gray-400 text-sm">{isConnected ? "Connecté" : "Déconnecté"}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center shadow-xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">{roomName || "Salle d'attente"}</h1>
            <p className="text-gray-400">
              Code : <span className="text-purple-400 font-mono">{roomId}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Joueurs dans la salle */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Users className="w-6 h-6" />
              Joueurs dans la salle ({players.length + 1})
            </h2>

            {/* Toi-même */}
            <div className="bg-blue-800/30 rounded-xl p-4 border border-blue-700/50 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg font-bold">
                        {username?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                  </div>
                  <div>
                    <div className="text-white font-bold">{username} (toi)</div>
                    <div className="text-green-300 text-sm">Prêt ?</div>
                  </div>
                </div>
                <button
                  onClick={handleReady}
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold"
                >
                  Prêt
                </button>
              </div>
            </div>

            {/* Autres joueurs */}
            {players.map((player) => (
              <div key={player.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-white flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg font-bold">{player.avatar}</span>
                      </div>
                      <div className={`absolute bottom-0 right-0 w-5 h-5 ${player.isReady ? 'bg-green-500' : 'bg-yellow-500'} rounded-full border-2 border-slate-800`}></div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{player.name}</div>
                      <div className="text-gray-400 text-sm">Niveau {player.level}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {player.isReady ? '✅ Prêt' : '⏳ En attente'}
                  </div>
                </div>
              </div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                <div className="text-gray-400">
                  En attente d'autres joueurs...
                </div>
              </div>
            )}
          </div>

          {/* Invitations aux amis */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              Inviter des amis
            </h2>

            <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
              {friends?.filter(f => !players.some(p => p.id === f.id) && f.id !== userId)
                .map((friend) => (
                  <div key={friend.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white flex items-center justify-center shadow-lg">
                          <span className="text-white text-lg font-bold">
                            {friend.username.charAt(0)}
                          </span>
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                      </div>
                      <div>
                        <div className="text-white font-bold">{friend.username}</div>
                        <div className="text-yellow-400 text-sm">Niveau {friend.level}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleInvite(friend)}
                      disabled={invitedPlayers.some(p => p.id === friend.id)}
                      className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                        invitedPlayers.some(p => p.id === friend.id)
                          ? "bg-green-600 text-white cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                    >
                      {invitedPlayers.some(p => p.id === friend.id) ? 'Invité' : 'Inviter'}
                    </button>
                  </div>
                ))}

              {(!friends || friends.length === 0) && (
                <div className="text-center py-8">
                  <div className="text-gray-400">Aucun ami en ligne</div>
                </div>
              )}
            </div>

            {isCreator && (
              <button
                onClick={handleStartGame}
                disabled={players.length < 1 || starting}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                  players.length >= 1 && !starting
                    ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white transform hover:scale-105"
                    : "bg-slate-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {starting ? "Démarrage..." : `Lancer la partie (${players.length + 1} joueurs)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}