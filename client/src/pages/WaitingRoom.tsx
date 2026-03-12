import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router";
import { UserPlus, ArrowLeft, Users, Check, Home, LogOut } from "lucide-react";
import { useSocket } from "../contexts/SocketContext";
import { useUser } from "../hooks/useUser";
import { useGetFriendsQuery } from "../services/api";

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
  
  // Récupérer l'ID de la salle depuis l'URL (ex: /waiting-room?roomId=xxx)
  const queryParams = new URLSearchParams(location.search);
  const roomId = queryParams.get('roomId') || `room_${Date.now()}`;
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [invitedPlayers, setInvitedPlayers] = useState<Player[]>([]);
  const [isCreator, setIsCreator] = useState(false);
  
  // Récupérer les amis depuis l'API
  const { data: friends } = useGetFriendsQuery(userId!, { skip: !userId });

  // Connexion à la room via socket
  useEffect(() => {
    if (!userId) {
      navigate('/login');
      return;
    }

    // Rejoindre la room
    joinRoom(roomId);
    setIsCreator(true); // À déterminer via la logique métier

    // Écouter les événements
    socket?.on('player-joined', (player: Player) => {
      setPlayers(prev => [...prev, player]);
    });

    socket?.on('player-left', (playerId: string) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    socket?.on('player-ready', (playerId: string) => {
      setPlayers(prev => prev.map(p => 
        p.id === playerId ? { ...p, isReady: true } : p
      ));
    });

    socket?.on('game-starting', () => {
      navigate('/game');
    });

    socket?.on('invitation-sent', (invitedPlayer: Player) => {
      setInvitedPlayers(prev => [...prev, invitedPlayer]);
    });

    return () => {
      leaveRoom(roomId);
      socket?.off('player-joined');
      socket?.off('player-left');
      socket?.off('player-ready');
      socket?.off('game-starting');
      socket?.off('invitation-sent');
    };
  }, [userId, roomId, socket]);

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
    socket?.emit('player-ready', { roomId, userId });
  };

  const handleStartGame = () => {
    socket?.emit('start-game', { roomId, creatorId: userId });
  };

  const handleLeaveRoom = () => {
    leaveRoom(roomId);
    navigate('/lobby');
  };

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-semibold transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Quitter</span>
          </button>

          {/* Statut connexion */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-gray-400 text-sm">
              {isConnected ? 'Connecté' : 'Déconnecté'}
            </span>
          </div>
        </div>

        {/* Titre */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center shadow-xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Salle d'attente</h1>
            <p className="text-gray-400">
              Code de la salle : <span className="text-purple-400 font-mono">{roomId}</span>
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

            {/* Bouton lancer la partie */}
            {isCreator && (
              <button
                onClick={handleStartGame}
                disabled={players.length < 1}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all ${
                  players.length >= 1
                    ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white transform hover:scale-105"
                    : "bg-slate-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                Lancer la partie ({players.length + 1} joueurs)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}