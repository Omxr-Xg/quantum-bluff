import { ReactNode, useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Bell,
  DoorOpen,
  Eye,
  X,
  LogOut,
  Music2,
  Palette,
  Plus,
  Menu,
  Settings,
  Trophy,
  Home,
  CircleHelp,
  MessageCircle,
  Loader2,
  Radio,
  Waves,
} from "lucide-react";
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
import { useAccessibility } from "../contexts/AccessibilityContext";
import { SettingsMenu } from "./SettingsMenu";
import { RateGameModal } from "./RateGameModal";
import { GlobalHoverTooltip } from "./GlobalHoverTooltip";
import { OPEN_RATE_GAME_EVENT } from "../constants/storageKeys";
import type { SettingsTab } from "../contexts/AccessibilityMenuOpenContext";
import { useSendFriendMessageMutation } from "../services/api";
import { apiUrl } from "../utils/apiBase";

const ADD_MONEY_PRESETS = [100, 1000, 2000, 3000, 5000];
type BalanceHistoryEntry = {
  id: string;
  createdAt: string;
  reason: string;
  gameType?: string | null;
  amount: number;
  balanceBefore?: number | null;
  balanceAfter?: number | null;
};

type LayoutNotification =
  | {
      id: number;
      kind: "default";
      message: string;
      hint?: string;
      onClick?: () => void;
    }
  | {
      id: number;
      kind: "friend_message";
      senderId: string;
      senderUsername: string;
      preview: string;
    };

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { socket, isConnected, connect } = useSocket();
  const { toasts, removeToast, addToast } = useToast();
  const {
    unlockAudio,
    playSfx,
    stopBgm,
    bgmEnabled,
    bgmVolume,
    sfxEnabled,
    sfxVolume,
    setBgmVolume,
    setSfxVolume,
    toggleBgm,
    toggleSfx,
  } = useAudio();
  const {
    highContrast,
    toggleHighContrast,
    visualAlerts,
    toggleVisualAlerts,
    colorblindMode,
    toggleColorblindMode,
  } = useAccessibility();
  const [notification, setNotification] = useState<LayoutNotification | null>(null);
  const [gameHudState, setGameHudState] = useState<{
    game?: "poker" | "blackjack";
    phase?: string;
    isMyTurn?: boolean;
  } | null>(null);
  const [friendQuickReply, setFriendQuickReply] = useState("");
  const [sendFriendMessage, { isLoading: sendingFriendReply }] = useSendFriendMessageMutation();
  const [balance, setBalance] = useState(getUserBalance());
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [balanceModalTab, setBalanceModalTab] = useState<"history" | "topup">("history");
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | null>(null);
  const [devValidation, setDevValidation] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<BalanceHistoryEntry[]>([]);
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
        kind: "default",
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
        kind: "default",
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
      const preview = content.length > 80 ? content.slice(0, 80) + "…" : content;

      // Suppress if already viewing this conversation
      const params = new URLSearchParams(window.location.search);
      const alreadyViewing =
        window.location.pathname === "/friends" &&
        params.get("tab") === "messages" &&
        params.get("with") === data.senderId;
      if (alreadyViewing) return;

      setNotification({
        id: Date.now(),
        kind: "friend_message",
        senderId: data.senderId,
        senderUsername,
        preview: preview || "…",
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
    setFriendQuickReply("");
  }, [notification?.id]);

  useEffect(() => {
    if (!notification) return;

    const delayMs = notification.kind === "friend_message" ? 60_000 : 5000;
    const timer = setTimeout(() => {
      setNotification(null);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [notification]);

  const submitFriendQuickReply = useCallback(async () => {
    if (!notification || notification.kind !== "friend_message") return;
    const text = friendQuickReply.trim();
    if (!text || sendingFriendReply) return;
    try {
      await sendFriendMessage({
        receiverId: notification.senderId,
        content: text,
      }).unwrap();
      playSfx("uiSelect");
      setNotification(null);
      setFriendQuickReply("");
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } | string; status?: number };
      const serverMsg = typeof e?.data === "object" && e?.data?.error ? e.data.error : null;
      const msg =
        serverMsg ??
        (e?.status === 403 ? t("friends.chatOnlyWithFriends") : t("friends.sendMessageError"));
      addToast(msg, "error");
    }
  }, [
    notification,
    friendQuickReply,
    sendingFriendReply,
    sendFriendMessage,
    playSfx,
    addToast,
    t,
  ]);

  const openAddMoney = () => {
    playSfx("modalOpen");
    setShowAddMoney(true);
    setBalanceModalTab("history");
    void loadBalanceHistory();
    setAddMoneyAmount(null);
    setDevValidation("");
    setAddSuccess(false);
  };
  const loadBalanceHistory = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/balance-history?limit=50"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const parsed = (await res.json().catch(() => ({}))) as {
        entries?: BalanceHistoryEntry[];
        error?: string;
      };
      if (!res.ok) throw new Error(parsed.error || "Impossible de charger l'historique.");
      setHistoryEntries(Array.isArray(parsed.entries) ? parsed.entries : []);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Impossible de charger l'historique.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const reasonLabel = (reason: string): string => {
    const labels: Record<string, string> = {
      SLOT_STAKE: "Mise slot",
      SLOT_PAYOUT: "Gain slot",
      ROULETTE_STAKE: "Mise roulette",
      ROULETTE_PAYOUT: "Gain roulette",
      BLACKJACK_STAKE: "Mise blackjack",
      BLACKJACK_PAYOUT: "Gain blackjack",
      HIDDEN_BET_STAKE: "Mise pari caché",
      HIDDEN_BET_PAYOUT: "Gain pari caché",
      HIDDEN_BET_REFUND_VOID: "Remboursement pari annulé",
      HIDDEN_BET_REFUND_CANCEL: "Remboursement pari annulé",
      LOAN_FUNDED_IN: "Prêt reçu",
      LOAN_FUNDED_OUT: "Prêt envoyé",
      LOAN_REPAYMENT_IN: "Remboursement reçu",
      LOAN_REPAYMENT_OUT: "Remboursement envoyé",
      DEV_TOPUP: "Ajout de solde",
    };
    return labels[reason] || reason;
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
    await loadBalanceHistory();
    setAddSuccess(true);
    playSfx("success");
    setTimeout(closeAddMoney, 800);
  };

  const isGamePage = location.pathname === "/game" || location.pathname.startsWith("/game?");
  const isBlackjackGamePage = location.pathname.startsWith("/blackjack/table");
  const isGameHudPage = isGamePage || isBlackjackGamePage;
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
    showTopBar && isGameConfigOrRoom && !isLobby && path !== "/minigames" && !isBotConfigPage && !isGameHudPage;
  const showLobbyIntegratedBar = showTopBar && isLobby;
  const showStandaloneTopBar = showTopBar && (isBotConfigPage || isGameHudPage);
  /**
   * Padding réservé au menu hamburger fixe (bande en tête) — pas sur /game : la table a déjà son en-tête
   * et seul un bouton paramètres est en coin ; éviter la « barre » vide / décalage en haut.
   */
  const topBarPaddingForHamburger =
    showTopBar &&
    !showLobbyIntegratedBar &&
    showHamburgerMenu &&
    !isGameHudPage &&
    !isWaitingRoomPage;

  useEffect(() => {
    const onHudState = (event: Event) => {
      const detail = (event as CustomEvent<{
        game?: "poker" | "blackjack";
        phase?: string;
        isMyTurn?: boolean;
      } | null>).detail;
      setGameHudState(detail ?? null);
    };
    const onHudReset = () => setGameHudState(null);
    window.addEventListener("game-hud-state", onHudState as EventListener);
    window.addEventListener("game-hud-reset", onHudReset);
    return () => {
      window.removeEventListener("game-hud-state", onHudState as EventListener);
      window.removeEventListener("game-hud-reset", onHudReset);
    };
  }, []);

  useEffect(() => {
    if (!isGameHudPage) setGameHudState(null);
  }, [isGameHudPage]);

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
  const gameExitBtn =
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-red-300/25 bg-red-950/45 px-3 text-xs font-bold text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_rgba(127,29,29,0.24)] backdrop-blur-md transition hover:border-red-200/50 hover:bg-red-900/65 hover:text-white md:h-11 md:px-4 md:text-sm";
  const topNavIcon = "h-[1.05rem] w-[1.05rem] shrink-0 [stroke-width:2.15] md:h-[1.15rem] md:w-[1.15rem]";
  const gameHudBtn =
    "flex h-7 w-9 shrink-0 items-center justify-center rounded-full border transition md:h-8 md:w-10";
  const gameHudBtnOff =
    "border-white/10 bg-slate-950/25 text-slate-400 hover:border-white/25 hover:bg-slate-800/70 hover:text-white";
  const gameHudIcon = "h-3.5 w-3.5 shrink-0 md:h-4 md:w-4";
  const phase = gameHudState?.phase ?? "init";
  const phaseLabel =
    gameHudState?.game === "blackjack"
      ? t(`bjMulti.phase_${phase}`, { defaultValue: phase })
      : phase === "init" || phase === "shuffle" || phase === "deal"
      ? t("game.waiting")
      : t(`game.phaseBadge.${phase}`, { defaultValue: phase });
  const bgmPct = bgmEnabled ? Math.round(bgmVolume * 100) : 0;
  const sfxPct = sfxEnabled ? Math.round(sfxVolume * 100) : 0;
  const updateBgmVolume = (value: number) => {
    const next = Math.max(0, Math.min(100, value)) / 100;
    setBgmVolume(next);
    if (next <= 0 && bgmEnabled) toggleBgm(false);
    if (next > 0 && !bgmEnabled) toggleBgm(true);
  };
  const updateSfxVolume = (value: number) => {
    const next = Math.max(0, Math.min(100, value)) / 100;
    setSfxVolume(next);
    if (next <= 0 && sfxEnabled) toggleSfx(false);
    if (next > 0 && !sfxEnabled) toggleSfx(true);
  };
  const gameHudControls = (
    <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overflow-y-hidden scrollbar-hide">
      <div
        className={`flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.20)] backdrop-blur-md md:h-11 md:px-4 md:text-sm ${
          gameHudState?.isMyTurn
            ? "border-amber-300/35 bg-amber-500/15 text-amber-100"
            : "border-emerald-300/20 bg-slate-950/45 text-emerald-100"
        }`}
        title={`${t("game.phase")}: ${phaseLabel}${gameHudState?.isMyTurn ? ` · ${t("game.yourTurn")}` : ""}`}
        aria-label={`${t("game.phase")}: ${phaseLabel}`}
      >
        <Radio className={`h-[1.05rem] w-[1.05rem] shrink-0 ${gameHudState?.isMyTurn ? "text-amber-300" : "text-emerald-300"}`} aria-hidden />
        <span className="whitespace-nowrap">{phaseLabel}</span>
        {gameHudState?.isMyTurn && (
          <span className="hidden rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100 lg:inline">
            {t("game.yourTurn")}
          </span>
        )}
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-slate-950/45 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.20)] backdrop-blur-md md:h-11 md:px-1.5">
        <button
          type="button"
          onClick={() => {
            playSfx("uiClick");
            toggleHighContrast();
          }}
          className={`${gameHudBtn} ${highContrast ? "border-yellow-300/45 bg-yellow-300/15 text-yellow-100 shadow-[0_0_18px_rgba(250,204,21,0.18)]" : gameHudBtnOff}`}
          title={t("accessibility.highContrastTitle")}
          aria-label={t("accessibility.highContrastTitle")}
          aria-pressed={highContrast}
        >
          <Eye className={gameHudIcon} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            playSfx("uiClick");
            toggleVisualAlerts();
          }}
          className={`${gameHudBtn} ${visualAlerts ? "border-sky-300/45 bg-sky-400/15 text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.16)]" : gameHudBtnOff}`}
          title={t("accessibility.visualAlertsTitle")}
          aria-label={t("accessibility.visualAlertsTitle")}
          aria-pressed={visualAlerts}
        >
          <Bell className={gameHudIcon} aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            playSfx("uiClick");
            toggleColorblindMode();
          }}
          className={`${gameHudBtn} ${colorblindMode ? "border-fuchsia-300/45 bg-fuchsia-400/15 text-fuchsia-100 shadow-[0_0_18px_rgba(217,70,239,0.16)]" : gameHudBtnOff}`}
          title={t("accessibility.colorblindTitle")}
          aria-label={t("accessibility.colorblindTitle")}
          aria-pressed={colorblindMode}
        >
          <Palette className={gameHudIcon} aria-hidden />
        </button>
      </div>

      <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-white/10 bg-slate-950/45 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.20)] backdrop-blur-md md:h-11 md:px-1.5">
        <label
          className={`relative flex h-7 w-[4.2rem] shrink-0 cursor-ew-resize items-center justify-center overflow-hidden rounded-full border transition md:h-8 md:w-[4.9rem] ${
            bgmPct > 0 ? "border-emerald-300/45 bg-emerald-950/40 text-emerald-50" : gameHudBtnOff
          }`}
          data-tooltip={`${t("settings.musicTitle")} ${bgmPct}%`}
          data-active={bgmPct > 0 ? "true" : undefined}
        >
          <span
            aria-hidden
            data-volume-fill
            className="absolute inset-y-0 left-0 rounded-full bg-emerald-400/25 transition-[width]"
            style={{ width: `${bgmPct}%` }}
          />
          <span className="pointer-events-none relative z-10 flex items-center gap-1 text-[0.68rem] font-black tabular-nums md:text-xs">
            <Music2 className={gameHudIcon} aria-hidden />
            {bgmPct}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={bgmPct}
            onChange={(event) => updateBgmVolume(Number(event.target.value))}
            className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
            aria-label={t("settings.musicVolume")}
          />
        </label>
        <label
          className={`relative flex h-7 w-[4.2rem] shrink-0 cursor-ew-resize items-center justify-center overflow-hidden rounded-full border transition md:h-8 md:w-[4.9rem] ${
            sfxPct > 0 ? "border-cyan-300/45 bg-cyan-950/40 text-cyan-50" : gameHudBtnOff
          }`}
          data-tooltip={`${t("settings.sfxTitle")} ${sfxPct}%`}
          data-active={sfxPct > 0 ? "true" : undefined}
        >
          <span
            aria-hidden
            data-volume-fill
            className="absolute inset-y-0 left-0 rounded-full bg-cyan-400/25 transition-[width]"
            style={{ width: `${sfxPct}%` }}
          />
          <span className="pointer-events-none relative z-10 flex items-center gap-1 text-[0.68rem] font-black tabular-nums md:text-xs">
            <Waves className={gameHudIcon} aria-hidden />
            {sfxPct}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={sfxPct}
            onChange={(event) => updateSfxVolume(Number(event.target.value))}
            className="absolute inset-0 z-20 h-full w-full cursor-ew-resize opacity-0"
            aria-label={t("settings.sfxVolume")}
          />
        </label>
      </div>
    </div>
  );
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

  const gameAccountPill = (
    <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md md:h-11">
      <button
        type="button"
        onClick={openAddMoney}
        className="flex h-full min-w-0 items-center gap-2 px-3 text-left transition hover:bg-white/[0.06] md:gap-2.5 md:px-4"
        title={t("lobby.addMoney")}
        aria-label={t("lobby.addMoney")}
      >
        <ChipIcon size="sm" className="h-4 w-4 shrink-0 brightness-110 md:h-[1.1rem] md:w-[1.1rem]" />
        <span className="min-w-0 truncate whitespace-nowrap text-xs font-bold leading-none tabular-nums text-amber-50 md:text-[0.95rem]">
          {balance.toLocaleString()}
        </span>
        <Plus className="h-4 w-4 shrink-0 text-amber-200/90 md:h-[1.1rem] md:w-[1.1rem]" strokeWidth={2.4} aria-hidden />
      </button>
      <span
        className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-slate-800 md:h-8 md:w-8"
        data-tooltip={username}
        aria-label={username}
      >
        <img src={userAvatar} alt="" className="h-full w-full object-cover" draggable={false} />
      </span>
    </div>
  );

  const quitGameButton = (
    <button
      type="button"
      onClick={() => {
        playSfx("uiClick");
        window.dispatchEvent(new Event(isBlackjackGamePage ? "request-blackjack-quit" : "request-game-quit"));
      }}
      className={gameExitBtn}
      title={t("nav.quitGame")}
      aria-label={t("nav.quitGame")}
    >
      <DoorOpen className={topNavIcon} aria-hidden />
      <span className="hidden sm:inline">{t("nav.confirmQuit")}</span>
    </button>
  );

  const gameMenuContent = (
    <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center justify-end gap-1.5 sm:w-auto sm:shrink-0 md:gap-2">
      <div
        className="flex min-w-0 items-center justify-end gap-1 overflow-x-auto overflow-y-hidden scroll-smooth scrollbar-hide [-webkit-overflow-scrolling:touch] [touch-action:pan-x] sm:gap-1.5 md:gap-2"
      >
        <button
          type="button"
          onClick={() => {
            playSfx("uiClick");
            window.dispatchEvent(new Event(isBlackjackGamePage ? "request-blackjack-tour" : "request-game-tour"));
          }}
          className={topNavBtn}
          title={t("game.menuGuidedTour")}
          aria-label={t("game.menuGuidedTour")}
        >
          <CircleHelp className={topNavIcon} aria-hidden />
        </button>
        <LanguageSwitcher buttonClassName={languageButtonClass} />
        {gameAccountPill}
        <NotificationCenter />
        {quitGameButton}
      </div>
    </div>
  );

  const menuContent = isGameHudPage ? gameMenuContent : (
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
        <button type="button" onClick={() => { playSfx("uiClick"); openSettingsMenu(); }} className={topNavBtn} title={t("settings.title")} aria-label={t("settings.title")}>
          <Settings className={topNavIcon} aria-hidden />
        </button>
        <button type="button" onClick={() => { clearAuthStorage(); navigate("/"); }} className={`${topNavBtn} hover:border-red-300/40 hover:bg-red-950/45`} title={t("lobby.logout")} aria-label={t("lobby.logout")}>
          <LogOut className={topNavIcon} aria-hidden />
        </button>
      </div>
    </div>
  );
  const handleStandaloneHomeClick = () => {
    playSfx("uiClick");
    if (isGameHudPage) {
      window.dispatchEvent(new Event(isBlackjackGamePage ? "request-blackjack-quit" : "request-game-quit"));
      return;
    }
    navigate("/lobby");
  };

  return (
    <div className={`min-h-screen w-full ${showStandaloneTopBar ? "bg-transparent" : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"}`}>
      <GlobalHoverTooltip />
      <TopBarProvider menuContent={showLobbyIntegratedBar ? menuContent : null}>
      {showStandaloneTopBar && (
        <div className={`${isGameHudPage ? "fixed left-0 right-0 top-0" : "sticky top-0"} z-[250] w-full bg-transparent`}>
          <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-3 px-4 py-3 sm:px-8 lg:px-10">
            {isGameHudPage ? (
              gameHudControls
            ) : (
              <button
                type="button"
                onClick={handleStandaloneHomeClick}
                className="flex h-9 shrink-0 items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.20)] backdrop-blur-md transition hover:border-blue-200/25 hover:bg-blue-950/60 md:h-11 md:px-4"
              >
                <Home className="h-[1.05rem] w-[1.05rem] shrink-0" aria-hidden />
                <span>{t("botConfig.home")}</span>
              </button>
            )}
            <div className={`${isGameHudPage ? "min-w-0 shrink-0" : "min-w-0 flex-1"} overflow-x-auto overflow-y-hidden scrollbar-hide`}>
              {menuContent}
            </div>
          </div>
        </div>
      )}
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
        hideAestheticTab={isGameHudPage}
      />

      <RateGameModal open={showRateGame} onClose={() => setShowRateGame(false)} />

      {/* Modal Ajouter des jetons */}
      {showTopBar && showAddMoney && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeAddMoney}>
          <div className="bg-gradient-to-b from-[#17130f] via-[#120f0c] to-[#0f0d0b] border border-amber-500/40 rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-xl font-bold text-transparent">
                {t("lobby.addMoneyTitle")}
              </h3>
              <button type="button" onClick={closeAddMoney} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-amber-700/25 bg-[#1a1511]/55 p-1.5">
              <button
                type="button"
                onClick={() => {
                  setBalanceModalTab("history");
                  void loadBalanceHistory();
                }}
                className={`min-h-[2.6rem] rounded-lg border px-3 py-2 text-sm font-semibold tracking-wide transition ${
                  balanceModalTab === "history"
                    ? "border-amber-300/60 bg-gradient-to-b from-amber-700/35 to-amber-900/35 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.22)]"
                    : "border-slate-600/80 bg-slate-800/75 text-slate-300 hover:border-slate-500 hover:bg-slate-700/80"
                }`}
              >
                Historique
              </button>
              <button
                type="button"
                onClick={() => setBalanceModalTab("topup")}
                className={`min-h-[2.6rem] rounded-lg border px-3 py-2 text-sm font-semibold tracking-wide transition ${
                  balanceModalTab === "topup"
                    ? "border-amber-300/60 bg-gradient-to-b from-amber-700/35 to-amber-900/35 text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.22)]"
                    : "border-slate-600/80 bg-slate-800/75 text-slate-300 hover:border-slate-500 hover:bg-slate-700/80"
                }`}
              >
                Alimenter le compte
              </button>
            </div>
            {balanceModalTab === "history" ? (
              <>
                {historyLoading ? <p className="text-slate-300 text-center py-4">Chargement...</p> : null}
                {historyError ? <p className="text-rose-300 text-sm text-center py-3">{historyError}</p> : null}
                {!historyLoading && !historyError ? (
                  <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                    {historyEntries.length === 0 ? (
                      <p className="text-slate-400 text-center py-6">Aucun mouvement.</p>
                    ) : (
                      historyEntries.map((entry) => {
                        const before = typeof entry.balanceBefore === "number" ? entry.balanceBefore : null;
                        const after = typeof entry.balanceAfter === "number" ? entry.balanceAfter : null;
                        const delta = before !== null && after !== null ? after - before : entry.amount;
                        return (
                          <div key={entry.id} className="rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-semibold text-white">{reasonLabel(entry.reason)}</p>
                                <p className="text-xs text-slate-400">
                                  {new Intl.DateTimeFormat("fr-CA", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                  }).format(new Date(entry.createdAt))}
                                </p>
                              </div>
                              <p className={`text-sm font-bold ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                                {delta >= 0 ? "+" : ""}
                                {delta.toLocaleString()}
                              </p>
                            </div>
                            <p className="mt-1 text-xs text-slate-400">
                              Avant: {before !== null ? before.toLocaleString() : "—"} · Apres:{" "}
                              {after !== null ? after.toLocaleString() : "—"}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </>
            ) : addSuccess ? (
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
                          ? "bg-amber-500 text-slate-900"
                          : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                      }`}
                    >
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>
                {addMoneyAmount != null && (
                  <div className="space-y-2">
                    <label className="text-slate-300 text-sm block">
                      {t("lobby.devValidation") || 'Tapez "dev" pour valider'}
                    </label>
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
                      className="w-full py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:bg-slate-600 disabled:cursor-not-allowed text-slate-900 font-bold transition"
                    >
                      Valider l'alimentation
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
          {notification.kind === "friend_message" ? (
            <div className="bg-slate-900/95 border border-cyan-500/80 shadow-2xl rounded-2xl px-4 py-4 backdrop-blur-md animate-in slide-in-from-right-5 duration-300">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-cyan-600/25 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-cyan-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm mb-1">
                    {t("notifications.messageFrom", { name: notification.senderUsername })}
                  </p>
                  <p className="text-slate-200 text-sm break-words">{notification.preview}</p>

                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={friendQuickReply}
                      onChange={(e) => setFriendQuickReply(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void submitFriendQuickReply();
                        }
                      }}
                      placeholder={t("notifications.quickReplyPlaceholder")}
                      className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      autoComplete="off"
                      aria-label={t("notifications.quickReplyPlaceholder")}
                    />
                    <button
                      type="button"
                      disabled={!friendQuickReply.trim() || sendingFriendReply}
                      onClick={() => void submitFriendQuickReply()}
                      className="shrink-0 inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {sendingFriendReply ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : null}
                      {t("notifications.quickReplySend")}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="mt-2 text-left text-cyan-400/95 text-xs font-medium hover:text-cyan-300"
                    onClick={() => {
                      playSfx("uiSelect");
                      navigate(`/friends?tab=messages&with=${encodeURIComponent(notification.senderId)}`);
                      setNotification(null);
                    }}
                  >
                    {t("notifications.openConversation")} →
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="shrink-0 text-slate-400 hover:text-white transition-colors"
                  aria-label={t("networkOverlay.closeLabel")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="bg-slate-900/95 border border-blue-500 shadow-2xl rounded-2xl px-4 py-4 backdrop-blur-md animate-in slide-in-from-right-5 duration-300 cursor-pointer hover:border-blue-400 hover:bg-slate-800/95 transition-colors"
              onClick={() => {
                playSfx("uiSelect");
                notification.onClick?.();
                setNotification(null);
              }}
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-300" />
                </div>

                <div className="flex-1">
                  <p className="text-white font-semibold text-sm mb-1">
                    {t("notifications.toastTitle")}
                  </p>
                  <p className="text-slate-200 text-sm">{notification.message}</p>
                  {notification.hint && (
                    <p className="text-blue-400 text-xs mt-1">{notification.hint} →</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotification(null);
                  }}
                  className="shrink-0 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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
