import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Home, ChevronRight } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { QuantumBluffLogo } from "../assets/logo";
import { QuitGameConfirmDialog } from "./QuitGameConfirmDialog";

const PATH_KEYS: Record<string, string> = {
  "/": "nav.login",
  "/auth": "nav.login",
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

      <QuitGameConfirmDialog
        open={showQuitConfirm}
        onCancel={() => setShowQuitConfirm(false)}
        onConfirm={handleConfirmQuit}
      />
    </>
  );
}