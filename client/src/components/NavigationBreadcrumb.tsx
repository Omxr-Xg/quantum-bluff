import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Home, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { QuantumBluffLogo } from "../assets/logo";

const PATH_KEYS: Record<string, string> = {
  "/": "nav.login",
  "/register": "nav.register",
  "/lobby": "nav.lobby",
  "/bot-configuration": "nav.botConfig",
  "/waiting-room": "nav.waitingRoom",
  "/game": "nav.game",
  "/profile": "nav.profile",
  "/friends": "nav.friends",
  "/hidden-bets-results": "nav.hiddenBets"
};

export function NavigationBreadcrumb() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);

  const getCurrentPath = () => {
    const key = PATH_KEYS[location.pathname];
    return key ? t(key) : t('nav.page');
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
          title={t('nav.backToLobby')}
        >
          <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold hidden sm:inline">{t('nav.home')}</span>
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
              <h2 className="text-2xl font-bold text-white">{t('nav.quitGameTitle')}</h2>
            </div>

            <p className="text-red-200 mb-6 leading-relaxed">
              {t('nav.quitGameMessage')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowQuitConfirm(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmQuit}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-600/50"
              >
                {t('nav.confirmQuit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}