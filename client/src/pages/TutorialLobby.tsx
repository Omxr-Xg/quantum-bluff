import { useState } from "react";
import { useNavigate } from "react-router";
import { Bot, Plus, Settings, User, LogOut, Globe, Server, UserPlus, ArrowRight } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";

export function TutorialLobby() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const userBalance = 10000;

  const tutorialSteps = [
    {
      title: "Bienvenue dans le Lobby !",
      message: "Ici, vous pouvez choisir comment jouer au poker. Laissez-moi vous guider !",
      highlight: null,
      position: "center",
    },
    {
      title: "Jouer contre un Bot",
      message: "Si vous voulez vous entraîner seul, cliquez ici pour jouer contre des bots avec différents niveaux de difficulté !",
      highlight: "bot-button",
      position: "top-left",
    },
    {
      title: "Liste des Serveurs",
      message: "Ici vous trouvez tous les serveurs disponibles pour jouer avec d'autres joueurs en ligne !",
      highlight: "servers-list",
      position: "top-center",
    },
    {
      title: "Créer un Serveur",
      message: "Vous voulez jouer avec vos amis ? Créez votre propre serveur personnalisé en cliquant ici !",
      highlight: "create-server",
      position: "top-right",
    },
    {
      title: "Navigation",
      message: "Ces boutons vous permettent d'accéder à vos amis, votre profil, les paramètres et de vous déconnecter.",
      highlight: "navigation",
      position: "top-right",
    },
    {
      title: "C'est parti !",
      message: "Vous êtes prêt ! Choisissez votre mode de jeu et amusez-vous bien !",
      highlight: null,
      position: "center",
    },
  ];

  const currentStep = tutorialSteps[step];

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setStep(step + 1);
    } else {
      navigate("/lobby");
    }
  };

  const handleSkip = () => {
    navigate("/lobby");
  };

  const getHighlightStyle = (elementId: string | null) => {
    if (!elementId || currentStep.highlight !== elementId) return {};
    
    return {
      animation: "pulse-highlight 2s ease-in-out infinite",
      boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 30px 10px rgba(59, 130, 246, 0.4)",
      position: "relative" as const,
      zIndex: 60,
      borderRadius: "1rem",
    };
  };

  const getDialogPosition = () => {
    switch (currentStep.position) {
      case "top-left":
        return "top-32 left-8";
      case "top-center":
        return "top-32 left-1/2 -translate-x-1/2";
      case "top-right":
        return "top-32 right-8";
      case "center":
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      default:
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-8 overflow-y-auto relative">
      {/* Fenêtre de dialogue */}
      <div className={`fixed ${getDialogPosition()} z-[70] max-w-md animate-bounce-in`}>
        <div className="bg-gradient-to-br from-blue-900 to-blue-950 rounded-2xl border-4 border-blue-400 shadow-2xl p-6 relative">
          {/* Badge étape */}
          <div className="absolute -top-4 -right-4 bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold text-sm px-4 py-2 rounded-full shadow-lg border-2 border-yellow-300">
            {step + 1} / {tutorialSteps.length}
          </div>

          {/* Titre */}
          <h2 className="text-2xl font-bold text-white mb-3 flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            {currentStep.title}
          </h2>

          {/* Message */}
          <p className="text-blue-100 text-lg leading-relaxed mb-6">
            {currentStep.message}
          </p>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              Passer
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-600/50 flex items-center justify-center gap-2"
            >
              {step < tutorialSteps.length - 1 ? "Suivant" : "Terminé"}
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Flèche pointant vers l'élément */}
        {currentStep.highlight && currentStep.position !== "center" && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2">
            <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[20px] border-t-blue-400 animate-bounce"></div>
          </div>
        )}
      </div>

      {/* Contenu du lobby (version simplifiée pour le tutoriel) */}
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
                <p className="text-gray-400 text-sm sm:text-base">Tutoriel - Lobby</p>
              </div>
            </div>

            {/* Navigation */}
            <div
              className="flex items-center gap-2 sm:gap-4 pt-2"
              style={getHighlightStyle("navigation")}
            >
              <div className="hidden sm:block bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500 rounded-xl px-6 py-3">
                <div className="text-yellow-400 text-sm font-semibold">Solde</div>
                <div className="text-yellow-300 text-2xl font-bold">🪙 {userBalance.toLocaleString()}</div>
              </div>

              <button className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105" title="Amis">
                <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button className="bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105" title="Profil">
                <User className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105" title="Accessibilité">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

              <button className="bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white p-3 sm:p-4 rounded-xl shadow-lg transition-all transform hover:scale-105" title="Déconnexion">
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

        {/* Section Modes de jeu */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Jouer contre Bot */}
          <div
            className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-purple-600 shadow-2xl"
            style={getHighlightStyle("bot-button")}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center shadow-xl">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Jouer contre Bot</h2>
                <p className="text-purple-200">Entraînez-vous seul</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">Difficulté</span>
                  <span className="text-purple-400 font-bold">Moyen</span>
                </div>
              </div>

              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">Nombre de bots</span>
                  <span className="text-purple-400 font-bold">3</span>
                </div>
              </div>

              <button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-purple-600/50">
                Commencer
              </button>
            </div>
          </div>

          {/* Créer un serveur */}
          <div
            className="bg-gradient-to-br from-green-900/50 to-green-800/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-green-600 shadow-2xl"
            style={getHighlightStyle("create-server")}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-700 rounded-2xl flex items-center justify-center shadow-xl">
                <Plus className="w-10 h-10 text-white" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Créer un serveur</h2>
                <p className="text-green-200">Jouez avec vos amis</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <label className="text-white font-semibold block mb-2">Nom du serveur</label>
                <input
                  type="text"
                  placeholder="Ma partie de poker"
                  className="w-full bg-slate-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                />
              </div>

              <button className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-green-600/50">
                Créer
              </button>
            </div>
          </div>
        </div>

        {/* Section Serveurs disponibles */}
        <div
          className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border-2 border-slate-700 shadow-2xl"
          style={getHighlightStyle("servers-list")}
        >
          <div className="p-6 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
                <Server className="w-8 h-8 text-blue-400" />
                Serveurs disponibles
              </h2>
            </div>
          </div>

          <div className="p-6">
            {/* Liste des serveurs */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded-xl p-5 border border-slate-600 hover:border-blue-500 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Globe className="w-8 h-8 text-blue-400" />
                      <div>
                        <h3 className="text-white font-bold text-lg">Table Publique #{i}</h3>
                        <p className="text-gray-400 text-sm">Mise min: $50 • 4/6 joueurs</p>
                      </div>
                    </div>
                    <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold px-6 py-3 rounded-lg transition-all transform hover:scale-105">
                      Rejoindre
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Styles d'animation */}
      <style>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
          }
          50% {
            transform: translateY(10px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.6), 0 0 30px 10px rgba(59, 130, 246, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(59, 130, 246, 0.8), 0 0 40px 15px rgba(59, 130, 246, 0.6);
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}