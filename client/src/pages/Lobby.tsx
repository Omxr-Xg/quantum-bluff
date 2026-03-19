import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Server, Loader2, X, Trash2, Lock, Globe, Minus, Plus, Eye } from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { FriendsList } from '../components/FriendsList';
import { useUser } from '../hooks/useUser';
import { useToast } from '../contexts/ToastContext';
import { useTopBar } from '../contexts/TopBarContext';

const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "") || "";

interface RoomPlayer {
  id: string;
  username: string;
  level: number;
  isReady: boolean;
  position: number;
}

interface WaitingRoomItem {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: string;
  players: RoomPlayer[];
  playerCount: number;
}

interface GameInProgressItem {
  roomId: string;
  roomName: string;
  gameId: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  canJoin: boolean;
}

export function Lobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId, username } = useUser();
  const { menuContent } = useTopBar();
  const [rooms, setRooms] = useState<WaitingRoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createVisibility, setCreateVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [createMaxPlayers, setCreateMaxPlayers] = useState(5);
  const [requestingRoom, setRequestingRoom] = useState<string | null>(null);
  const [gamesInProgress, setGamesInProgress] = useState<GameInProgressItem[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const { addToast } = useToast();

  const fetchGamesInProgress = useCallback(async () => {
    try {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/games-in-progress` : "/api/waiting-room/games-in-progress";
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setGamesInProgress(Array.isArray(data) ? data : []);
    } catch {
      setGamesInProgress([]);
    } finally {
      setGamesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGamesInProgress();
    const iv = setInterval(fetchGamesInProgress, 5000);
    return () => clearInterval(iv);
  }, [fetchGamesInProgress]);

  // Auto-navigate when a join request is accepted
  useEffect(() => {
    const onAccepted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.roomId) {
        navigate(`/waiting-room?roomId=${detail.roomId}`);
      }
    };
    window.addEventListener('join-request-accepted', onAccepted);
    return () => window.removeEventListener('join-request-accepted', onAccepted);
  }, [navigate]);

  const fetchRooms = useCallback(async () => {
    try {
      const url = API_BASE ? `${API_BASE}/api/waiting-room` : "/api/waiting-room";
      const res = await fetch(url);
      if (!res.ok) throw new Error(t('common.error'));
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
      setRoomsError(null);
    } catch (e) {
      setRoomsError(e instanceof Error ? e.message : t('common.error'));
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const handlePlayBot = () => {
    navigate("/bot-configuration");
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateVisibility('PUBLIC');
    setCreateMaxPlayers(5);
  };

  const handleCreateServer = async () => {
    if (!userId) return;
    setCreating(true);
    setShowCreateModal(false);
    try {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/create` : "/api/waiting-room/create";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: userId,
          roomName: `Salle de ${username || "Joueur"}`,
          maxPlayers: createMaxPlayers,
          visibility: createVisibility,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Erreur ${res.status}`);
      }
      const room = await res.json();
      navigate(`/waiting-room?roomId=${room.id}`);
    } catch (e) {
      setRoomsError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleRequestJoin = async (roomId: string) => {
    if (!userId) return;
    setRequestingRoom(roomId);
    try {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/${roomId}/request-join` : `/api/waiting-room/${roomId}/request-join`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Erreur ${res.status}`);
      }
      addToast(t('lobby.requestSent'), 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setRequestingRoom(null);
    }
  };

  const handleJoinRoom = (roomId: string) => {
    navigate(`/waiting-room?roomId=${roomId}`);
  };

  const handleJoinGame = (gameId: string) => {
    navigate(`/game?gameId=${gameId}`);
  };

  const handleSpectateGame = (gameId: string) => {
    navigate(`/game?gameId=${gameId}&spectate=1`);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!userId) return;
    try {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/${roomId}` : `/api/waiting-room/${roomId}`;
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        // On ne bloque pas l'UI, mais on peut afficher un message d'erreur minimal
        console.error("Erreur suppression salle:", await res.text().catch(() => ""));
      }
    } catch (e) {
      console.error("Erreur suppression salle:", e);
    } finally {
      // Rafraîchir la liste localement sans attendre le prochain polling
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    }
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        {/* 📱 FIX MOBILE : flex-col sur mobile (empilé), flex-row sur PC (aligné). overflow-visible pour que le dropdown langue ne soit pas coupé */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 w-full overflow-visible">

          {/* Côté Gauche (Logo + Titre) */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            <QuantumBluffLogo className="w-12 h-12 md:w-16 md:h-16 shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-bold text-purple-400 truncate">
                {t('lobby.title')}
              </h1>
              <p className="text-sm md:text-base text-gray-400 truncate">
                {t('lobby.welcome', { username: username || 'Joueur' })}
              </p>
            </div>
          </div>

          {/* Côté Droit : menu intégré (langue, argent, profil, amis, quitter) */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {menuContent}
          </div>
        </div>
        {/* FIN DU HEADER */}

        {/* Modal Créer un serveur */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={() => setShowCreateModal(false)}>
            <div className="bg-slate-800 border border-green-500/50 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{t('lobby.createServerTitle')}</h3>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Visibility toggle */}
              <div className="mb-6">
                <label className="text-slate-300 text-sm font-medium block mb-3">{t('lobby.visibility')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('PUBLIC')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                      createVisibility === 'PUBLIC'
                        ? 'bg-green-600/20 border-green-500 text-green-400'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Globe className="w-5 h-5" />
                    {t('lobby.public')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('PRIVATE')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                      createVisibility === 'PRIVATE'
                        ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                        : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <Lock className="w-5 h-5" />
                    {t('lobby.private')}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {createVisibility === 'PUBLIC' ? t('lobby.publicDesc') : t('lobby.privateDesc')}
                </p>
              </div>

              {/* Max players */}
              <div className="mb-6">
                <label className="text-slate-300 text-sm font-medium block mb-3">
                  {t('lobby.maxPlayersLabel')} : <span className="text-white font-bold">{createMaxPlayers}</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateMaxPlayers(p => Math.max(2, p - 1))}
                    disabled={createMaxPlayers <= 2}
                    className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold transition flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 flex gap-1.5">
                    {[2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCreateMaxPlayers(n)}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                          createMaxPlayers === n
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateMaxPlayers(p => Math.min(5, p + 1))}
                    disabled={createMaxPlayers >= 5}
                    className="w-10 h-10 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold transition flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Validate */}
              <button
                type="button"
                onClick={handleCreateServer}
                disabled={creating}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white font-bold text-lg transition flex items-center justify-center gap-2"
              >
                {creating && <Loader2 className="w-5 h-5 animate-spin" />}
                {t('lobby.validateCreate')}
              </button>
            </div>
          </div>
        )}

        {/* MAIN GRID - 2 colonnes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Colonne de gauche (2/3) - Jeu */}
          <div className="lg:col-span-2 space-y-6">

            {/* Section Jouer contre Bot */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-purple-500">
              <h2 className="text-2xl text-white font-bold flex items-center gap-3 mb-4">
                <Bot className="w-8 h-8 text-purple-400"/>
                {t('lobby.playBot')}
              </h2>

              <button
                onClick={handlePlayBot}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition"
              >
                {t('lobby.configureAndPlay')}
              </button>
            </div>

            {/* Section Serveur Multi-joueurs */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-green-500">
              <h2 className="text-2xl text-white font-bold flex items-center gap-3 mb-4">
                <Server className="w-8 h-8 text-green-400"/>
                {t('lobby.multiplayerServers')}
              </h2>

              <div className="space-y-3">
                <button
                  onClick={openCreateModal}
                  disabled={!userId || creating}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {creating ? t('lobby.creating') : t('lobby.createNewServer')}
                </button>

                {/* Salles d'attente */}
                <div className="bg-slate-700/50 p-4 rounded-xl mb-4">
                  <p className="text-gray-300 text-sm font-semibold mb-2">{t('lobby.waitingRooms')}</p>
                  {roomsLoading && rooms.length === 0 ? (
                    <p className="text-gray-500 text-center py-2 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                    </p>
                  ) : roomsError ? (
                    <p className="text-red-400 text-center py-2 text-sm">{roomsError}</p>
                  ) : rooms.length === 0 ? (
                    <p className="text-gray-500 text-center py-2">{t('lobby.noServersAvailable')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {rooms.map((room) => {
                        const isHost = userId && room.hostId === userId;
                        const isFull = room.playerCount >= room.maxPlayers;
                        const isPrivate = room.visibility === 'PRIVATE';
                        return (
                        <li
                          key={room.id}
                          className="flex items-center justify-between gap-3 bg-slate-800/70 rounded-lg px-3 py-2 border border-slate-600"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-white font-medium truncate">{room.name}</p>
                              {isPrivate ? (
                                <span className="flex items-center gap-1 bg-purple-600/30 text-purple-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-purple-500/40 shrink-0">
                                  <Lock className="w-2.5 h-2.5" />
                                  {t('lobby.private')}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 bg-green-600/30 text-green-300 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-green-500/40 shrink-0">
                                  <Globe className="w-2.5 h-2.5" />
                                  {t('lobby.public')}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 text-xs">
                              {t('lobby.playersCount', { count: room.playerCount, max: room.maxPlayers })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isHost && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRoom(room.id)}
                                className="bg-red-600 hover:bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-lg transition flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                {t('lobby.deleteServer')}
                              </button>
                            )}
                            {isFull ? (
                              <span className="text-gray-500 text-xs font-semibold px-3 py-1.5 bg-slate-700 rounded-lg cursor-not-allowed">
                                {t('lobby.roomFull')}
                              </span>
                            ) : isPrivate && !isHost ? (
                              <button
                                onClick={() => handleRequestJoin(room.id)}
                                disabled={requestingRoom === room.id}
                                className="shrink-0 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                              >
                                {requestingRoom === room.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                {t('lobby.requestJoin')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleJoinRoom(room.id)}
                                className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition"
                              >
                                {t('lobby.join')}
                              </button>
                            )}
                          </div>
                        </li>
                      )})}
                    </ul>
                  )}
                </div>

                {/* Parties en cours */}
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-gray-300 text-sm font-semibold mb-2">{t('lobby.gamesInProgress')}</p>
                  {gamesLoading && gamesInProgress.length === 0 ? (
                    <p className="text-gray-500 text-center py-2 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                    </p>
                  ) : gamesInProgress.length === 0 ? (
                    <p className="text-gray-500 text-center py-2">{t('lobby.noServersAvailable')}</p>
                  ) : (
                    <ul className="space-y-2">
                      {gamesInProgress.map((g) => (
                        <li
                          key={g.gameId}
                          className="flex items-center justify-between gap-3 bg-slate-800/70 rounded-lg px-3 py-2 border border-slate-600"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">{g.roomName}</p>
                            <p className="text-gray-400 text-xs">
                              {t('lobby.playersCount', { count: g.playerCount, max: g.maxPlayers })} · {g.phase}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {g.canJoin && (
                              <button
                                onClick={() => handleJoinGame(g.gameId)}
                                className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition"
                              >
                                {t('lobby.join')}
                              </button>
                            )}
                            <button
                              onClick={() => handleSpectateGame(g.gameId)}
                              className="shrink-0 bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              {t('lobby.spectate')}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* Colonne de droite (1/3) - Amis */}
          <div className="lg:col-span-1">
            <FriendsList />
          </div>

        </div>

      </div>

    </div>
  );
}