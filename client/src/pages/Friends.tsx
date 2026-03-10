import { useState } from "react";
import { useNavigate } from "react-router";
import { UserPlus, Search, ArrowLeft, MessageCircle, Users, X, Check, Loader2, Gamepad2, Home } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

interface Friend {
  id: number;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen?: string;
  level: number;
  wins: number;
}

export function Friends() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "online" | "offline">("all");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendId, setFriendId] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [selectedChat, setSelectedChat] = useState<number | null>(null);

  // Vérifier si on vient d'une partie en cours
  const isInGame = sessionStorage.getItem("currentGame");

  const friendsList: Friend[] = [
    { id: 1, name: "Alice", avatar: "A", isOnline: true, level: 25, wins: 142 },
    { id: 2, name: "Bob", avatar: "B", isOnline: true, level: 18, wins: 89 },
    { id: 3, name: "Charlie", avatar: "C", isOnline: false, lastSeen: "Il y a 2h", level: 32, wins: 201 },
    { id: 4, name: "Diana", avatar: "D", isOnline: true, level: 15, wins: 67 },
    { id: 5, name: "Eve", avatar: "E", isOnline: false, lastSeen: "Il y a 1 jour", level: 28, wins: 156 },
    { id: 6, name: "Frank", avatar: "F", isOnline: false, lastSeen: "Il y a 3 jours", level: 22, wins: 98 },
  ];

  const filteredFriends = friendsList.filter((friend) => {
    const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      (activeTab === "online" && friend.isOnline) ||
      (activeTab === "offline" && !friend.isOnline);
    return matchesSearch && matchesTab;
  });

  const onlineCount = friendsList.filter((f) => f.isOnline).length;
  const offlineCount = friendsList.filter((f) => !f.isOnline).length;

  const handleAddFriend = async () => {
    setSearchError("");
    setSearchSuccess(false);

    if (!friendId.trim()) {
      setSearchError("Veuillez entrer un identifiant");
      return;
    }

    if (friendId.length < 4) {
      setSearchError("L'identifiant doit contenir au moins 4 caractères");
      return;
    }

    setIsSearching(true);

    setTimeout(() => {
      if (friendId === "error123") {
        setSearchError("Utilisateur introuvable");
        setIsSearching(false);
        return;
      }

      setSearchSuccess(true);
      setIsSearching(false);
      setTimeout(() => {
        setShowAddFriend(false);
        setFriendId("");
        setSearchSuccess(false);
      }, 2000);
    }, 1500);
  };

  const openChat = (friendId: number) => {
    setSelectedChat(friendId);
  };

  const closeChat = () => {
    setSelectedChat(null);
  };

  const selectedFriend = friendsList.find(f => f.id === selectedChat);

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
              {onlineCount} en ligne • {offlineCount} hors ligne
            </p>
          </div>
        </div>

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

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "all"
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-gray-400 hover:bg-slate-600"
              }`}
            >
              Tous ({friendsList.length})
            </button>
            <button
              onClick={() => setActiveTab("online")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "online"
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-gray-400 hover:bg-slate-600"
              }`}
            >
              En ligne ({onlineCount})
            </button>
            <button
              onClick={() => setActiveTab("offline")}
              className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "offline"
                  ? "bg-green-600 text-white"
                  : "bg-slate-700 text-gray-400 hover:bg-slate-600"
              }`}
            >
              Hors ligne ({offlineCount})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFriends.map((friend) => (
            <div
              key={friend.id}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-xl border border-slate-700 p-6 hover:border-green-500/50 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white overflow-hidden flex items-center justify-center shadow-lg">
                    {getPlayerAvatar(friend.name) ? (
                      <ImageWithFallback
                        src={getPlayerAvatar(friend.name)}
                        alt={`${friend.name}'s avatar`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {friend.avatar}
                      </span>
                    )}
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-slate-800 ${
                      friend.isOnline ? "bg-green-500" : "bg-gray-500"
                    }`}
                  ></div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xl font-bold text-white">
                      {friend.name}
                    </h3>
                    <span className="text-yellow-400 text-sm font-semibold">
                      Niveau {friend.level}
                    </span>
                  </div>

                  {friend.isOnline ? (
                    <div className="flex items-center gap-1 text-green-400 text-sm mb-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>En ligne</span>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm mb-3">
                      {friend.lastSeen}
                    </div>
                  )}

                  <div className="text-gray-400 text-sm mb-4">
                    🏆 {friend.wins} victoires
                  </div>

                  <div className="flex gap-2">
                    <button
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                        friend.isOnline
                          ? "bg-green-600 hover:bg-green-500 text-white"
                          : "bg-slate-700 text-gray-400 cursor-not-allowed"
                      }`}
                      disabled={!friend.isOnline}
                    >
                      <Users className="w-4 h-4" />
                      Inviter
                    </button>
                    <button 
                      onClick={() => openChat(friend.id)}
                      className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredFriends.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg">Aucun ami trouvé</p>
          </div>
        )}
      </div>

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
                  setFriendId("");
                  setSearchError("");
                  setSearchSuccess(false);
                }}
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-400 mb-4">
                Entrez l'identifiant unique de votre ami pour l'ajouter à votre liste.
              </p>

              <div className="mb-4">
                <label htmlFor="friendId" className="block text-sm font-semibold text-gray-300 mb-2">
                  Identifiant du joueur
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="friendId"
                    type="text"
                    value={friendId}
                    onChange={(e) => {
                      setFriendId(e.target.value);
                      setSearchError("");
                    }}
                    placeholder="Ex: player#1234"
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                {searchError && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {searchError}
                  </p>
                )}
                {searchSuccess && (
                  <p className="text-green-500 text-sm mt-2 flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    Ami ajouté avec succès !
                  </p>
                )}
              </div>

              <div className="bg-blue-600/10 border border-blue-600/30 rounded-xl p-4 mb-6">
                <p className="text-blue-300 text-sm">
                  Vous pouvez trouver votre propre identifiant dans votre profil.
                </p>
              </div>

              <button
                onClick={handleAddFriend}
                disabled={isSearching}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 active:scale-95 disabled:hover:scale-100 transition-all flex items-center justify-center gap-2"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Recherche en cours...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    <span>Ajouter</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedChat && selectedFriend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white overflow-hidden flex items-center justify-center">
                    {getPlayerAvatar(selectedFriend.name) ? (
                      <ImageWithFallback
                        src={getPlayerAvatar(selectedFriend.name)}
                        alt={`${selectedFriend.name}'s avatar`}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-xl font-bold">
                        {selectedFriend.avatar}
                      </span>
                    )}
                  </div>
                  {selectedFriend.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800"></div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedFriend.name}</h2>
                  <p className="text-sm text-gray-400">
                    {selectedFriend.isOnline ? "En ligne" : selectedFriend.lastSeen}
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