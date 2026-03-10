import { useState } from "react";
import { useNavigate } from "react-router";
import { Bot, Users, Plus, Settings, User, LogOut, Lock, Globe, Server, UserPlus, Search, Eye, ArrowUpDown, ChevronUp, ChevronDown, Star, MessageSquare, HelpCircle } from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { AccessibilityMenu } from "../components/AccessibilityMenu";
import { getUserBalance } from "../utils/userProfile";
import { HelpButton } from "../components/HelpButton";

interface Friend {
  id: number;
  name: string;
  status: "online" | "offline";
  avatar: string;
}

interface ActiveServer {
  id: number;
  hostName: string;
  players: number;
  maxPlayers: number;
  minBet: number;
  isPublic: boolean;
}

export function Lobby() {
  const navigate = useNavigate();
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showCreateServer, setShowCreateServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [showServerTypeChoice, setShowServerTypeChoice] = useState(false);
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
  const [minBet, setMinBet] = useState(50);
  const [minBalance, setMinBalance] = useState(1000);
  const [hiddenBetEnabled, setHiddenBetEnabled] = useState(true);
  
  // États pour la recherche et le tri des serveurs
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"players" | "minBet" | "none">("none");

  // États pour le feedback
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);
  
  // État pour les demandes de rejoindre un serveur complet
  const [joinRequests, setJoinRequests] = useState<number[]>([]);
  
  // Serveurs actifs des amis (exemple élargi pour démontrer la recherche/tri)
  const activeServers: ActiveServer[] = [
    { id: 1, hostName: "Alice", players: 3, maxPlayers: 6, minBet: 100, isPublic: false },
    { id: 2, hostName: "Diana", players: 5, maxPlayers: 6, minBet: 50, isPublic: true },
    { id: 3, hostName: "Eve", players: 2, maxPlayers: 6, minBet: 200, isPublic: false },
    { id: 4, hostName: "Bob", players: 4, maxPlayers: 6, minBet: 75, isPublic: true },
    { id: 5, hostName: "Charlie", players: 1, maxPlayers: 6, minBet: 150, isPublic: false },
    { id: 6, hostName: "Frank", players: 6, maxPlayers: 6, minBet: 25, isPublic: true },
  ];

  // Filtrage et tri des serveurs
  const filteredAndSortedServers = activeServers
    .filter((server) => 
      server.hostName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "players") {
        return b.players - a.players; // Décroissant
      } else if (sortBy === "minBet") {
        return a.minBet - b.minBet; // Croissant
      }
      return 0; // Ordre par défaut
    });

  const handlePlayBot = () => {
    navigate("/bot-configuration");
  };

  const handlePrivateServer = () => {
    // Pour serveur privé, rediriger vers la salle d'attente
    navigate(`/waiting-room?mode=private&minBet=${minBet}&minBalance=${minBalance}&hiddenBet=${hiddenBetEnabled}`);
  };

  const handlePublicServer = () => {
    // Pour serveur public, lancer directement
    navigate(`/game?mode=public&minBet=${minBet}&minBalance=${minBalance}&hiddenBet=${hiddenBetEnabled}`);
  };

  const handleJoinServer = (serverId: number) => {
    navigate(`/game?mode=join&serverId=${serverId}`);
  };

  const handleRequestJoin = (serverId: number) => {
    // Ajouter le serveur à la liste des demandes
    setJoinRequests([...joinRequests, serverId]);
    // Simuler l'envoi de la demande
    console.log(`Demande envoyée pour rejoindre le serveur ${serverId}`);
  };

  const userBalance = getUserBalance();

  const helpSections = [
    {
      title: "🎮 Jouer contre un Bot",
      content: "Entraînez-vous contre une intelligence artificielle. Choisissez le niveau de difficulté et configurez les paramètres de la partie."
    },
    {
      title: "🌐 Serveurs Actifs",
      content: "Rejoignez les serveurs créés par vos amis ou d'autres joueurs. Vous pouvez filtrer par nom d'hôte et trier par nombre de joueurs ou mise minimale."
    },
    {
      title: "➕ Créer un Serveur",
      content: "Créez votre propre partie. Choisissez entre serveur privé (uniquement vos amis) ou public (ouvert à tous). Configurez la mise minimale et le solde minimum requis."
    },
    {
      title: "🔒 Serveurs Complets",
      content: "Si un serveur est complet (6/6 joueurs), utilisez le bouton 'Demander à rejoindre' pour envoyer une requête à l'hôte."
    },
    {
      title: "👥 Amis",
      content: "Gérez votre liste d'amis et invitez-les à jouer. Cliquez sur l'icône Amis en haut à droite."
    },
    {
      title: "👤 Profil",
      content: "Consultez vos statistiques et votre progression. Cliquez sur l'icône Profil en haut à droite."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 relative overflow-hidden">
      {/* Particules animées en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-500/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      {/* Bouton d'aide */}
      <HelpButton title="Aide - Lobby" sections={helpSections} />

      {/* En-tête avec logo et navigation */}
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="flex flex-col gap-4 mb-8">
          {/* Ligne 1: Logo et titre + Navigation */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <QuantumBluffLogo className="w-16 h-16" />
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Quantum Bluff
                </h1>
                <p className="text-gray-400 text-sm sm:text-base">Lobby Principal</p>
              </div>
            </div>

            {/* Navigation - masquer solde sur mobile */}
            <div className="flex items-center gap-2 sm:gap-4 pt-2">
              {/* Solde - Desktop uniquement - Même hauteur que les boutons */}
              <div className="hidden sm:flex items-center gap-3 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-xl px-8 py-3.5">
                <div className="text-yellow-400 text-xs font-semibold uppercase">Solde</div>
                <div className="text-yellow-300 text-xl font-bold">🪙 {userBalance.toLocaleString()}</div>
              </div>

              {/* Navigation */}
              <button
                onClick={() => navigate("/friends")}
                className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
                title="Amis"
              >
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onClick={() => navigate("/profile")}
                className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
                title="Profil"
              >
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onClick={() => navigate("/game?mode=bot&bots=5&difficulty=moyen")}
                className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
                title="Lancer une partie"
              >
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onClick={() => navigate("/tutorial-lobby")}
                className="bg-gradient-to-br from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
                title="Tutoriel"
              >
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onClick={() => setShowFeedback(true)}
                className="bg-gradient-to-br from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
                title="Feedback"
              >
                <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button
                onClick={() => navigate("/")}
                className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105"
                title="Déconnexion"
              >
                <LogOut className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* Ligne 2: Solde - Mobile uniquement */}
          <div className="sm:hidden bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-yellow-400 text-sm font-semibold">Solde</div>
              <div className="text-yellow-300 text-xl font-bold">🪙 {userBalance.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="space-y-6">
          {/* Grille du haut : Bot à gauche, Créer serveur à droite */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Jouer contre Bot */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-purple-500 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Bot className="w-8 h-8 text-purple-400" />
                Jouer contre un Bot
              </h2>
              <p className="text-gray-400 mb-6">Entraînez-vous contre une IA personnalisable</p>
              <button
                onClick={handlePlayBot}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
              >
                Configurer & Jouer
              </button>
            </div>

            {/* Créer un serveur */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-green-500 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
                <Server className="w-8 h-8 text-green-400" />
                Créer un Serveur
              </h2>
              <p className="text-gray-400 mb-6">Créez votre propre partie</p>
              
              {!showServerTypeChoice ? (
                <button
                  onClick={() => setShowServerTypeChoice(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                >
                  <Plus className="w-6 h-6 inline mr-2" />
                  Nouveau Serveur
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-white font-semibold block">Mise minimale</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="10"
                        max="500"
                        value={minBet}
                        onChange={(e) => setMinBet(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                      <input
                        type="number"
                        min="10"
                        max="500"
                        value={minBet}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 10 && val <= 500) setMinBet(val);
                        }}
                        className="w-20 bg-slate-700 text-white text-center px-2 py-2 rounded-lg border-2 border-slate-600 focus:border-green-500 focus:outline-none font-bold"
                      />
                    </div>
                    <div className="text-green-400 text-lg font-bold text-center">${minBet}</div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-white font-semibold block">Solde minimum requis</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="500"
                        max="10000"
                        step="500"
                        value={minBalance}
                        onChange={(e) => setMinBalance(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
                      />
                      <input
                        type="number"
                        min="500"
                        max="10000"
                        step="500"
                        value={minBalance}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val >= 500 && val <= 10000) setMinBalance(val);
                        }}
                        className="w-24 bg-slate-700 text-white text-center px-2 py-2 rounded-lg border-2 border-slate-600 focus:border-green-500 focus:outline-none font-bold"
                      />
                    </div>
                    <div className="text-green-400 text-lg font-bold text-center">${minBalance.toLocaleString()}</div>
                  </div>

                  <div className="flex items-center justify-between bg-slate-700/50 p-4 rounded-xl">
                    <span className="text-white font-semibold">Paris cachés</span>
                    <button
                      onClick={() => setHiddenBetEnabled(!hiddenBetEnabled)}
                      className={`w-14 h-8 rounded-full transition-all ${
                        hiddenBetEnabled ? "bg-green-500" : "bg-gray-600"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 bg-white rounded-full transition-all transform ${
                          hiddenBetEnabled ? "translate-x-7" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handlePrivateServer}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                    >
                      <Lock className="w-5 h-5 inline mr-2" />
                      Privé
                    </button>
                    <button
                      onClick={handlePublicServer}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transform hover:scale-105 transition-all"
                    >
                      <Globe className="w-5 h-5 inline mr-2" />
                      Public
                    </button>
                  </div>

                  <button
                    onClick={() => setShowServerTypeChoice(false)}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* En bas : Serveurs actifs sur toute la largeur */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 border-2 border-blue-500 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-400" />
              Serveurs Actifs ({filteredAndSortedServers.length})
            </h2>

            {/* Barre de recherche et filtres */}
            <div className="mb-6 space-y-3">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher par nom d'hôte..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-700 text-white pl-12 pr-4 py-3 rounded-xl border-2 border-slate-600 focus:border-blue-500 focus:outline-none transition-all"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSortBy(sortBy === "players" ? "none" : "players")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    sortBy === "players"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Joueurs
                  {sortBy === "players" && <ChevronDown className="w-4 h-4" />}
                </button>
                
                <button
                  onClick={() => setSortBy(sortBy === "minBet" ? "none" : "minBet")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all ${
                    sortBy === "minBet"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}
                >
                  <ArrowUpDown className="w-5 h-5" />
                  Mise Min
                  {sortBy === "minBet" && <ChevronUp className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Liste des serveurs */}
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredAndSortedServers.length === 0 ? (
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">Aucun serveur trouvé</p>
                </div>
              ) : (
                filteredAndSortedServers.map((server) => {
                  const isFull = server.players >= server.maxPlayers;
                  const hasRequested = joinRequests.includes(server.id);

                  return (
                    <div
                      key={server.id}
                      className="bg-slate-700/50 rounded-xl p-4 border-2 border-slate-600 hover:border-blue-500 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-white font-bold text-lg">{server.hostName}</h3>
                            {server.isPublic ? (
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Globe className="w-3 h-3" />
                                Public
                              </span>
                            ) : (
                              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Privé
                              </span>
                            )}
                            {isFull && (
                              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                Complet
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-300">
                            <span className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              {server.players}/{server.maxPlayers}
                            </span>
                            <span className="flex items-center gap-2">
                              🪙 Mise min: ${server.minBet}
                            </span>
                          </div>
                        </div>

                        {/* Boutons d'action - Responsive */}
                        <div className="w-full sm:w-auto">
                          {isFull ? (
                            hasRequested ? (
                              <button
                                disabled
                                className="w-full sm:w-auto bg-gray-600 text-gray-300 font-bold py-2 px-4 sm:px-6 rounded-xl cursor-not-allowed opacity-50 text-sm sm:text-base"
                              >
                                Demande envoyée
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRequestJoin(server.id)}
                                className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white font-bold py-2 px-4 sm:px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all text-sm sm:text-base"
                              >
                                Demander
                              </button>
                            )
                          ) : server.isPublic ? (
                            <button
                              onClick={() => handleJoinServer(server.id)}
                              className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-2 px-4 sm:px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all text-sm sm:text-base"
                            >
                              Rejoindre
                            </button>
                          ) : (
                            hasRequested ? (
                              <button
                                disabled
                                className="w-full sm:w-auto bg-gray-600 text-gray-300 font-bold py-2 px-4 sm:px-6 rounded-xl cursor-not-allowed opacity-50 text-sm sm:text-base"
                              >
                                Demande envoyée
                              </button>
                            ) : (
                              <button
                                onClick={() => handleRequestJoin(server.id)}
                                className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-2 px-4 sm:px-6 rounded-xl shadow-lg transform hover:scale-105 transition-all text-sm sm:text-base"
                              >
                                Demander
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'accessibilité */}
      {showAccessibilityMenu && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-purple-500 shadow-2xl max-w-2xl w-full">
            <AccessibilityMenu onClose={() => setShowAccessibilityMenu(false)} />
          </div>
        </div>
      )}

      {/* Modal de Feedback */}
      {showFeedback && !showFeedbackSuccess && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowFeedback(false)}
        >
          <div 
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-orange-500 shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-orange-400" />
              Votre Feedback
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-white font-semibold block mb-2">Note globale</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      className="text-3xl transition-all transform hover:scale-110"
                    >
                      {star <= rating ? "⭐" : "☆"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-white font-semibold block mb-2">Message (optionnel)</label>
                <textarea
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  placeholder="Partagez votre expérience, suggestions ou bugs rencontrés..."
                  className="w-full bg-slate-700 text-white p-3 rounded-xl border-2 border-slate-600 focus:border-orange-500 focus:outline-none transition-all h-32 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFeedback(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (rating > 0) {
                      console.log("Feedback:", { rating, message: feedbackMessage });
                      setShowFeedback(false);
                      setShowFeedbackSuccess(true);
                      setTimeout(() => {
                        setShowFeedbackSuccess(false);
                        setRating(0);
                        setFeedbackMessage("");
                      }, 3000);
                    }
                  }}
                  disabled={rating === 0}
                  className={`flex-1 font-bold py-3 px-6 rounded-xl transition-all ${
                    rating === 0
                      ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white transform hover:scale-105"
                  }`}
                >
                  Envoyer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message de confirmation feedback */}
      {showFeedbackSuccess && (
        <div className="fixed top-6 right-6 bg-green-500 text-white px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slide-in">
          <Star className="w-6 h-6" />
          <div>
            <div className="font-bold">Merci pour votre feedback !</div>
            <div className="text-sm">Votre avis nous aide à améliorer le jeu</div>
          </div>
        </div>
      )}
    </div>
  );
}