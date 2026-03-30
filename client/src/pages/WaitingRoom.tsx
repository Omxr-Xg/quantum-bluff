import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { UserPlus, Users, LogOut, Loader2, AlertCircle, Lock, Globe, Check, X, UserCheck, ChevronDown, ChevronUp, TestTube, Zap } from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";
import { fetchBalanceFromServer, getUserAvatar } from "../utils/userProfile";
import { useGetFriendsQuery } from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { apiUrl } from "../utils/apiBase";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

interface Player {
  id: string;
  name: string;
  level: number;
  isReady: boolean;
  avatarUrl?: string | null;
}

export function WaitingRoom() {
  const { t } = useTranslation();
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
  const [roomVisibility, setRoomVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [roomTurbo, setRoomTurbo] = useState(false);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [myIsReady, setMyIsReady] = useState(false);

  interface JoinRequestItem {
    id: string;
    userId: string;
    username: string;
    level: number;
  }
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  /** Host: section "Voir plus" pour forcer des cartes (tests) */
  const [showTestCards, setShowTestCards] = useState(false);
  const [forceCards, setForceCards] = useState<Record<string, [{ suit: string; rank: string } | null, { suit: string; rank: string } | null]>>({});
  const roomPollInFlightRef = useRef(false);

  const applyRoomSnapshot = useCallback((room: {
    name?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
    turbo?: boolean;
    hostId?: string;
    players?: Array<{ id: string; username: string; level?: number; isReady?: boolean; avatarUrl?: string | null }>;
  }) => {
    setRoomName(room.name || "");
    setRoomVisibility(room.visibility || 'PUBLIC');
    setRoomTurbo(!!room.turbo);
    setIsCreator(room.hostId === userId);
    const me = room.players?.find((p) => p.id === userId);
    setMyIsReady(me?.isReady ?? false);
    setPlayers(
      (room.players || [])
        .filter((p) => p.id !== userId)
        .map((p) => ({
          id: p.id,
          name: p.username,
          level: p.level ?? 0,
          isReady: p.isReady ?? false,
          avatarUrl: p.avatarUrl ?? null,
        }))
    );
  }, [userId]);

  const SUITS = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"] as const;
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

  /** Tous les joueurs (host + autres) pour l'association des cartes forcées */
  const allPlayersForCards = userId
    ? [{ id: userId, name: username || "Vous" }, ...players]
    : [...players];

  const { data: friends } = useGetFriendsQuery(userId!, { skip: !userId });
  const { addToast } = useToast();

  const fetchRoom = useCallback(
    async (id: string) => {
      const url = apiUrl(`/api/waiting-room/${id}`);
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      navigate("/auth");
      return;
    }

    let cancelled = false;

    const init = async () => {
      setRoomLoading(true);
      setRoomError(null);
      try {
        if (!rawRoomId || rawRoomId.startsWith("room_")) {
          const createUrl = apiUrl("/api/waiting-room/create");
          const res = await fetch(createUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              hostId: userId,
              roomName: `Salle de ${username || "Joueur"}`,
              maxPlayers: 5,
              avatarUrl: getUserAvatar(),
            }),
          });
          if (cancelled) return;
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            setRoomError(err?.error || t('waitingRoom.cannotCreateRoom'));
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
          setRoomError(t('waitingRoom.roomNotFound'));
          setRoomLoading(false);
          return;
        }
        if (room.status !== "WAITING") {
          setRoomError(t('waitingRoom.gameAlreadyStarted'));
          setRoomLoading(false);
          return;
        }

        const inRoom = room.players?.some((p: { id: string }) => p.id === userId);
        const joinUrl = apiUrl(`/api/waiting-room/${rawRoomId}/join`);
        const joinRes = await fetch(joinUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, avatarUrl: getUserAvatar() }),
        });
        if (cancelled) return;
        if (!joinRes.ok) {
          if (!inRoom) {
            const err = await joinRes.json().catch(() => ({}));
            setRoomError(err?.error || t('waitingRoom.cannotJoin'));
            setRoomLoading(false);
            return;
          }
          applyRoomSnapshot(room);
        } else {
          const payload = await joinRes.json();
          applyRoomSnapshot(payload);
        }
        // Récupérer la balance serveur avant démarrage (le serveur utilise user.chips en DB)
        fetchBalanceFromServer().catch(() => {});
      } catch (e) {
        if (!cancelled) setRoomError(e instanceof Error ? e.message : t('common.error'));
      } finally {
        if (!cancelled) setRoomLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [userId, username, rawRoomId, navigate, fetchRoom, applyRoomSnapshot]);

  useEffect(() => {
    if (!userId || !rawRoomId || rawRoomId.startsWith("room_") || roomLoading) return;
    joinRoom(rawRoomId);
    return () => leaveRoom(rawRoomId);
  }, [userId, rawRoomId, roomLoading]);

  useEffect(() => {
    if (!socket || !navigate) return;
    const onGameStarted = (data: { gameId: string; players: { id: string; name: string }[] }) => {
      try {
        if (data.gameId && data.players?.length) {
          localStorage.setItem("gamePlayers", JSON.stringify(data.players));
          localStorage.setItem("gameId", data.gameId);
          leaveRoom(rawRoomId!);
          navigate(`/game?gameId=${data.gameId}`);
        }
      } catch { /* no-op */ }
    };
    socket.on("GAME_STARTED", onGameStarted);
    return () => socket.off("GAME_STARTED", onGameStarted);
  }, [socket, navigate, rawRoomId]);

  useEffect(() => {
    if (!socket || !userId || !addToast) return;
    const onHostRequestedStart = (data: { message?: string; notReadyPlayers?: { id: string; name: string }[] }) => {
      const notReady = data?.notReadyPlayers ?? [];
      const amINotReady = notReady.some((p: { id: string }) => String(p.id) === String(userId));
      if (amINotReady) {
        addToast(data?.message ?? t('waitingRoom.hostWantsStart'), "info");
      }
    };
    socket.on("HOST_REQUESTED_START", onHostRequestedStart);
    const onWaitingRoomUpdated = (room: {
      id?: string;
      status?: string;
      name?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
      turbo?: boolean;
      hostId?: string;
      players?: Array<{ id: string; username: string; level?: number; isReady?: boolean; avatarUrl?: string | null }>;
    } | null) => {
      if (!room || room.status !== "WAITING") return;
      applyRoomSnapshot(room);
    };
    socket.on("WAITING_ROOM_UPDATED", onWaitingRoomUpdated);
    return () => {
      socket.off("HOST_REQUESTED_START", onHostRequestedStart);
      socket.off("WAITING_ROOM_UPDATED", onWaitingRoomUpdated);
    };
  }, [socket, userId, addToast, applyRoomSnapshot]);

  useEffect(() => {
    if (!rawRoomId || rawRoomId.startsWith("room_")) return;
    const interval = setInterval(async () => {
      if (roomPollInFlightRef.current) return;
      roomPollInFlightRef.current = true;
      let room: Awaited<ReturnType<typeof fetchRoom>> = null;
      try {
        room = await fetchRoom(rawRoomId);
      } finally {
        roomPollInFlightRef.current = false;
      }
      if (!room || room.status !== "WAITING") return;
      applyRoomSnapshot(room);
    }, 5000);
    return () => clearInterval(interval);
  }, [rawRoomId, fetchRoom, applyRoomSnapshot]);

  // Polling join requests for private rooms (host only)
  const fetchJoinRequests = useCallback(async () => {
    if (!rawRoomId || !userId || !isCreator || roomVisibility !== 'PRIVATE') return;
    try {
      const url = `${apiUrl(`/api/waiting-room/${rawRoomId}/join-requests`)}?hostId=${userId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setJoinRequests(data);
      }
    } catch { /* ignore */ }
  }, [rawRoomId, userId, isCreator, roomVisibility]);

  useEffect(() => {
    fetchJoinRequests();
    // nosemgrep: javascript.lang.security.detect-eval-with-expression.detect-eval-with-expression
    const interval = setInterval(fetchJoinRequests, 3000);
    return () => clearInterval(interval);
  }, [fetchJoinRequests]);

  // Listen for new join requests via socket (instant refresh)
  useEffect(() => {
    if (!socket || !isCreator) return;
    const onJoinRequest = () => { fetchJoinRequests(); };
    socket.on('JOIN_REQUEST_RECEIVED', onJoinRequest);
    return () => { socket.off('JOIN_REQUEST_RECEIVED', onJoinRequest); };
  }, [socket, isCreator, fetchJoinRequests]);

  const handleAcceptRequest = async (requestId: string) => {
    if (!rawRoomId || !userId) return;
    setProcessingRequest(requestId);
    try {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/join-requests/${requestId}/accept`);
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: userId }),
      });
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } catch { /* ignore */ }
    setProcessingRequest(null);
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!rawRoomId || !userId) return;
    setProcessingRequest(requestId);
    try {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/join-requests/${requestId}/reject`);
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: userId }),
      });
      setJoinRequests(prev => prev.filter(r => r.id !== requestId));
    } catch { /* ignore */ }
    setProcessingRequest(null);
  };

  const handleInvite = (friend: { id: string; username: string; level?: number }) => {
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
      level: friend.level ?? 0,
      isReady: false
    }]);
  };

  const _handleRemoveInvite = (playerId: string) => {
    socket?.emit('cancel-invitation', {
      roomId,
      playerId
    });
    setInvitedPlayers(prev => prev.filter(p => p.id !== playerId));
  };

  const handleReady = () => {
    socket?.emit("player-ready", { roomId, userId });
    setMyIsReady(true); // Optimistic update
    if (rawRoomId && !rawRoomId.startsWith("room_")) {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/ready`);
      fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isReady: true }),
      }).catch(() => {});
    }
  };

  const handleStartGame = async () => {
    if (!rawRoomId || rawRoomId.startsWith("room_") || !userId) return;
    setStartError(null);
    setStarting(true);
    try {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/start`);
      const forceCardsPayload: Record<string, Array<{ suit: string; rank: string }>> = {};
      for (const [pid, cards] of Object.entries(forceCards)) {
        if (cards?.[0]?.suit && cards?.[0]?.rank && cards?.[1]?.suit && cards?.[1]?.rank) {
          forceCardsPayload[pid] = [{ suit: cards[0].suit, rank: cards[0].rank }, { suit: cards[1].suit, rank: cards[1].rank }];
        }
      }
      const body: { userId: string; forceCards?: Record<string, Array<{ suit: string; rank: string }>> } = { userId };
      if (Object.keys(forceCardsPayload).length > 0) body.forceCards = forceCardsPayload;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.error || t('waitingRoom.cannotStart');
        if (msg === "Tous les joueurs ne sont pas prêts" && Array.isArray(err?.notReadyPlayers) && err.notReadyPlayers.length > 0) {
          setStartError(`${t('waitingRoom.notAllReady')} : ${err.notReadyPlayers.join(", ")} ${t('waitingRoom.mustBeReady')}`);
        } else if (msg === "Tous les joueurs ne sont pas prêts") {
          setStartError(t('waitingRoom.startErrorNotReady'));
        } else {
          setRoomError(msg);
        }
        return;
      }
      const data = await res.json();
      if (data.players?.length) {
        localStorage.setItem("gamePlayers", JSON.stringify(data.players));
        localStorage.setItem("gameId", data.gameId || "");
      }
      leaveRoom(rawRoomId);
      navigate(data.gameId ? `/game?gameId=${data.gameId}` : "/game");
    } catch (e) {
      setRoomError(e instanceof Error ? e.message : t('waitingRoom.cannotStart'));
    } finally {
      setStarting(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (rawRoomId && !rawRoomId.startsWith("room_") && userId) {
      try {
        const url = apiUrl(`/api/waiting-room/${rawRoomId}/leave`);
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch { /* no-op */ }
    }
    leaveRoom(roomId);
    navigate("/lobby");
  };

  if (roomLoading && !roomName) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <p>{t('waitingRoom.loadingRoom')}</p>
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
            {t('waitingRoom.backToLobby')}
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
            <span>{t('waitingRoom.leave')}</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              <span className="text-gray-400 text-sm">{isConnected ? t('waitingRoom.connected') : t('waitingRoom.disconnected')}</span>
            </div>
            <button
              type="button"
              onClick={handleLeaveRoom}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-600 bg-slate-800 text-slate-300 transition hover:border-slate-500 hover:bg-slate-700 hover:text-white"
              aria-label={t("common.close")}
              title={t("common.close")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center shadow-xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-bold text-white">{roomName || t('waitingRoom.waitingRoomTitle')}</h1>
              {roomVisibility === 'PRIVATE' ? (
                <span className="flex items-center gap-1 bg-purple-600/30 text-purple-300 text-xs font-semibold px-2 py-1 rounded-full border border-purple-500/40">
                  <Lock className="w-3 h-3" />
                  {t('lobby.private')}
                </span>
              ) : (
                <span className="flex items-center gap-1 bg-green-600/30 text-green-300 text-xs font-semibold px-2 py-1 rounded-full border border-green-500/40">
                  <Globe className="w-3 h-3" />
                  {t('lobby.public')}
                </span>
              )}
              {roomTurbo ? (
                <span className="flex items-center gap-1 border border-amber-500/50 bg-amber-600/25 text-amber-200 text-xs font-semibold px-2 py-1 rounded-full">
                  <Zap className="w-3 h-3" />
                  {t("waitingRoom.turboMode")}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Joueurs dans la salle */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Users className="w-6 h-6" />
              {t('waitingRoom.playersInRoom', { count: players.length + 1 })}
            </h2>

            {/* Toi-même */}
            <div className="bg-blue-800/30 rounded-xl p-4 border border-blue-700/50 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-blue-500 shadow-lg transition">
                      <ImageWithFallback
                        src={getPlayerAvatar(username || "Vous", userId, userId)}
                        alt={`${username || "Vous"} avatar`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    </div>
                    <div className={`absolute bottom-0 right-0 w-5 h-5 ${myIsReady ? 'bg-green-500' : isCreator ? 'bg-amber-500' : 'bg-yellow-500'} rounded-full border-2 border-slate-800`} title={myIsReady ? t('waitingRoom.ready') : t('game.waiting')}></div>
                  </div>
                  <div>
                    <div className="text-white font-bold">{username}</div>
                    <div className="text-gray-400 text-sm">{myIsReady ? `✅ ${t('waitingRoom.ready')}` : t('waitingRoom.readyQuestion')}</div>
                  </div>
                </div>
                {!myIsReady && (
                  <button
                    onClick={handleReady}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold"
                  >
                    {t('waitingRoom.ready')}
                  </button>
                )}
                {myIsReady && (
                  <span className="text-green-400 font-medium">✅ {t('waitingRoom.ready')}</span>
                )}
              </div>
            </div>

            {/* Autres joueurs */}
            {players.map((player) => (
              <div key={player.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-blue-500 shadow-lg transition">
                        <ImageWithFallback
                          src={getPlayerAvatar(player.name, player.id, userId, player.avatarUrl)}
                          alt={`${player.name} avatar`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </div>
                      <div className={`absolute bottom-0 right-0 w-5 h-5 ${player.isReady ? 'bg-green-500' : 'bg-yellow-500'} rounded-full border-2 border-slate-800`}></div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{player.name}</div>
                      <div className="text-gray-400 text-sm">{t('friends.level', { level: player.level })}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {player.isReady ? `✅ ${t('waitingRoom.ready')}` : `⏳ ${t('game.waiting')}`}
                  </div>
                </div>
              </div>
            ))}

            {players.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                <div className="text-gray-400">
                  {t('waitingRoom.waitingForOthers')}
                </div>
              </div>
            )}
          </div>

          {/* Invitations aux amis */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              {t('waitingRoom.inviteFriends')}
            </h2>

            <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
              {friends?.filter(f => !players.some(p => p.id === f.id) && f.id !== userId)
                .map((friend) => (
                  <div key={friend.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-blue-500 shadow-lg transition">
                          <ImageWithFallback
                            src={getPlayerAvatar(friend.username, friend.id, userId)}
                            alt={`${friend.username} avatar`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                      </div>
                      <div>
                        <div className="text-white font-bold">{friend.username}</div>
                        <div className="text-yellow-400 text-sm">{t('friends.level', { level: friend.level })}</div>
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
                      {invitedPlayers.some(p => p.id === friend.id) ? t('waitingRoom.invited') : t('waitingRoom.invite')}
                    </button>
                  </div>
                ))}

              {(!friends || friends.length === 0) && (
                <div className="text-center py-8">
                  <div className="text-gray-400">{t('waitingRoom.noFriendsOnline')}</div>
                </div>
              )}
            </div>

            {/* Join requests panel (private rooms, host only) */}
            {isCreator && roomVisibility === 'PRIVATE' && (
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/40 mb-4">
                <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2 mb-3">
                  <UserCheck className="w-5 h-5" />
                  {t('waitingRoom.joinRequests')}
                  {joinRequests.length > 0 && (
                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {joinRequests.length}
                    </span>
                  )}
                </h3>
                {joinRequests.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-2">{t('waitingRoom.noJoinRequests')}</p>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between bg-slate-800/70 rounded-lg px-3 py-2 border border-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-blue-500 shadow-lg transition">
                            <ImageWithFallback
                              src={getPlayerAvatar(req.username, req.userId, userId)}
                              alt={`${req.username} avatar`}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{req.username}</p>
                            <p className="text-gray-400 text-xs">{t('friends.level', { level: req.level })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            disabled={processingRequest === req.id}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white p-1.5 rounded-lg transition"
                            title={t('friends.accept')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={processingRequest === req.id}
                            className="bg-red-600 hover:bg-red-500 disabled:bg-slate-600 text-white p-1.5 rounded-lg transition"
                            title={t('friends.reject')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Voir plus : cartes forcées pour les tests (host only) */}
            {isCreator && allPlayersForCards.length >= 2 && (
              <div className="mt-4 border border-amber-500/40 rounded-xl bg-amber-950/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowTestCards((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-amber-200 hover:bg-amber-900/30 transition"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <TestTube className="w-4 h-4" />
                    {t('waitingRoom.seeMoreTestCards')}
                  </span>
                  {showTestCards ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showTestCards && (
                  <div className="p-4 border-t border-amber-500/30 space-y-4">
                    <p className="text-amber-200/80 text-sm">
                      {t('waitingRoom.testCardsDesc')}
                    </p>
                    {allPlayersForCards.map((p) => {
                      const cards = forceCards[p.id] ?? [null, null];
                      return (
                        <div key={p.id} className="bg-slate-800/60 rounded-lg p-3">
                          <div className="text-white font-medium text-sm mb-2">{p.name}</div>
                          <div className="flex gap-3 flex-wrap">
                            {[0, 1].map((i) => (
                              <div key={i} className="flex gap-1 items-center">
                                <select
                                  value={cards[i]?.suit ?? ""}
                                  onChange={(e) => {
                                    const s = e.target.value;
                                    setForceCards((prev) => {
                                      const c = prev[p.id] ?? [null, null];
                                      const copy = [...c];
                                      copy[i] = s ? { suit: s, rank: copy[i]?.rank ?? RANKS[0] } : null;
                                      return { ...prev, [p.id]: copy };
                                    });
                                  }}
                                  className="bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600"
                                >
                                  <option value="">—</option>
                                  {SUITS.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                  ))}
                                </select>
                                <select
                                  value={cards[i]?.rank ?? ""}
                                  onChange={(e) => {
                                    const r = e.target.value;
                                    setForceCards((prev) => {
                                      const c = prev[p.id] ?? [null, null];
                                      const copy = [...c];
                                      copy[i] = r ? { suit: copy[i]?.suit ?? SUITS[0], rank: r } : null;
                                      return { ...prev, [p.id]: copy };
                                    });
                                  }}
                                  className="bg-slate-700 text-white rounded px-2 py-1 text-sm border border-slate-600"
                                >
                                  <option value="">—</option>
                                  {RANKS.map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {isCreator && (
              <div className="space-y-3">
                {startError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{startError}</p>
                      <button
                        type="button"
                        onClick={() => setStartError(null)}
                        className="mt-2 text-xs text-amber-300 hover:text-amber-200 underline"
                      >
                        {t('waitingRoom.close')}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleStartGame}
                  disabled={!myIsReady || players.length < 1 || starting}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                    myIsReady && players.length >= 1 && !starting
                      ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white transform hover:scale-105"
                      : "bg-slate-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {starting ? t('waitingRoom.starting') : t('waitingRoom.startGameWithCount', { count: players.length + 1 })}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}