import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, X, User, Users, LogOut, Plus, Menu, Settings, Trophy } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../contexts/ToastContext";
import { useMusic } from "../contexts/MusicContext";
import { getUserBalance, addDevMoney, fetchBalanceFromServer, clearAuthStorage, BALANCE_CHANGED_EVENT } from "../utils/userProfile";
import { Toast } from "./Toast";
import { MusicPlayer } from "./MusicPlayer";
import { InvitationBanner } from "./InvitationBanner";
import { NotificationCenter } from "./NotificationCenter";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ChipIcon } from "./ChipIcon";
import { TopBarProvider } from "../contexts/TopBarContext";
import { useAccessibilityMenuOpen } from "../contexts/AccessibilityMenuOpenContext";
import { AccessibilityMenu } from "./AccessibilityMenu";

const ADD_MONEY_PRESETS = [100, 1000, 2000, 3000, 5000];

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { socket, isConnected, connect } = useSocket();
  const { toasts, removeToast } = useToast();
  const { playMusic } = useMusic();
  const [notification, setNotification] = useState<{
    id: number;
    message: string;
  } | null>(null);
  const [balance, setBalance] = useState(getUserBalance());
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | null>(null);
  const [devValidation, setDevValidation] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAccessibilityMenu, setShowAccessibilityMenu] = useState(false);
  const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MENU_CLOSE_DELAY = 500;
  const { registerOpener, openAccessibilityMenu } = useAccessibilityMenuOpen() ?? { registerOpener: () => {}, openAccessibilityMenu: () => {} };

  useEffect(() => {
    registerOpener(() => setShowAccessibilityMenu(true));
    return () => registerOpener(null);
  }, [registerOpener]);

  const handleMenuMouseEnter = () => {
    if (closeMenuTimerRef.current) {
      clearTimeout(closeMenuTimerRef.current);
      closeMenuTimerRef.current = null;
    }
    setMenuOpen(true);
  };

  const handleMenuMouseLeave = () => {
    closeMenuTimerRef.current = setTimeout(() => setMenuOpen(false), MENU_CLOSE_DELAY);
  };

  useEffect(() => {
    // Toujours refléter le local tout de suite (gains bot, navigation lobby ← jeu).
    setBalance(getUserBalance());
    if (localStorage.getItem("token")) {
      const blackjackMultiInLobby =
        location.pathname === "/lobby" && location.search.includes("tab=blackjack");
      const authoritative =
        location.pathname === "/minigames" ||
        location.pathname === "/blackjack" ||
        location.pathname.startsWith("/blackjack/lobby") ||
        location.pathname.startsWith("/blackjack/table") ||
        blackjackMultiInLobby;
      fetchBalanceFromServer({ authoritative }).then(setBalance);
    }
  }, [location.pathname, location.search]);

  /** Mise à jour immédiate du solde affiché (ex. mode bot : `addToUserBalance` ne touche que le localStorage). */
  useEffect(() => {
    const sync = () => setBalance(getUserBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, sync);
  }, []);
  
  useEffect(() => {
    const onFocus = () => {
      if (localStorage.getItem("token")) {
        const authoritative =
          location.pathname === "/minigames" ||
          location.pathname === "/blackjack" ||
          location.pathname.startsWith("/blackjack/lobby") ||
          location.pathname.startsWith("/blackjack/table");
        fetchBalanceFromServer({ authoritative }).then(setBalance);
      } else {
        setBalance(getUserBalance());
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequestReceived = (payload: unknown) => {
      const username = (payload as { sender?: { username?: string } })?.sender?.username || "un joueur";
      setNotification({
        id: Date.now(),
        message: t('toast.friendRequestFrom', { username })
      });
    };

    const handleFriendRequestAccepted = (payload: unknown) => {
      const username = (payload as { username?: string })?.username || "Un ami";
      setNotification({
        id: Date.now(),
        message: t('toast.friendRequestAccepted', { username })
      });
    };

    socket.on("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
    socket.on("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);

    return () => {
      socket.off("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
      socket.off("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
    };
  }, [socket, t]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      playMusic();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [playMusic]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  const openAddMoney = () => {
    setShowAddMoney(true);
    setAddMoneyAmount(null);
    setDevValidation("");
    setAddSuccess(false);
  };
  const closeAddMoney = () => {
    setShowAddMoney(false);
    if (localStorage.getItem("token")) {
      fetchBalanceFromServer().then(setBalance);
    } else {
      setBalance(getUserBalance());
    }
  };
  const submitAddMoney = async () => {
    if (addMoneyAmount == null) return;
    if (devValidation.trim().toLowerCase() !== "dev") return;
    const newBalance = await addDevMoney(addMoneyAmount);
    setBalance(newBalance);
    setAddSuccess(true);
    setTimeout(closeAddMoney, 800);
  };

  const isGamePage = location.pathname === "/game" || location.pathname.startsWith("/game?");
  const isWaitingRoomPage = location.pathname === "/waiting-room";
  const isAuthPage = location.pathname === "/" || location.pathname === "/auth";
  const showTopBar = !isAuthPage && localStorage.getItem("token");
  const path = location.pathname;
  const isLobby = path.includes("lobby") && !path.includes("waiting-room");
  const isCasinoFullBleed =
    path === "/minigames" ||
    path === "/blackjack" ||
    path.startsWith("/blackjack/lobby") ||
    path.startsWith("/blackjack/table");
  const isGameConfigOrRoom =
    isGamePage ||
    path.includes("bot-configuration") ||
    path.includes("waiting-room") ||
    path.includes("tutorial-lobby") ||
    path === "/minigames" ||
    path === "/blackjack" ||
    path.startsWith("/blackjack/lobby") ||
    path.startsWith("/blackjack/table");
  /** Sur la roulette le panneau du menu recouvre tout le tapis — pas de hamburger (navigation via l’en-tête de la page). */
  const showHamburgerMenu =
    showTopBar && isGameConfigOrRoom && !isLobby && path !== "/minigames";
  const showLobbyIntegratedBar = showTopBar && isLobby;
  /**
   * Padding réservé au menu hamburger fixe (bande en tête) — pas sur /game : la table a déjà son en-tête
   * et seul un bouton paramètres est en coin ; éviter la « barre » vide / décalage en haut.
   */
  const topBarPaddingForHamburger =
    showTopBar && !showLobbyIntegratedBar && showHamburgerMenu && !isGamePage && !isWaitingRoomPage;

  const menuContent = (
    <>
      <LanguageSwitcher />
      <div className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-500/50 md:h-12">
        <button
          type="button"
          onClick={() => navigate("/minigames")}
          className="flex items-center gap-1.5 bg-gradient-to-br from-amber-600/90 to-yellow-600/90 px-2 text-left transition hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] sm:gap-2 sm:px-4"
          title={t("lobby.balanceOpenSlot")}
        >
          <ChipIcon size="sm" className="brightness-110 shrink-0" />
          <span className="whitespace-nowrap text-sm font-bold text-amber-50">{balance.toLocaleString()}</span>
        </button>
        <button
          type="button"
          onClick={openAddMoney}
          className="inline-flex items-center justify-center border-l border-amber-900/25 px-2.5 bg-amber-500/80 font-bold text-slate-900 transition-colors hover:bg-amber-400 hover:shadow-inner sm:px-3"
          title={t("lobby.addMoney")}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
      <NotificationCenter />
      <button type="button" onClick={() => navigate("/profile")} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-green-600/80 px-2 text-sm text-white transition hover:bg-green-500 sm:gap-2 sm:px-3 md:h-12" title={t("lobby.profile")}>
        <User className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{t("lobby.profile")}</span>
      </button>
      <button type="button" onClick={() => navigate("/friends")} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600/80 px-2 text-sm text-white transition hover:bg-blue-500 sm:gap-2 sm:px-3 md:h-12" title={t("lobby.manageFriends")}>
        <Users className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{t("lobby.manageFriends")}</span>
      </button>
      <button type="button" onClick={() => navigate("/leaderboard")} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-amber-600/80 px-2 text-sm text-white transition hover:bg-amber-500 sm:gap-2 sm:px-3 md:h-12" title={t("leaderboard.title")}>
        <Trophy className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{t("leaderboard.shortTitle")}</span>
      </button>
      <button type="button" onClick={() => openAccessibilityMenu()} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-purple-600/80 px-2 text-sm text-white transition hover:bg-purple-500 sm:gap-2 sm:px-3 md:h-12" title={t("accessibility.title", "Accessibilité")}>
        <Settings className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{t("accessibility.title", "Accessibilité")}</span>
      </button>
      <button type="button" onClick={() => { clearAuthStorage(); navigate("/"); }} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-red-600/80 px-2 text-sm text-white transition hover:bg-red-500 sm:gap-2 sm:px-3 md:h-12" title={t("lobby.logout")}>
        <LogOut className="h-4 w-4 shrink-0" />
        <span className="hidden lg:inline">{t("lobby.logout")}</span>
      </button>
    </>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <TopBarProvider menuContent={showLobbyIntegratedBar ? menuContent : null}>
      {showHamburgerMenu && (
        <>
          {/* Sur la page Game : bouton Paramètres (ouvre Accessibilité). Sinon : menu hamburger classique */}
          <div className="fixed top-4 right-8 z-[250]">
            {isGamePage ? (
              <button
                type="button"
                onClick={() => openAccessibilityMenu?.()}
                className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 text-white flex items-center justify-center transition shadow-lg"
                title={t("accessibility.title", "Paramètres")}
              >
                <Settings className="w-6 h-6" />
              </button>
            ) : (
              <div
                onMouseEnter={() => {
                  if (closeMenuTimerRef.current) clearTimeout(closeMenuTimerRef.current);
                  closeMenuTimerRef.current = null;
                  setMenuOpen(true);
                }}
                onMouseLeave={() => {
                  closeMenuTimerRef.current = setTimeout(() => setMenuOpen(false), MENU_CLOSE_DELAY);
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (closeMenuTimerRef.current) clearTimeout(closeMenuTimerRef.current);
                    closeMenuTimerRef.current = null;
                    setMenuOpen((o) => !o);
                  }}
                  className="w-12 h-12 rounded-xl bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 text-white flex items-center justify-center transition shadow-lg"
                  title="Menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            )}
          </div>
          {/* Menu déroulant à gauche du bouton (uniquement hors Game) */}
          {!isGamePage && menuOpen && (
            <div
              className="fixed top-3 right-24 z-[249] flex items-center flex-wrap gap-6 px-4 py-2 bg-slate-800/98 border border-slate-600 rounded-xl shadow-2xl"
              onMouseEnter={() => {
                if (closeMenuTimerRef.current) clearTimeout(closeMenuTimerRef.current);
                closeMenuTimerRef.current = null;
              }}
              onMouseLeave={() => {
                closeMenuTimerRef.current = setTimeout(() => setMenuOpen(false), MENU_CLOSE_DELAY);
              }}
            >
              <div className="flex max-w-[min(100vw-6rem,28rem)] flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <LanguageSwitcher />
                <div className="flex h-10 shrink-0 items-stretch overflow-hidden rounded-xl shadow-lg ring-1 ring-slate-500/50 md:h-12">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/minigames");
                    }}
                    className="flex items-center gap-1.5 bg-gradient-to-br from-amber-600/90 to-yellow-600/90 px-2 text-left transition hover:from-amber-500 hover:to-yellow-500 active:scale-[0.98] sm:gap-2 sm:px-4"
                    title={t("lobby.balanceOpenSlot")}
                  >
                    <ChipIcon size="sm" className="brightness-110 shrink-0" />
                    <span className="whitespace-nowrap text-sm font-bold text-amber-50">{balance.toLocaleString()}</span>
                  </button>
                  <button
                    type="button"
                    onClick={openAddMoney}
                    className="inline-flex items-center justify-center border-l border-amber-900/25 px-2.5 bg-amber-500/80 font-bold text-slate-900 transition-colors hover:bg-amber-400 hover:shadow-inner sm:px-3"
                    title={t("lobby.addMoney")}
                  >
                    <Plus className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                </div>
                <NotificationCenter />
                <button type="button" onClick={() => navigate("/profile")} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-green-600/80 px-2 text-sm text-white transition hover:bg-green-500 sm:gap-2 sm:px-3 md:h-12" title={t("lobby.profile")}>
                  <User className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{t("lobby.profile")}</span>
                </button>
                <button type="button" onClick={() => navigate("/friends")} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-blue-600/80 px-2 text-sm text-white transition hover:bg-blue-500 sm:gap-2 sm:px-3 md:h-12" title={t("lobby.manageFriends")}>
                  <Users className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{t("lobby.manageFriends")}</span>
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); navigate("/leaderboard"); }} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-amber-600/80 px-2 text-sm text-white transition hover:bg-amber-500 sm:gap-2 sm:px-3 md:h-12" title={t("leaderboard.title")}>
                  <Trophy className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{t("leaderboard.shortTitle")}</span>
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); openAccessibilityMenu(); }} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-purple-600/80 px-2 text-sm text-white transition hover:bg-purple-500 sm:gap-2 sm:px-3 md:h-12" title={t("accessibility.title", "Accessibilité")}>
                  <Settings className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{t("accessibility.title", "Accessibilité")}</span>
                </button>
                <button type="button" onClick={() => { clearAuthStorage(); navigate("/"); }} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-red-600/80 px-2 text-sm text-white transition hover:bg-red-500 sm:gap-2 sm:px-3 md:h-12" title={t("lobby.logout")}>
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{t("lobby.logout")}</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Menu Accessibilité (rendu globalement pour Lobby et Game) */}
      <AccessibilityMenu
        isOpen={showAccessibilityMenu}
        onClose={() => setShowAccessibilityMenu(false)}
      />

      {/* Modal Ajouter des jetons */}
      {showTopBar && showAddMoney && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeAddMoney}>
          <div className="bg-slate-800 border border-yellow-500/50 rounded-2xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{t("lobby.addMoneyTitle")}</h3>
              <button type="button" onClick={closeAddMoney} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            {addSuccess ? (
              <p className="text-green-400 font-medium text-center py-4">{t("lobby.captchaSuccess")}</p>
            ) : (
              <>
                <p className="text-slate-300 text-sm mb-3">{t("lobby.chooseAmount")}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ADD_MONEY_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setAddMoneyAmount(amount)}
                      className={`px-4 py-2 rounded-lg font-bold transition ${
                        addMoneyAmount === amount
                          ? "bg-yellow-500 text-slate-900"
                          : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      }`}
                    >
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>
                {addMoneyAmount != null && (
                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm block">{t("lobby.devValidation") || 'Tapez "dev" pour valider'}</label>
                    <input
                      type="text"
                      value={devValidation}
                      onChange={(e) => setDevValidation(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitAddMoney()}
                      placeholder="dev"
                      className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={submitAddMoney}
                      disabled={devValidation.trim().toLowerCase() !== "dev"}
                      className="w-full py-2 rounded-lg bg-yellow-500 hover:bg-yellow-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold transition"
                    >
                      {t("lobby.validate")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {!isGamePage && <MusicPlayer />}
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </AnimatePresence>
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm w-[calc(100%-2rem)] sm:w-full">
          <div className="bg-slate-900/95 border border-blue-500 shadow-2xl rounded-2xl px-4 py-4 backdrop-blur-md animate-in slide-in-from-right-5 duration-300">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-300" />
              </div>

              <div className="flex-1">
                <p className="text-white font-semibold text-sm mb-1">
                  {t('notifications.toastTitle')}
                </p>
                <p className="text-slate-200 text-sm">
                  {notification.message}
                </p>
              </div>

              <button
                onClick={() => setNotification(null)}
                className="shrink-0 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <InvitationBanner />

      <div
        className={`w-full ${
          isCasinoFullBleed
            ? "flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden pt-0"
            : `min-h-screen ${topBarPaddingForHamburger ? "pt-14 md:pt-16" : ""}`
        }`}
      >
        {children}
      </div>
      </TopBarProvider>
    </div>
  );
}