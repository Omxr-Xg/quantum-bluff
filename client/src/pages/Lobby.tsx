import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, Server, User, Users, LogOut, Loader2 } from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { getUserBalance } from "../utils/userProfile";
import { FriendsList } from '../components/FriendsList';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useUser } from '../hooks/useUser';

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
  status: string;
  players: RoomPlayer[];
  playerCount: number;
}

export function Lobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userBalance = getUserBalance();
  const { userId, username } = useUser();
  const [rooms, setRooms] = useState<WaitingRoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);

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

  const handleCreateServer = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      const url = API_BASE ? `${API_BASE}/api/waiting-room/create` : "/api/waiting-room/create";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: userId,
          roomName: `Salle de ${username || "Joueur"}`,
          maxPlayers: 5,
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

  const handleJoinRoom = (roomId: string) => {
    navigate(`/waiting-room?roomId=${roomId}`);
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">

      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-10">

          <div className="flex items-center gap-4">
            <QuantumBluffLogo className="w-16 h-16" />

            <div>
              <h1 className="text-4xl font-bold text-purple-400">
                {t('lobby.title')}
              </h1>
              <p className="text-gray-400">{t('lobby.welcome', { username: username || 'Joueur' })}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl px-6 py-3 text-yellow-300 font-bold">
              {t('lobby.balance', { balance: userBalance.toLocaleString() })}
            </div>

            <button
              onClick={() => navigate("/profile")}
              className="bg-green-600 p-3 rounded-xl text-white hover:bg-green-500 transition"
              title={t('lobby.profile')}
            >
              <User className="w-6 h-6" />
            </button>
            <button
              onClick={() => navigate("/friends")}
              className="bg-blue-600 p-3 rounded-xl text-white hover:bg-blue-500 transition"
              title={t('lobby.manageFriends')}
            >
              <Users className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigate("/")}
              className="bg-red-600 p-3 rounded-xl text-white hover:bg-red-500 transition"
              title={t('lobby.logout')}
            >
              <LogOut className="w-6 h-6" />
            </button>

          </div>
        </div>

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
                  onClick={handleCreateServer}
                  disabled={!userId || creating}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {creating ? t('lobby.creating') : t('lobby.createNewServer')}
                </button>

                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-gray-300 text-sm mb-2">{t('lobby.serversAvailable')}</p>
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
                      {rooms.map((room) => (
                        <li
                          key={room.id}
                          className="flex items-center justify-between gap-3 bg-slate-800/70 rounded-lg px-3 py-2 border border-slate-600"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-medium truncate">{room.name}</p>
                            <p className="text-gray-400 text-xs">
                              {t('lobby.playersCount', { count: room.playerCount, max: room.maxPlayers })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleJoinRoom(room.id)}
                            disabled={room.playerCount >= room.maxPlayers}
                            className="shrink-0 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition"
                          >
                            {t('lobby.join')}
                          </button>
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