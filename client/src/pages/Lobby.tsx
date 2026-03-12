import { useNavigate } from "react-router";
import { Bot, Server, User, UserPlus, LogOut } from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { getUserBalance } from "../utils/userProfile";
import { FriendsList } from '../components/FriendsList';
import { useUser } from '../hooks/useUser';

export function Lobby() {
  const navigate = useNavigate();
  const userBalance = getUserBalance();
  const { username } = useUser();

  const handlePlayBot = () => {
    navigate("/bot-configuration");
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
                Quantum Bluff
              </h1>
              <p className="text-gray-400">Bienvenue, {username || 'Joueur'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">

            <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl px-6 py-3 text-yellow-300 font-bold">
              🪙 {userBalance.toLocaleString()}
            </div>

            <button
              onClick={() => navigate("/profile")}
              className="bg-green-600 p-3 rounded-xl text-white hover:bg-green-500 transition"
              title="Profil"
            >
              <User className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigate("/")}
              className="bg-red-600 p-3 rounded-xl text-white hover:bg-red-500 transition"
              title="Déconnexion"
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
                Jouer contre un Bot
              </h2>

              <button
                onClick={handlePlayBot}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl transition"
              >
                Configurer & Jouer
              </button>
            </div>

            {/* Section Serveur Multi-joueurs */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-green-500">
              <h2 className="text-2xl text-white font-bold flex items-center gap-3 mb-4">
                <Server className="w-8 h-8 text-green-400"/>
                Serveurs Multi-joueurs
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() => navigate("/waiting-room")}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition"
                >
                  Créer un nouveau serveur
                </button>

                {/* Liste des serveurs existants (optionnel) */}
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-gray-300 text-sm mb-2">Serveurs disponibles :</p>
                  <p className="text-gray-500 text-center py-2">Aucun serveur disponible</p>
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