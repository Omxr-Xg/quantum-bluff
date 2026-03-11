import { useNavigate } from "react-router";
import { Bot, Server, User, UserPlus, LogOut } from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { getUserBalance } from "../utils/userProfile";

export function Lobby() {
  const navigate = useNavigate();
  const userBalance = getUserBalance();

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
              <p className="text-gray-400">Lobby Principal</p>
            </div>
          </div>

          <div className="flex items-center gap-4">

            <div className="bg-yellow-500/20 border border-yellow-500 rounded-xl px-6 py-3 text-yellow-300 font-bold">
              🪙 {userBalance.toLocaleString()}
            </div>

            <button
              onClick={() => navigate("/friends")}
              className="bg-blue-600 p-3 rounded-xl text-white"
            >
              <UserPlus className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigate("/profile")}
              className="bg-green-600 p-3 rounded-xl text-white"
            >
              <User className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigate("/")}
              className="bg-red-600 p-3 rounded-xl text-white"
            >
              <LogOut className="w-6 h-6" />
            </button>

          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* BOT */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-purple-500">
            <h2 className="text-2xl text-white font-bold flex items-center gap-3 mb-4">
              <Bot className="w-8 h-8 text-purple-400"/>
              Jouer contre un Bot
            </h2>

            <button
              onClick={handlePlayBot}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 rounded-xl"
            >
              Configurer & Jouer
            </button>
          </div>

          {/* SERVER */}
          <div className="bg-slate-800 rounded-2xl p-6 border border-green-500">
            <h2 className="text-2xl text-white font-bold flex items-center gap-3 mb-4">
              <Server className="w-8 h-8 text-green-400"/>
              Créer un Serveur
            </h2>

            <button
              onClick={() => navigate("/waiting-room")}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl"
            >
              Nouveau serveur
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}