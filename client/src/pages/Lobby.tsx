import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Server, Loader2, X, Trash2, Lock, Globe, Minus, Plus, Eye, ChevronDown, ChevronUp, Settings2, XCircle } from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { FriendsList } from '../components/FriendsList';
import { useUser } from '../hooks/useUser';
import { useToast } from '../contexts/ToastContext';
import { useTopBar } from '../contexts/TopBarContext';
import { LobbyInteractiveTour } from '../components/LobbyInteractiveTour';

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
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [createSmallBlind, setCreateSmallBlind] = useState(5);
  const [createBigBlind, setCreateBigBlind] = useState(10);
  const [createMinBalance, setCreateMinBalance] = useState(100);
  const [requestingRoom, setRequestingRoom] = useState<string | null>(null);
  const [gamesInProgress, setGamesInProgress] = useState<GameInProgressItem[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [lobbyTourOpen, setLobbyTourOpen] = useState(false);
  const [lobbyTourStep, setLobbyTourStep] = useState(0);
  const { addToast } = useToast();

  const tourRefHeader = useRef<HTMLDivElement>(null);
  const tourRefTopBar = useRef<HTMLDivElement>(null);
  const tourRefBot = useRef<HTMLDivElement>(null);
  const tourRefMultiplayer = useRef<HTMLDivElement>(null);
  const tourRefWaiting = useRef<HTMLDivElement>(null);
  const tourRefGames = useRef<HTMLDivElement>(null);
  const tourRefFriends = useRef<HTMLDivElement>(null);

  const lobbyTourRefs = useMemo(
    () => ({
      header: tourRefHeader,
      topBar: tourRefTopBar,
      bot: tourRefBot,
      multiplayer: tourRefMultiplayer,
      waitingRooms: tourRefWaiting,
      gamesInProgress: tourRefGames,
      friends: tourRefFriends,
    }),
    []
  );

  const fetchGamesInProgress = useCallback(async () => {
    try {
      const base = API_BASE ? `${API_BASE}/api/waiting-room/games-in-progress` : "/api/waiting-room/games-in-progress";
      const url = userId ? `${base}?userId=${encodeURIComponent(userId)}` : base;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      setGamesInProgress(Array.isArray(data) ? data : []);
    } catch {
      setGamesInProgress([]);
    } finally {
      setGamesLoading(false);
    }
  }, [userId]);

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
      const base = API_BASE ? `${API_BASE}/api/waiting-room` : "/api/waiting-room";
      const url = userId ? `${base}?userId=${encodeURIComponent(userId)}` : base;
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
  }, [t, userId]);

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
    setShowCreateAdvanced(false);
    setCreateSmallBlind(5);
    setCreateBigBlind(10);
    setCreateMinBalance(100);
  };

  const MIN_BALANCE = 100;
  const isMinBalanceInvalid = createMinBalance < MIN_BALANCE;

  const handleCreateServer = async () => {
    if (!userId) return;
    if (isMinBalanceInvalid) {
      addToast(t('lobby.minAmount100'), 'error');
      return;
    }
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
          smallBlind: createSmallBlind,
          bigBlind: createBigBlind,
          minBalance: createMinBalance,
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
    <div className="relative w-full min-h-screen overflow-hidden bg-[#070912] p-6">
      {/* Fond lobby stylisé (auras + grille subtile) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-purple-700/25 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-fuchsia-500/15 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(34,211,238,0.06),transparent_55%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto">

        {/* HEADER */}
        {/* 📱 FIX MOBILE : flex-col sur mobile (empilé), flex-row sur PC (aligné). overflow-visible pour que le dropdown langue ne soit pas coupé */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10 w-full overflow-visible">

          {/* Côté Gauche (Logo + Titre) */}
          <div ref={tourRefHeader} className="flex items-center gap-4 w-full md:w-auto">
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
          <div ref={tourRefTopBar} className="flex items-center gap-3 flex-wrap justify-end">
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

              {/* Voir plus — options avancées */}
              <button
                type="button"
                onClick={() => setShowCreateAdvanced(v => !v)}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300 text-sm font-medium py-2 mb-2 transition-colors"
              >
                <Settings2 className="w-4 h-4" />
                <span>{showCreateAdvanced ? t('lobby.hideOptions') : t('lobby.seeMore')}</span>
                {showCreateAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showCreateAdvanced && (
                <div className="mb-6 p-4 bg-slate-900/50 rounded-xl border border-slate-600 space-y-4">
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-2">{t('lobby.smallBlind')}</label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={createSmallBlind}
                      onChange={(e) => setCreateSmallBlind(Math.max(1, Math.min(10000, Number(e.target.value) || 1)))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-2">{t('lobby.minRaise')}</label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={createBigBlind}
                      onChange={(e) => setCreateBigBlind(Math.max(1, Math.min(10000, Number(e.target.value) || 2)))}
                      className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <p className="text-slate-500 text-xs mt-1">{t('lobby.minRaiseHint')}</p>
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm font-medium block mb-2">{t('lobby.minBalance')}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={1000000}
                        step={100}
                        value={createMinBalance}
                        onChange={(e) => {
                          const raw = e.target.value === "" ? 0 : Number(e.target.value);
                          const val = Number.isNaN(raw) ? 0 : Math.min(1000000, Math.max(0, raw));
                          setCreateMinBalance(val);
                        }}
                        className={`flex-1 bg-slate-700 border rounded-lg px-4 py-2 text-white text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                          isMinBalanceInvalid ? "border-red-500" : "border-slate-600"
                        }`}
                      />
                      {isMinBalanceInvalid && (
                        <div className="relative flex items-center gap-1">
                          <XCircle className="w-6 h-6 text-red-500 shrink-0" aria-hidden />
                          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-1 z-10 px-3 py-2 bg-slate-800 border border-red-500 rounded-lg shadow-xl text-red-400 text-sm font-medium whitespace-nowrap">
                            {t('lobby.minAmount100')}
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-slate-500 text-xs mt-1">{t('lobby.minBalanceHint')}</p>
                  </div>
                </div>
              )}

              {/* Validate */}
              <button
                type="button"
                onClick={handleCreateServer}
                disabled={creating || isMinBalanceInvalid}
                className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold text-lg transition flex items-center justify-center gap-2"
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
            <div ref={tourRefBot} className="bg-slate-800 rounded-2xl p-6 border border-purple-500">
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
            <div ref={tourRefMultiplayer} className="bg-slate-800 rounded-2xl p-6 border border-green-500">
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
                <div ref={tourRefWaiting} className="bg-slate-700/50 p-4 rounded-xl mb-4">
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
                <div ref={tourRefGames} className="bg-slate-700/50 p-4 rounded-xl">
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
          <div ref={tourRefFriends} className="lg:col-span-1">
            <FriendsList />
          </div>

        </div>

      </div>

      {/* Tutoriel interactif — bouton fixe bas-gauche */}
      <button
        type="button"
        onClick={() => {
          if (lobbyTourOpen) setLobbyTourOpen(false);
          else {
            setLobbyTourStep(0);
            setLobbyTourOpen(true);
          }
        }}
        className="fixed bottom-5 left-5 z-[260] flex h-12 w-12 items-center justify-center rounded-full border-2 border-purple-400/90 bg-purple-950/95 text-lg font-bold text-purple-100 shadow-xl backdrop-blur-sm transition hover:border-purple-300 hover:bg-purple-800/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        aria-label={t('lobby.help.openAria')}
        title={t('lobby.help.openAria')}
      >
        <span aria-hidden className="select-none">?</span>
      </button>

      <LobbyInteractiveTour
        open={lobbyTourOpen}
        onClose={() => setLobbyTourOpen(false)}
        step={lobbyTourStep}
        onStepChange={setLobbyTourStep}
        refs={lobbyTourRefs}
      />

    </div>
  );
}