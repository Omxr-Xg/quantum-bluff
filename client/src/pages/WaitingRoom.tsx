import { useState } from "react";
import { useNavigate } from "react-router";
import { UserPlus, ArrowLeft, Users, Check, Home } from "lucide-react";

interface Friend {
  id: number;
  name: string;
  avatar: string;
  isOnline: boolean;
  level: number;
  invited: boolean;
}

export function WaitingRoom() {
  const navigate = useNavigate();
  const [friends, setFriends] = useState<Friend[]>([
    { id: 1, name: "Alice", avatar: "A", isOnline: true, level: 25, invited: false },
    { id: 2, name: "Bob", avatar: "B", isOnline: true, level: 18, invited: false },
    { id: 4, name: "Diana", avatar: "D", isOnline: true, level: 15, invited: false },
  ]);

  const [invitedPlayers, setInvitedPlayers] = useState<Friend[]>([]);

  const handleInvite = (friend: Friend) => {
    setFriends(friends.map(f => 
      f.id === friend.id ? { ...f, invited: true } : f
    ));
    setInvitedPlayers([...invitedPlayers, { ...friend, invited: true }]);
  };

  const handleRemoveInvite = (friendId: number) => {
    setFriends(friends.map(f => 
      f.id === friendId ? { ...f, invited: false } : f
    ));
    setInvitedPlayers(invitedPlayers.filter(p => p.id !== friendId));
  };

  const handleStartGame = () => {
    // Lancer le jeu avec les amis invités
    navigate("/game?mode=friends");
  };

  const onlineFriends = friends.filter(f => f.isOnline);

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate("/lobby")}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-semibold transition-all"
          >
            <Home className="w-5 h-5" />
            <span>Accueil</span>
          </button>
        </div>

        {/* Titre */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center shadow-xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Salle d'attente</h1>
            <p className="text-gray-400">
              Invitez vos amis pour commencer la partie
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste des amis en ligne */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              Amis en ligne ({onlineFriends.length})
            </h2>

            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {onlineFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white flex items-center justify-center shadow-lg">
                        <span className="text-white text-lg font-bold">
                          {friend.avatar}
                        </span>
                      </div>
                      {/* Indicateur en ligne */}
                      <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800 shadow-lg shadow-green-500/50"></div>
                    </div>

                    {/* Info */}
                    <div>
                      <div className="text-white font-bold">{friend.name}</div>
                      <div className="text-yellow-400 text-sm">Niveau {friend.level}</div>
                    </div>
                  </div>

                  {/* Bouton inviter */}
                  <button
                    onClick={() => handleInvite(friend)}
                    disabled={friend.invited}
                    className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                      friend.invited
                        ? "bg-green-600 text-white cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-500 text-white"
                    }`}
                  >
                    {friend.invited ? (
                      <span className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Invité
                      </span>
                    ) : (
                      "Inviter"
                    )}
                  </button>
                </div>
              ))}

              {onlineFriends.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400">Aucun ami en ligne</div>
                </div>
              )}
            </div>
          </div>

          {/* Joueurs invités */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Users className="w-6 h-6" />
              Joueurs invités ({invitedPlayers.length})
            </h2>

            <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
              {invitedPlayers.map((player) => (
                <div
                  key={player.id}
                  className="bg-green-800/30 rounded-xl p-4 border border-green-700/50 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-600 to-green-800 border-2 border-white flex items-center justify-center shadow-lg">
                      <span className="text-white text-lg font-bold">
                        {player.avatar}
                      </span>
                    </div>

                    {/* Info */}
                    <div>
                      <div className="text-white font-bold">{player.name}</div>
                      <div className="text-green-300 text-sm">En attente...</div>
                    </div>
                  </div>

                  {/* Bouton retirer */}
                  <button
                    onClick={() => handleRemoveInvite(player.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-semibold transition-colors"
                  >
                    Retirer
                  </button>
                </div>
              ))}

              {invitedPlayers.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-xl">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <div className="text-gray-400">
                    Invitez des amis pour commencer
                  </div>
                </div>
              )}
            </div>

            {/* Bouton lancer la partie */}
            <button
              onClick={handleStartGame}
              disabled={invitedPlayers.length === 0}
              className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all ${
                invitedPlayers.length > 0
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white transform hover:scale-105"
                  : "bg-slate-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {invitedPlayers.length > 0
                ? `Lancer la partie (${invitedPlayers.length + 1} joueurs)`
                : "Invitez au moins un ami"}
            </button>

            {/* Info supplémentaire */}
            {invitedPlayers.length > 0 && (
              <div className="mt-4 text-center text-sm text-gray-400">
                La partie commencera quand tous les joueurs seront prêts
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}