import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bell, X, LogOut, Plus, Menu, Settings, Trophy } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../contexts/ToastContext";
import { useAudio } from "../contexts/MusicContext";
import {
  getUserAvatar,
  getUserBalance,
  getUsername,
  addDevMoney,
  fetchBalanceFromServer,
  clearAuthStorage,
  BALANCE_CHANGED_EVENT,
} from "../utils/userProfile";
import { Toast } from "./Toast";
import { InvitationBanner } from "./InvitationBanner";
import { NotificationCenter } from "./NotificationCenter";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ChipIcon } from "./ChipIcon";
import { TopBarProvider } from "../contexts/TopBarContext";
import { useAccessibilityMenuOpen } from "../contexts/AccessibilityMenuOpenContext";
import { SettingsMenu } from "./SettingsMenu";
import { RateGameModal } from "./RateGameModal";
import { GlobalHoverTooltip } from "./GlobalHoverTooltip";
import { OPEN_RATE_GAME_EVENT } from "../constants/storageKeys";
import type { SettingsTab } from "../contexts/AccessibilityMenuOpenContext";

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
  const { unlockAudio, playSfx, stopBgm } = useAudio();
  const [notification, setNotification] = useState<{
    id: number;
    message: string;
    hint?: string;
    onClick?: () => void;
  } | null>(null);
  const [balance, setBalance] = useState(getUserBalance());
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | null>(null);
  const [devValidation, setDevValidation] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showRateGame, setShowRateGame] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>("aesthetic");
  const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MENU_CLOSE_DELAY = 500;
  const { registerOpener, openSettingsMenu } = useAccessibilityMenuOpen() ?? {
    registerOpener: () => {},
    openSettingsMenu: () => {},
  };

  useEffect(() => {
    registerOpener((tab) => {
      setSettingsInitialTab(tab ?? "aesthetic");
      setShowSettingsMenu(true);
    });
    return () => registerOpener(null);
  }, [registerOpener]);

  useEffect(() => {
    const openRate = () => setShowRateGame(true);
    window.addEventListener(OPEN_RATE_GAME_EVENT, openRate);
    return () => window.removeEventListener(OPEN_RATE_GAME_EVENT, openRate);
  }, []);

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
    const handler = (e: Event) => navigate((e as CustomEvent<string>).detail);
    window.addEventListener("navigate-to", handler);
    return () => window.removeEventListener("navigate-to", handler);
  }, [navigate]);

  useEffect(() => {
    const onInviteSfx = () => playSfx("notification");
    window.addEventListener("play-notification-sfx", onInviteSfx);
    return () => window.removeEventListener("play-notification-sfx", onInviteSfx);
  }, [playSfx]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequestReceived = (payload: unknown) => {
      const username = (payload as { sender?: { username?: string } })?.sender?.username || "un joueur";
      setNotification({
        id: Date.now(),
        message: t('toast.friendRequestFrom', { username }),
        hint: t('notifications.viewRequests'),
        onClick: () => navigate('/friends?tab=requests'),
      });
      playSfx("notification");
    };

    const handleFriendRequestAccepted = (payload: unknown) => {
      const username = (payload as { username?: string })?.username || "Un ami";
      setNotification({
        id: Date.now(),
        message: t('toast.friendRequestAccepted', { username }),
        hint: t('notifications.viewRequests'),
        onClick: () => navigate('/friends'),
      });
      playSfx("notification");
    };

    const handleFriendMessage = (payload: unknown) => {
      const data = payload as { senderId: string; sender?: { username?: string }; content?: string };
      const senderUsername = data.sender?.username ?? "un ami";
      const content = data.content ?? "";
      const preview = content.length > 50 ? content.slice(0, 50) + "…" : content;

      // Suppress if already viewing this conversation
      const params = new URLSearchParams(window.location.search);
      const alreadyViewing =
        window.location.pathname === "/friends" &&
        params.get("tab") === "messages" &&
        params.get("with") === data.senderId;
      if (alreadyViewing) return;

      setNotification({
        id: Date.now(),
        message: `💬 ${senderUsername}: ${preview}`,
        hint: t('notifications.openConversation'),
        onClick: () => navigate(`/friends?tab=messages&with=${data.senderId}`),
      });
      playSfx("notification");
    };

    socket.on("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
    socket.on("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
    socket.on("FRIEND_MESSAGE", handleFriendMessage);

    return () => {
      socket.off("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
      socket.off("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
      socket.off("FRIEND_MESSAGE", handleFriendMessage);
    };
  }, [socket, t, navigate, playSfx]);

  useEffect(() => {
    const handleFirstInteraction = () => {
      unlockAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [unlockAudio]);

  useEffect(() => {
    if (!notification) return;

    const timer = setTimeout(() => {
      setNotification(null);
    }, 5000);

    return () => clearTimeout(timer);
  }, [notification]);

  const openAddMoney = () => {
    playSfx("modalOpen");
    setShowAddMoney(true);
    setAddMoneyAmount(null);
    setDevValidation("");
    setAddSuccess(false);
  };
  const closeAddMoney = () => {
    playSfx("modalClose");
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
    playSfx("success");
    setTimeout(closeAddMoney, 800);
  };

  const isGamePage = location.pathname === "/game" || location.pathname.startsWith("/game?");
  const isWaitingRoomPage = location.pathname === "/waiting-room";
  const isAuthPage = location.pathname === "/" || location.pathname === "/auth";
  const isAdminShell =
    location.pathname === "/auth/admin" || location.pathname.startsWith("/admin/");

  useEffect(() => {
    if (isAdminShell) {
      stopBgm();
    }
  }, [isAdminShell, stopBgm]);
  const showTopBar = !isAuthPage && localStorage.getItem("token");
  const path = location.pathname;
  const isLobby = path.includes("lobby") && !path.includes("waiting-room");
  const isBotConfigPage = path.includes("bot-configuration");
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
   * Pas sur /bot-configuration : le menu est en coin droit, la page gère son propre espacement.
   */
  const topBarPaddingForHamburger =
    showTopBar &&
    !showLobbyIntegratedBar &&
    showHamburgerMenu &&
    !isGamePage &&
    !isWaitingRoomPage &&
    !isBotConfigPage;

  if (isAdminShell) {
    return (
      <div className="min-h-screen w-full bg-slate-900 text-white">
        <GlobalHoverTooltip />
        <div className="fixed start-4 top-4 z-[200] flex items-center gap-2">
          <LanguageSwitcher />
        </div>
        <AnimatePresence>
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
              onClick={toast.onClick}
            />
          ))}
        </AnimatePresence>
        {children}
      </div>
    );
  }

  /** Téléphone : h-9 / icônes 4.5 — md+ : h-11. Scroll horizontal côté Lobby. */
  const topNavBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:border-white/20 hover:bg-slate-800/80 hover:text-white md:h-11 md:w-11";
  const topNavIcon = "h-[1.05rem] w-[1.05rem] shrink-0 [stroke-width:2.15] md:h-[1.15rem] md:w-[1.15rem]";
  const userAvatar = getUserAvatar();
  const username = getUsername();
  const languageButtonClass =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:border-white/20 hover:bg-slate-800/80 md:h-11 md:w-11";
  const accountPill = (
    <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md md:h-11">
      <button
        type="button"
        onClick={openAddMoney}
        className="flex h-full min-w-0 items-center gap-2 px-3 text-left transition hover:bg-white/[0.06] md:gap-2.5 md:px-4"
        title={t("lobby.addMoney")}
      >
        <ChipIcon size="sm" className="h-4 w-4 shrink-0 brightness-110 md:h-[1.1rem] md:w-[1.1rem]" />
        <span className="min-w-0 truncate whitespace-nowrap text-xs font-bold leading-none tabular-nums text-amber-50 md:text-[0.95rem]">
          {balance.toLocaleString()}
        </span>
        <Plus className="h-4 w-4 shrink-0 text-amber-200/90 md:h-[1.1rem] md:w-[1.1rem]" strokeWidth={2.4} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => navigate("/profile")}
        className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-slate-800 transition hover:border-emerald-300/60 md:h-8 md:w-8"
        title={t("lobby.profile")}
        aria-label={t("lobby.profile")}
      >
        <img src={userAvatar} alt="" className="h-full w-full object-cover" draggable={false} />
        <span className="sr-only">{username}</span>
      </button>
    </div>
  );

  const menuContent = (
    <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center gap-1.5 max-sm:justify-between sm:w-auto sm:shrink-0 sm:justify-end md:gap-2">
      <LanguageSwitcher buttonClassName={languageButtonClass} />
      {accountPill}
      <div
        className="flex min-w-0 max-sm:min-w-0 max-sm:flex-1 max-sm:items-center max-sm:justify-end max-sm:gap-1 max-sm:overflow-x-auto max-sm:overflow-y-hidden max-sm:scroll-smooth max-sm:py-0 max-sm:scrollbar-hide max-sm:[-webkit-overflow-scrolling:touch] max-sm:[touch-action:pan-x] sm:min-w-0 sm:shrink-0 sm:gap-1.5 md:gap-2"
      >
        <NotificationCenter />
        <button type="button" onClick={() => navigate("/leaderboard")} className={`${topNavBtn} hidden sm:inline-flex`} title={t("leaderboard.title")}>
          <Trophy className={topNavIcon} aria-hidden />
        </button>
        <button type="button" onClick={() => { playSfx("uiClick"); openSettingsMenu(); }} className={topNavBtn} title={t("settings.title")}>
          <Settings className={topNavIcon} aria-hidden />
        </button>
        <button type="button" onClick={() => { clearAuthStorage(); navigate("/"); }} className={`${topNavBtn} hover:border-red-300/40 hover:bg-red-950/45`} title={t("lobby.logout")}>
          <LogOut className={topNavIcon} aria-hidden />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <GlobalHoverTooltip />
      <TopBarProvider menuContent={showLobbyIntegratedBar ? menuContent : null}>
      {showHamburgerMenu && (
        <div className="fixed end-2 top-2 z-[250] flex items-center gap-1 sm:end-4 sm:top-4 sm:gap-2">
          {/* Partie : emplacement pour le menu ☰ (portail depuis Game.tsx) + notif + réglages — aligné à droite, même logique que le lobby */}
          {isGamePage && (
            <div id="game-top-menu-slot" className="relative shrink-0" />
          )}
          {isGamePage ? (
            <>
              <NotificationCenter variant="gameHud" />
              <button
                type="button"
                onClick={() => {
                  playSfx("uiClick");
                  openSettingsMenu?.();
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-slate-500 bg-slate-700 text-white shadow-lg transition hover:bg-slate-600 sm:h-8 sm:w-8 sm:rounded-lg md:h-9 md:w-9"
                title={t("settings.title")}
              >
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            </>
          ) : (
            <div
              className="relative"
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
                  playSfx("uiClick");
                  if (closeMenuTimerRef.current) clearTimeout(closeMenuTimerRef.current);
                  closeMenuTimerRef.current = null;
                  setMenuOpen((o) => !o);
                }}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 border-slate-500 bg-slate-700 text-white shadow-lg transition hover:bg-slate-600 sm:h-8 sm:w-8 sm:rounded-lg md:h-9 md:w-9"
                title="Menu"
                aria-expanded={menuOpen}
              >
                <Menu className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute end-0 top-full z-[260] mt-2 max-h-[min(70vh,28rem)] w-max max-w-[min(calc(100vw-2rem),28rem)] overflow-y-auto rounded-xl border border-slate-600 bg-slate-800/98 px-4 py-4 shadow-2xl"
                  onMouseEnter={() => {
                    if (closeMenuTimerRef.current) clearTimeout(closeMenuTimerRef.current);
                    closeMenuTimerRef.current = null;
                  }}
                  onMouseLeave={() => {
                    closeMenuTimerRef.current = setTimeout(() => setMenuOpen(false), MENU_CLOSE_DELAY);
                  }}
                >
                  <div className="flex min-w-0 max-w-[min(100vw-2rem,28rem)] flex-row flex-nowrap items-center gap-1 overflow-x-auto scroll-smooth py-0.5 [touch-action:pan-x] scrollbar-hide sm:max-w-none sm:gap-2">
                <LanguageSwitcher buttonClassName={languageButtonClass} />
                {accountPill}
                <NotificationCenter />
                <button type="button" onClick={() => { playSfx("uiSelect"); setMenuOpen(false); navigate("/leaderboard"); }} className={topNavBtn} title={t("leaderboard.title")}>
                  <Trophy className={topNavIcon} aria-hidden />
                </button>
                <button type="button" onClick={() => { playSfx("uiClick"); setMenuOpen(false); openSettingsMenu(); }} className={topNavBtn} title={t("settings.title")}>
                  <Settings className={topNavIcon} aria-hidden />
                </button>
                <button type="button" onClick={() => { clearAuthStorage(); navigate("/"); }} className={`${topNavBtn} hover:border-red-300/40 hover:bg-red-950/45`} title={t("lobby.logout")}>
                  <LogOut className={topNavIcon} aria-hidden />
                </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <SettingsMenu
        isOpen={showSettingsMenu}
        onClose={() => setShowSettingsMenu(false)}
        initialTab={settingsInitialTab}
        onRateGame={() => setShowRateGame(true)}
      />

      <RateGameModal open={showRateGame} onClose={() => setShowRateGame(false)} />

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

      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            onClick={toast.onClick}
          />
        ))}
      </AnimatePresence>
      {notification && (
        <div className="fixed top-5 right-5 z-[9999] max-w-sm w-[calc(100%-2rem)] sm:w-full">
          <div
            className="bg-slate-900/95 border border-blue-500 shadow-2xl rounded-2xl px-4 py-4 backdrop-blur-md animate-in slide-in-from-right-5 duration-300 cursor-pointer hover:border-blue-400 hover:bg-slate-800/95 transition-colors"
            onClick={() => { playSfx("uiSelect"); notification.onClick?.(); setNotification(null); }}
          >
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
                {notification.hint && (
                  <p className="text-blue-400 text-xs mt-1">{notification.hint} →</p>
                )}
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setNotification(null); }}
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
        className={`w-full min-w-0 overflow-x-hidden ${
          isCasinoFullBleed
            ? "flex h-[100dvh] max-h-[100dvh] min-h-0 flex-col overflow-hidden pt-0 [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1 [&>*:last-child]:flex-col"
            : `min-h-screen ${topBarPaddingForHamburger ? "pt-14 md:pt-16" : ""}`
        }`}
      >
        {children}
      </div>
      </TopBarProvider>
    </div>
  );
}
