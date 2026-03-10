import { Home, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useState } from "react";
import { QuantumBluffLogo } from "../assets/logo";

export function NavigationBreadcrumb() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const pathMap: Record<string, string> = {
    "/": "Connexion",
    "/register": "Inscription",
    "/lobby": "Lobby",
    "/bot-configuration": "Configuration Bot",
    "/waiting-room": "Salle d'attente",
    "/game": "Partie en cours",
    "/profile": "Profil",
    "/friends": "Amis",
    "/hidden-bets-results": "Resultats"
  };

  const getCurrentPath = () => {
    return pathMap[location.pathname] || "Page";
  };

  const handleHomeClick = () => {
    if (location.pathname === "/game") {
      setShowQuitConfirm(true);
    } else {
      navigate("/lobby");
    }
  };

  const handleConfirmQuit = () => {
    setShowQuitConfirm(false);
    navigate("/lobby");
  };

  if (location.pathname === "/") {
    return null;
  }

  return (
    <>
      <div className="fixed top-4 left-8 z-50 flex items-center gap-3">
        {/* Logo Quantum Bluff */}
        <QuantumBluffLogo className="w-12 h-12 drop-shadow-2xl" />

        {/* Bouton Accueil */}
        <button
          onClick={handleHomeClick}
          className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm text-white px-3 py-2 rounded-lg border border-slate-700 transition-all shadow-lg group"
          title="Retour au Lobby"
        >
          <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold hidden sm:inline">Accueil</span>
        </button>

        {/* Page actuelle */}
        {location.pathname !== "/lobby" && (
          <>
            <ChevronRight className="w-4 h-4 text-gray-500" />
            <div className="bg-slate-800/90 backdrop-blur-sm text-gray-300 px-3 py-2 rounded-lg border border-slate-700 text-sm font-semibold shadow-lg">
              {getCurrentPath()}
            </div>
          </>
        )}
      </div>

      {/* Modal Confirmation Quitter */}
      {showQuitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-red-900 to-red-950 rounded-2xl border-2 border-red-600 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <span className="text-white text-2xl font-bold">!</span>
              </div>
              <h2 className="text-2xl font-bold text-white">Quitter la partie ?</h2>
            </div>

            <p className="text-red-200 mb-6 leading-relaxed">
              Vous êtes sur le point de quitter la partie en cours. Vos jetons seront perdus et vous ne pourrez pas revenir à cette table.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmQuit}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-600/50"
              >
                Continuer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}