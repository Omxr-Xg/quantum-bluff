import { useState } from "react";
import { useNavigate } from "react-router";
import { UserPlus, Search, ArrowLeft, MessageCircle, Users, X, Check, Loader2, Gamepad2 } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useUser } from "../hooks/useUser";
import { 
  useGetFriendsQuery, 
  useGetFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useRespondToFriendRequestMutation 
} from "../services/api";

export function Friends() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all">("all");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);

  // Requêtes API
  const { data: friends, refetch: refetchFriends, isLoading: loadingFriends } = useGetFriendsQuery(userId!, {
    skip: !userId
  });
  
  const { data: requests, refetch: refetchRequests } = useGetFriendRequestsQuery(userId!, {
    skip: !userId
  });

  const [sendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [respondRequest] = useRespondToFriendRequestMutation();

  // Recherche d'utilisateurs
  const { data: searchData, isLoading: searching } = useSearchUsersQuery(searchQuery, {
    skip: searchQuery.length < 2 || !showAddFriend
  });

  // Vérifier si on vient d'une partie en cours
  const isInGame = sessionStorage.getItem("currentGame");

  const filteredFriends = friends?.filter((friend) => {
    const matchesSearch = friend.username.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  const handleSearchUser = () => {
    if (!friendUsername.trim() || friendUsername.length < 2) {
      setSearchError("Minimum 2 caractères");
      return;
    }
    setIsSearching(true);
    setSearchError("");
    
    // La recherche se fait automatiquement via le hook
    setTimeout(() => {
      if (searchData && searchData.length > 0) {
        setSearchResults(searchData);
        setSearchError("");
      } else {
        setSearchError("Aucun utilisateur trouvé");
      }
      setIsSearching(false);
    }, 500);
  };

  const handleSendRequest = async (username: string) => {
    if (!userId) return;
    
    try {
      await sendRequest({ senderId: userId, receiverUsername: username }).unwrap();
      setSearchSuccess(true);
      setSearchResults([]);
      setFriendUsername("");
      setTimeout(() => {
        setSearchSuccess(false);
        setShowAddFriend(false);
      }, 2000);
    } catch (err) {
      setSearchError("Erreur lors de l'envoi de la demande");
    }
  };

  const handleRespond = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await respondRequest({ requestId, status }).unwrap();
      refetchFriends();
      refetchRequests();
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const openChat = (friendId: string) => {
    setSelectedChat(friendId);
  };

  const closeChat = () => {
    setSelectedChat(null);
  };

  const selectedFriend = friends?.find(f => f.id === selectedChat);

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isInGame ? (
              <button
                onClick={() => {
                  const gameData = sessionStorage.getItem("currentGame");
                  if (gameData) {
                    navigate(gameData);
                  }
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg"
              >
                <Gamepad2 className="w-5 h-5" />
                <span>Retour à la partie</span>
              </button>
            ) : null}
            <button
              onClick={() => navigate("/lobby")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Retour au lobby</span>
            </button>
          </div>

          <button 
            onClick={() => setShowAddFriend(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            Ajouter un ami
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">Mes Amis</h1>
            <p className="text-gray-400">
              {friends?.length || 0} amis
            </p>
          </div>
        </div>

        {/* Demandes d'amis reçues */}
        {requests && requests.length > 0 && (
          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 rounded-2xl shadow-xl border border-yellow-600 p-6 mb-6">
            <h2 className="text-xl text-yellow-400 font-bold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Demandes d'amis ({requests.length})
            </h2>
            <div className="space-y-3">
              {requests.map((req) => (
                <div key={req.id} className="flex items-center justify-between bg-black/30 p-3 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {req.sender.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-white font-medium">{req.sender.username}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRespond(req.id, 'ACCEPTED')}
                      className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRespond(req.id, 'REJECTED')}
                      className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Barre de recherche */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un ami..."
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {/* Liste d'amis */}
        {loadingFriends ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-xl border border-slate-700 p-6 hover:border-green-500/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white overflow-hidden flex items-center justify-center shadow-lg">
                    {getPlayerAvatar(friend.username) ? (
                      <ImageWithFallback
                        src={getPlayerAvatar(friend.username)}
                        alt={`${friend.username}'s avatar`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {friend.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold text-white">
                        {friend.username}
                      </h3>
                      <span className="text-yellow-400 text-sm font-semibold">
                        Niveau {friend.level}
                      </span>
                    </div>

                    <div className="text-gray-400 text-sm mb-3">
                      Niveau {friend.level}
                    </div>

                    <div className="text-gray-400 text-sm mb-4">
                      🏆 {friend.stats?.wins || 0} victoires
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => openChat(friend.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Discuter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredFriends.length === 0 && !loadingFriends && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg">Aucun ami trouvé</p>
          </div>
        )}
      </div>

      {/* Modal Ajouter un ami */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Ajouter un ami</h2>
              </div>
              <button
                onClick={() => {
                  setShowAddFriend(false);
                  setFriendUsername("");
                  setSearchError("");
                  setSearchSuccess(false);
                  setSearchResults([]);
                }}
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-400 mb-4">
                Entrez le nom d'utilisateur de votre ami pour lui envoyer une demande.
              </p>

              <div className="mb-4">
                <label htmlFor="friendUsername" className="block text-sm font-semibold text-gray-300 mb-2">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="friendUsername"
                    type="text"
                    value={friendUsername}
                    onChange={(e) => {
                      setFriendUsername(e.target.value);
                      setSearchError("");
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                    placeholder="Nom du joueur"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Résultats de recherche */}
              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                </div>
              )}

              {searchResults.length > 0 && !searching && (
                <div className="mb-4">
                  <h3 className="text-white font-semibold mb-2">Résultats :</h3>
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg mb-2">
                      <span className="text-white">{user.username}</span>
                      <button
                        onClick={() => handleSendRequest(user.username)}
                        disabled={sendingRequest}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded-lg text-sm"
                      >
                        Ajouter
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchError && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {searchError}
                </p>
              )}
              
              {searchSuccess && (
                <p className="text-green-500 text-sm mt-2 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Demande envoyée avec succès !
                </p>
              )}

              <button
                onClick={handleSearchUser}
                disabled={searching || sendingRequest}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {searching || sendingRequest ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Recherche...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>Rechercher</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat modal (garde le même code que dans l'original) */}
      {selectedChat && selectedFriend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white overflow-hidden flex items-center justify-center">
                    {getPlayerAvatar(selectedFriend.username) ? (
                      <ImageWithFallback
                        src={getPlayerAvatar(selectedFriend.username)}
                        alt={`${selectedFriend.username}'s avatar`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xl font-bold">
                        {selectedFriend.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedFriend.username}</h2>
                    <p className="text-sm text-gray-400">
                      Niveau {selectedFriend.level}
                    </p>
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedFriend.username}</h2>
                  <p className="text-sm text-gray-400">
                    Niveau {selectedFriend.level}
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex justify-start">
                <div className="bg-slate-700/50 rounded-2xl rounded-tl-none px-4 py-3 max-w-[70%]">
                  <p className="text-white">Salut ! Tu veux jouer une partie ?</p>
                  <span className="text-xs text-gray-400 mt-1 block">Il y a 5 min</span>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="bg-green-600 rounded-2xl rounded-tr-none px-4 py-3 max-w-[70%]">
                  <p className="text-white">Oui bien sûr ! Je lance un serveur ?</p>
                  <span className="text-xs text-green-200 mt-1 block">Il y a 3 min</span>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="bg-slate-700/50 rounded-2xl rounded-tl-none px-4 py-3 max-w-[70%]">
                  <p className="text-white">Parfait ! J'arrive 🎰</p>
                  <span className="text-xs text-gray-400 mt-1 block">Il y a 1 min</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-700">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Écrivez votre message..."
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all">
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}