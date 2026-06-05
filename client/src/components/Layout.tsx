import { ReactNode, useEffect, useLayoutEffect, useState, useRef, useCallback } from "react";
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
  History,
  Gift,
  CalendarDays,
  AlertCircle,
  Banknote,
  CheckCircle2,
  Check,
  UserPlus,
} from "lucide-react";
import { validateIban, formatIban, normalizeIban } from "../utils/iban";
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
  fetchDailyLoginStatus,
  requestWithdrawal,
  BALANCE_CHANGED_EVENT,
  BALANCE_GAIN_FLASH_EVENT,
  POKER_WALLET_DISPLAY_EVENT,
  updateUserBalance,
} from "../utils/userProfile";
import {
  fetchAvailableGiftCodes,
  validateGiftCode,
  validateTopUpPromo,
  type GiftCode,
} from "../utils/wallet";
import { DailyLoginModal } from "./DailyLoginModal";
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
import { GlobalCustomScrollbars } from "./GlobalCustomScrollbars";
import { CustomScrollArea } from "./CustomScrollArea";
import {
  FakeCardTopUpFields,
  isFakeCardComplete,
  type PromoDiscountInfo,
  simulatedEurFromChips,
} from "./FakeCardTopUpForm";
import { useIsMobile } from "./ui/use-mobile";
import { OPEN_RATE_GAME_EVENT } from "../constants/storageKeys";
import type { SettingsTab } from "../contexts/AccessibilityMenuOpenContext";
import { useRespondToFriendRequestMutation, useSendFriendMessageMutation } from "../services/api";
import { NUMBER_FIELD_INVALID_CLASS } from "../hooks/useNumberFieldInput";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import {
  FRIEND_CHAT_REPLIED_EVENT,
  getActiveFriendChat,
} from "../utils/activeFriendChat";

const ADD_MONEY_PRESETS = [100, 1000, 2000, 3000, 5000];
const WITHDRAW_PRESETS = [100, 500, 1000, 2500, 5000];
/** Montant minimum a retirer (en jetons). */
const WITHDRAW_MIN_AMOUNT = 100;
/** Taux de conversion retrait : 10 jetons = 0,80 €. */
const WITHDRAW_EUR_PER_CHIP = 0.08;

/** Convertit un nombre de jetons en euros pour l'affichage (2 decimales). */
function chipsToEur(chips: number): number {
  if (!Number.isFinite(chips) || chips <= 0) return 0;
  return Math.round((chips * WITHDRAW_EUR_PER_CHIP) * 100) / 100;
}

/** Formatte un montant en € selon la locale courante. */
function formatEur(eur: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(eur);
  } catch {
    return `${eur.toFixed(2)} €`;
  }
}
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
    }
  | {
      id: number;
      kind: "friend_request";
      requestId: string;
      senderUsername: string;
    };

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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
  const [respondFriendRequest, { isLoading: respondingFriendRequest }] = useRespondToFriendRequestMutation();
  /** Dédup FRIEND_MESSAGE (reconnexion / double emit). */
  const recentFriendMessageKeysRef = useRef<Set<string>>(new Set());
  const [balance, setBalance] = useState(getUserBalance());
  /** Feedback court +N jetons (portefeuille) après gain / recharge. */
  const [walletGainFlash, setWalletGainFlash] = useState<number | null>(null);
  const walletGainFlashClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Sur /game (cash), le solde affiché peut inclure la stack au siège (événement émis par Game.tsx). */
  const [pokerDisplayTotal, setPokerDisplayTotal] = useState<number | null>(null);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showDailyLogin, setShowDailyLogin] = useState(false);
  const [dailyLoginAvailable, setDailyLoginAvailable] = useState(false);
  const [balanceModalTab, setBalanceModalTab] = useState<
    "history" | "topup" | "codes" | "withdraw"
  >("topup");
  /* Onglet retrait : montant en jetons, IBAN saisi (formate), titulaire,
   * et flag de succes pour basculer sur l'ecran de confirmation. */
  const [withdrawAmount, setWithdrawAmount] = useState<number | null>(null);
  const [withdrawIban, setWithdrawIban] = useState("");
  const [withdrawHolder, setWithdrawHolder] = useState("");
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  /** Snapshot du montant retire pour l'ecran de confirmation (apres reset). */
  const [withdrawCompletedAmount, setWithdrawCompletedAmount] = useState<number | null>(null);
  const [addMoneyAmount, setAddMoneyAmount] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<PromoDiscountInfo>(null);
  const [freeCheckoutPromo, setFreeCheckoutPromo] = useState(false);
  const [promoValidating, setPromoValidating] = useState(false);
  const [cardName, setCardName] = useState("");
  const [cardDigits, setCardDigits] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyEntries, setHistoryEntries] = useState<BalanceHistoryEntry[]>([]);
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesError, setCodesError] = useState<string | null>(null);
  const [codesSuccess, setCodesSuccess] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showRateGame, setShowRateGame] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<SettingsTab>("aesthetic");
  const [gameHudToolsOpen, setGameHudToolsOpen] = useState(false);
  const closeMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MENU_CLOSE_DELAY = 500;
  const isMobile = useIsMobile();
  const isAdminShell =
    location.pathname === "/auth/admin" || location.pathname.startsWith("/admin/");
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

  const isGamePagePath =
    location.pathname === "/game" || location.pathname.startsWith("/game?");

  useEffect(() => {
    // Toujours refléter le local tout de suite (gains bot, navigation lobby ← jeu).
    setBalance(getUserBalance());
    if (getAuthItem("token") && !isAdminShell) {
      const blackjackMultiInLobby =
        location.pathname === "/lobby" && location.search.includes("tab=blackjack");
      const authoritative =
        location.pathname === "/minigames" ||
        location.pathname === "/blackjack" ||
        location.pathname.startsWith("/blackjack/lobby") ||
        location.pathname.startsWith("/blackjack/table") ||
        blackjackMultiInLobby ||
        location.pathname.startsWith("/tournaments") ||
        isGamePagePath;
      fetchBalanceFromServer({ authoritative }).then(setBalance);
    }
  }, [location.pathname, location.search, isGamePagePath, isAdminShell]);

  useEffect(() => {
    if (!isGamePagePath) setPokerDisplayTotal(null);
  }, [isGamePagePath]);

  useEffect(() => {
    const onPokerWallet = (e: Event) => {
      const ce = e as CustomEvent<{ total: number | null | undefined }>;
      const v = ce.detail?.total;
      setPokerDisplayTotal(typeof v === "number" && Number.isFinite(v) ? Math.max(0, Math.floor(v)) : null);
    };
    window.addEventListener(POKER_WALLET_DISPLAY_EVENT, onPokerWallet);
    return () => window.removeEventListener(POKER_WALLET_DISPLAY_EVENT, onPokerWallet);
  }, []);

  /** Mise à jour immédiate du solde affiché (ex. mode bot : `addToUserBalance` ne touche que le localStorage). */
  useEffect(() => {
    const sync = () => setBalance(getUserBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, sync);
  }, []);

  useEffect(() => {
    if (isAdminShell) return;
    const onGain = (e: Event) => {
      const d = (e as CustomEvent<{ delta?: number }>).detail;
      const raw = typeof d?.delta === "number" ? Math.floor(d.delta) : 0;
      if (raw <= 0) return;
      setWalletGainFlash((prev) => (prev ?? 0) + raw);
      if (walletGainFlashClearRef.current) window.clearTimeout(walletGainFlashClearRef.current);
      walletGainFlashClearRef.current = window.setTimeout(() => {
        setWalletGainFlash(null);
        walletGainFlashClearRef.current = null;
      }, 5500);
    };
    window.addEventListener(BALANCE_GAIN_FLASH_EVENT, onGain);
    return () => {
      window.removeEventListener(BALANCE_GAIN_FLASH_EVENT, onGain);
      if (walletGainFlashClearRef.current) {
        window.clearTimeout(walletGainFlashClearRef.current);
        walletGainFlashClearRef.current = null;
      }
    };
  }, [isAdminShell]);

  /** Vérifie côté serveur si la récompense de connexion quotidienne est disponible ; ouvre la modale une fois par jour à la première visite hors écrans auth. */
  useEffect(() => {
    if (!getAuthItem("token")) {
      setDailyLoginAvailable(false);
      return;
    }
    if (isAdminShell) {
      setDailyLoginAvailable(false);
      return;
    }
    const isAuthPage =
    location.pathname === "/" ||
    location.pathname === "/auth" ||
    location.pathname === "/auth/admin";
    const showTopBarNow = !isAuthPage;
    let cancelled = false;
    fetchDailyLoginStatus().then((status) => {
      if (cancelled) return;
      const available = Boolean(status && !status.claimedToday);
      setDailyLoginAvailable(available);
      if (!available || !status || !showTopBarNow) return;
      const userKey =
        (getAuthItem("userId") ?? getAuthItem("userid") ?? "").trim() || "anon";
      const markerKey = "quantum_bluff_daily_login_auto_opened";
      let prev: { u: string; d: string } | null = null;
      try {
        prev = JSON.parse(localStorage.getItem(markerKey) || "null") as { u: string; d: string } | null;
      } catch {
        prev = null;
      }
      if (prev && prev.u === userKey && prev.d === status.dayKey) return;
      localStorage.setItem(markerKey, JSON.stringify({ u: userKey, d: status.dayKey }));
      playSfx("modalOpen");
      setShowDailyLogin(true);
    });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, playSfx, isAdminShell]);

  useEffect(() => {
    if (isAdminShell) return;
    const onRewards = (e: Event) => {
      const d = (e as CustomEvent<{ source?: string }>).detail;
      if (d?.source !== "daily_login") return;
      void fetchDailyLoginStatus().then((s) => {
        setDailyLoginAvailable(Boolean(s && !s.claimedToday));
      });
    };
    window.addEventListener("user-rewards-updated", onRewards);
    return () => window.removeEventListener("user-rewards-updated", onRewards);
  }, [isAdminShell]);

  useEffect(() => {
    const onFocus = () => {
      if (getAuthItem("token") && !isAdminShell) {
        const authoritative =
          location.pathname === "/minigames" ||
          location.pathname === "/blackjack" ||
          location.pathname.startsWith("/blackjack/lobby") ||
          location.pathname.startsWith("/blackjack/table") ||
          location.pathname.startsWith("/tournaments") ||
          isGamePagePath;
        fetchBalanceFromServer({ authoritative }).then(setBalance);
      } else {
        setBalance(getUserBalance());
      }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [location.pathname, location.search, isGamePagePath, isAdminShell]);

  useEffect(() => {
    if (!isAdminShell && !isConnected) {
      connect();
    }
  }, [isConnected, connect, isAdminShell]);

  useEffect(() => {
    if (isAdminShell || !isConnected) return;

    const path = location.pathname;
    const params = new URLSearchParams(location.search);
    const lobbyTab = params.get("tab");
    const minigame = params.get("game");
    let activity = "Salon poker";
    if (path === "/game") activity = "Poker";
    else if (path === "/waiting-room") activity = "Salon poker";
    else if (path === "/lobby" && lobbyTab === "blackjack") activity = "Salon blackjack";
    else if (path === "/lobby" && (lobbyTab === "minigames" || lobbyTab === "roulette")) activity = "Salon mini-jeux";
    else if (path.startsWith("/blackjack/table")) activity = "Blackjack";
    else if (path.startsWith("/blackjack/lobby")) activity = "Salon blackjack";
    else if (path === "/blackjack") activity = "Blackjack";
    else if (path === "/minigames" && minigame === "slots") activity = "Machine à sous";
    else if (path === "/minigames") activity = "Roulette";
    else if (path.startsWith("/tournaments")) activity = "Tournoi";
    else if (path === "/friends") activity = "Amis";

    socket.emit("USER_ACTIVITY_CHANGED", { activity });
  }, [isAdminShell, isConnected, location.pathname, location.search]);

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
    const interactiveSelector = [
      "button",
      "a[href]",
      "[role='button']",
      "summary",
      "input[type='button']",
      "input[type='submit']",
      "input[type='reset']",
    ].join(",");

    const isDisabled = (element: HTMLElement) =>
      element.hasAttribute("disabled") ||
      element.getAttribute("aria-disabled") === "true" ||
      ((element instanceof HTMLButtonElement || element instanceof HTMLInputElement) && element.disabled);

    const handleGlobalClickSfx = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest(interactiveSelector);
      if (!(interactive instanceof HTMLElement)) return;
      if (interactive.closest("[data-sfx-silent='true']")) return;
      if (isDisabled(interactive)) return;

      const sfxBeforeClick = window.__quantumBluffLastSfxAt ?? 0;
      window.setTimeout(() => {
        const latestSfx = window.__quantumBluffLastSfxAt ?? 0;
        if (latestSfx !== sfxBeforeClick && performance.now() - latestSfx < 140) return;
        playSfx("uiClick");
      }, 35);
    };

    document.addEventListener("click", handleGlobalClickSfx, true);
    return () => document.removeEventListener("click", handleGlobalClickSfx, true);
  }, [playSfx]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendRequestReceived = (payload: unknown) => {
      const p = payload as { requestId?: string; sender?: { username?: string } };
      const username = p?.sender?.username || "un joueur";
      const requestId = p?.requestId;
      if (requestId) {
        setNotification({
          id: Date.now(),
          kind: "friend_request",
          requestId,
          senderUsername: username,
        });
      } else {
        setNotification({
          id: Date.now(),
          kind: "default",
          message: t('toast.friendRequestFrom', { username }),
          hint: t('notifications.viewRequests'),
          onClick: () => navigate('/friends?tab=requests'),
        });
      }
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
      const data = payload as {
        id?: string;
        senderId: string;
        createdAt?: string;
        sender?: { username?: string };
        content?: string;
      };
      const me = (getAuthItem("userId") ?? getAuthItem("userid") ?? "").trim();
      if (me && data.senderId === me) return;

      const content = data.content ?? "";
      const preview = content.length > 80 ? content.slice(0, 80) + "…" : content;

      /* Suppression : on n'envoie PAS de notif si la conversation avec ce sender
       * est ouverte. On regarde deux sources :
       *  1. le state global publié par Friends.tsx (source de vérité instantanée) ;
       *  2. fallback sur l'URL au cas où Friends ne se soit pas encore mount. */
      if (getActiveFriendChat() === data.senderId) return;
      const params = new URLSearchParams(window.location.search);
      const alreadyViewing =
        window.location.pathname === "/friends" &&
        params.get("tab") === "messages" &&
        params.get("with") === data.senderId;
      if (alreadyViewing) return;

      const dedupKey =
        data.id && String(data.id).length > 0
          ? `id:${data.id}`
          : `fp:${data.senderId}:${data.createdAt ?? ""}:${(data.content ?? "").slice(0, 48)}`;
      const seen = recentFriendMessageKeysRef.current;
      if (seen.has(dedupKey)) return;
      seen.add(dedupKey);
      while (seen.size > 50) {
        const first = seen.values().next().value;
        if (first != null) seen.delete(first);
      }

      const senderUsername = data.sender?.username ?? "un ami";

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

    /* Message ami : 5 s sans action ; autres toasts layout : 5 s aussi. */
    const delayMs = 5000;
    const timer = setTimeout(() => {
      setNotification(null);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [notification]);

  /* Si on a répondu dans la conversation à ce sender, on retire immédiatement
   * la notification "friend_message" qui le concerne — pas de raison d'attendre
   * le timer de 5 s, on n'a plus besoin de ce rappel. */
  useEffect(() => {
    const handler = (ev: Event) => {
      const friendId = (ev as CustomEvent<{ friendId?: string }>).detail?.friendId;
      if (!friendId) return;
      setNotification((cur) => {
        if (!cur) return cur;
        if (cur.kind === "friend_message" && cur.senderId === friendId) return null;
        return cur;
      });
    };
    window.addEventListener(FRIEND_CHAT_REPLIED_EVENT, handler);
    return () => window.removeEventListener(FRIEND_CHAT_REPLIED_EVENT, handler);
  }, []);

  const submitFriendQuickReply = useCallback(async () => {
    if (!notification || notification.kind !== "friend_message") return;
    const text = friendQuickReply.trim();
    if (!text || sendingFriendReply) return;
    const receiverId = notification.senderId;
    const content = text;
    /* Fermeture immédiate à l'envoi ; l'optimistic RTK met à jour la conversation. */
    setNotification(null);
    setFriendQuickReply("");
    try {
      await sendFriendMessage({
        receiverId,
        content,
      }).unwrap();
      playSfx("uiSelect");
      /* J'ai répondu via la quick-reply : retire l'unread bell pour ce sender. */
      window.dispatchEvent(
        new CustomEvent(FRIEND_CHAT_REPLIED_EVENT, {
          detail: { friendId: receiverId },
        }),
      );
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
    setBalanceModalTab("topup");
    setAddMoneyAmount(null);
    setPromoCode("");
    setPromoDiscount(null);
    setFreeCheckoutPromo(false);
    setCardName("");
    setCardDigits("");
    setCardExpiry("");
    setCardCvv("");
    setAddSuccess(false);
  };
  const loadBalanceHistory = useCallback(async () => {
    const token = getAuthItem("token");
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
      if (!res.ok) throw new Error(parsed.error || t("lobby.balanceHistoryLoadError"));
      setHistoryEntries(Array.isArray(parsed.entries) ? parsed.entries : []);
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : t("lobby.balanceHistoryLoadError"));
    } finally {
      setHistoryLoading(false);
    }
  }, [t]);

  const reasonLabel = useCallback(
    (reason: string): string => {
      if (reason.startsWith("GIFT_CODE_")) {
        const type = reason.replace("GIFT_CODE_", "");
        const giftKey = `balanceLedger.giftType.${type}`;
        const giftTr = t(giftKey);
        if (giftTr !== giftKey) return giftTr;
        return t("balanceLedger.giftFallback");
      }
      const key = `balanceLedger.reasons.${reason}`;
      const tr = t(key);
      if (tr !== key) return tr;
      return reason;
    },
    [t],
  );
  const loadGiftCodes = useCallback(async () => {
    setCodesLoading(true);
    setCodesError(null);
    try {
      const codes = await fetchAvailableGiftCodes();
      setGiftCodes(codes || []);
    } catch (err) {
      setCodesError(err instanceof Error ? err.message : t("lobby.giftCodesLoadError"));
    } finally {
      setCodesLoading(false);
    }
  }, [t]);

  const handleValidateCode = async () => {
    if (!codeInput.trim()) {
      setCodesError(t("lobby.giftCodeEnterError"));
      return;
    }

    setCodesLoading(true);
    setCodesError(null);
    setCodesSuccess(null);

    try {
      const result = await validateGiftCode(codeInput.trim());
      if (result) {
        setCodesSuccess(result.message);
        setCodeInput("");
        if (typeof result.newBalance === "number" && Number.isFinite(result.newBalance)) {
          // Persiste + déclenche BALANCE_CHANGED_EVENT pour synchroniser tous les listeners
          // (Layout, Lobby, etc.) au lieu de ne mettre à jour que l'état local.
          updateUserBalance(result.newBalance);
        }
        setBalance(result.newBalance);

        // Reload codes and history
        setTimeout(() => {
          void loadGiftCodes();
          void loadBalanceHistory();
          setCodesSuccess(null);
        }, 2000);
      }
    } catch (err: Error | unknown) {
      setCodesError(err instanceof Error ? err.message : t("lobby.giftCodeInvalid"));
    } finally {
      setCodesLoading(false);
    }
  };

  const closeAddMoney = () => {
    playSfx("modalClose");
    setShowAddMoney(false);
    setAddMoneyAmount(null);
    setPromoCode("");
    setPromoDiscount(null);
    setFreeCheckoutPromo(false);
    setCardName("");
    setCardDigits("");
    setCardExpiry("");
    setCardCvv("");
    setAddSuccess(false);
    setWithdrawAmount(null);
    setWithdrawIban("");
    setWithdrawHolder("");
    setWithdrawSuccess(false);
    setWithdrawSubmitting(false);
    setWithdrawError(null);
    setWithdrawCompletedAmount(null);
    if (getAuthItem("token")) {
      fetchBalanceFromServer().then(setBalance);
    } else {
      setBalance(getUserBalance());
    }
  };
  const validatePaymentPromo = useCallback(async (code: string) => {
    if (!code.trim()) {
      setPromoDiscount(null);
      setFreeCheckoutPromo(false);
      return;
    }
    setPromoValidating(true);
    try {
      const top = await validateTopUpPromo(code);
      if (top?.valid && top.freeCheckout) {
        setFreeCheckoutPromo(true);
        setPromoDiscount(null);
        return;
      }
      setFreeCheckoutPromo(false);
      const result = await validateGiftCode(code);
      if (result && result.success && result.discountType) {
        // C'est un code de réduction
        setPromoDiscount({
          discountType: result.discountType as "FIXED_DISCOUNT" | "PERCENTAGE_DISCOUNT",
          discountValue: result.discountValue || 0,
        });
      } else {
        setPromoDiscount(null);
      }
    } catch (error) {
      console.error("[payment] Promo validation error:", error);
      setPromoDiscount(null);
      setFreeCheckoutPromo(false);
    } finally {
      setPromoValidating(false);
    }
  }, []);

  const submitAddMoney = async () => {
    if (addMoneyAmount == null || addMoneyAmount <= 0) return;
    // Vérifier si c'est un paiement gratuit (réduction 100% ou code promo solde)
    const finalPrice = simulatedEurFromChips(addMoneyAmount, promoDiscount);
    const isFreePayment = freeCheckoutPromo || finalPrice === 0;
    if (!isFreePayment && !isFakeCardComplete(cardDigits, cardExpiry, cardCvv, cardName)) return;
    const newBalance = await addDevMoney(addMoneyAmount, {
      promoCode: freeCheckoutPromo ? promoCode : undefined,
    });
    setBalance(newBalance);
    await loadBalanceHistory();
    setAddSuccess(true);
    playSfx("success");
    setTimeout(closeAddMoney, 800);
  };

  /* Soumission d'une demande de retrait. La validation IBAN est strictement
   * structurelle (longueur + clef mod-97) cote client ; le serveur fait
   * une revalidation legere (longueur + chars) puis decremente le solde
   * dans une transaction protegee anti-overdraft (where chips >= amount).
   * La monnaie etant virtuelle, aucun virement bancaire reel n'est emis. */
  const submitWithdrawal = async () => {
    if (withdrawSubmitting) return;
    if (withdrawAmount == null || withdrawAmount < WITHDRAW_MIN_AMOUNT) return;
    if (withdrawAmount > balance) return;
    const check = validateIban(withdrawIban);
    if (!check.ok) return;
    if (withdrawHolder.trim().length < 2) return;
    setWithdrawSubmitting(true);
    setWithdrawError(null);
    const requested = withdrawAmount;
    const result = await requestWithdrawal({
      amount: requested,
      iban: check.normalized,
      holder: withdrawHolder.trim(),
    });
    setWithdrawSubmitting(false);
    if (!result.ok) {
      setWithdrawError(result.error);
      return;
    }
    setBalance(result.chips);
    setWithdrawCompletedAmount(requested);
    setWithdrawSuccess(true);
    playSfx("success");
    /* Rafraichit l'historique pour que le retrait apparaisse direct. */
    void loadBalanceHistory();
    setTimeout(closeAddMoney, 2200);
  };

  const isGamePage = location.pathname === "/game" || location.pathname.startsWith("/game?");
  const isBlackjackGamePage = location.pathname.startsWith("/blackjack/table");
  const isGameHudPage = isGamePage || isBlackjackGamePage;
  const isWaitingRoomPage =
    location.pathname === "/waiting-room";
  const isAuthPage =
    location.pathname === "/" ||
    location.pathname === "/auth" ||
    location.pathname === "/auth/admin";

  useEffect(() => {
    if (isAdminShell) {
      stopBgm();
    }
  }, [isAdminShell, stopBgm]);
  const showTopBar = !isAuthPage && getAuthItem("token");
  const isFreePaymentTopUp =
    freeCheckoutPromo ||
    Boolean(promoDiscount && simulatedEurFromChips(addMoneyAmount || 0, promoDiscount) === 0);
  const canSubmitTopUp =
    addMoneyAmount != null &&
    addMoneyAmount > 0 &&
    (isFreePaymentTopUp || isFakeCardComplete(cardDigits, cardExpiry, cardCvv, cardName));
  const addMoneyModalHeightClass =
    balanceModalTab === "withdraw"
      ? withdrawSuccess
        ? "h-[22rem]"
        : "h-[44rem]"
      : balanceModalTab === "history"
        ? "h-[24rem]"
        : addSuccess
          ? "h-[20rem]"
          : addMoneyAmount != null
            ? "h-[38rem]"
            : "h-[18rem]";
  const path = location.pathname;
  const isLobby = path.includes("lobby") && !path.includes("waiting-room");
  const isBotConfigPage = path.includes("bot-configuration");
  const isCasinoFullBleed =
    path === "/minigames" ||
    path === "/blackjack" ||
    path.startsWith("/blackjack/lobby") ||
    path.startsWith("/blackjack/table") ||
    path.startsWith("/belote/game");
  /** Scroll sur la fenêtre (document) : évite le double scroll conteneur interne + contenu. */
  const lobbyDocumentScroll =
    path === "/lobby" || path === "/tutorial/game";
  const isGameConfigOrRoom =
    isGamePage ||
    path.includes("bot-configuration") ||
    path.includes("waiting-room") ||
    path.startsWith("/tutorial/") ||
    path === "/minigames" ||
    path === "/blackjack" ||
    path.startsWith("/blackjack/lobby") ||
    path.startsWith("/blackjack/table");
  /** Sur la roulette le panneau du menu recouvre tout le tapis — pas de hamburger (navigation via l’en-tête de la page). */
  const showHamburgerMenu =
    showTopBar && isGameConfigOrRoom && !isLobby && path !== "/minigames" && !isBotConfigPage && !isGameHudPage && !isWaitingRoomPage;
  const showLobbyIntegratedBar = showTopBar && isLobby;
  const showFriendsIntegratedBar = showTopBar && path === "/friends";
  const showIntegratedTopBar = showLobbyIntegratedBar || showFriendsIntegratedBar;
  const showStandaloneTopBar = showTopBar && (isBotConfigPage || isGameHudPage || isWaitingRoomPage);
  /**
   * Padding réservé au menu hamburger fixe (bande en tête) — pas sur /game : la table a déjà son en-tête
   * et seul un bouton paramètres est en coin ; éviter la « barre » vide / décalage en haut.
   */
  const topBarPaddingForHamburger =
    showTopBar &&
    !showIntegratedTopBar &&
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

  useLayoutEffect(() => {
    /** Admin + lobby : scroll sur le document (#root a overflow:hidden par défaut). */
    const on = isAdminShell || (lobbyDocumentScroll && !isCasinoFullBleed);
    const root = document.getElementById("root");
    document.documentElement.classList.toggle("doc-scroll-mode", on);
    document.body.classList.toggle("doc-scroll-mode", on);
    root?.classList.toggle("doc-scroll-mode", on);
    return () => {
      document.documentElement.classList.remove("doc-scroll-mode");
      document.body.classList.remove("doc-scroll-mode");
      root?.classList.remove("doc-scroll-mode");
    };
  }, [isAdminShell, lobbyDocumentScroll, isCasinoFullBleed, path]);

  if (isAdminShell) {
    return (
      <div className="min-h-screen w-full text-white">
        <GlobalHoverTooltip />
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
    "inline-flex aspect-square h-9 min-h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:border-white/20 hover:bg-slate-800/80 hover:text-white md:h-11 md:min-h-11 md:w-11 md:min-w-11";
  const gameExitBtn =
    "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-full border border-red-300/25 bg-red-950/45 px-3 text-xs font-bold text-red-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_rgba(127,29,29,0.24)] backdrop-blur-md transition hover:border-red-200/50 hover:bg-red-900/65 hover:text-white md:h-11 md:px-4 md:text-sm";
  const topNavIcon = "h-[1.05rem] w-[1.05rem] shrink-0 [stroke-width:2.15] md:h-[1.15rem] md:w-[1.15rem]";
  const gameHudBtn =
    "flex aspect-square h-7 min-h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full border transition md:h-8 md:min-h-8 md:w-8 md:min-w-8";
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
  const gameHudPhaseClasses = `flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.20)] backdrop-blur-md md:h-11 md:px-4 md:text-sm ${
    gameHudState?.isMyTurn
      ? "border-amber-300/35 bg-amber-500/15 text-amber-100"
      : "border-emerald-300/20 bg-slate-950/45 text-emerald-100"
  }`;
  const gameHudPhaseContent = (
    <>
      <Radio className={`h-[1.05rem] w-[1.05rem] shrink-0 ${gameHudState?.isMyTurn ? "text-amber-300" : "text-emerald-300"}`} aria-hidden />
      <span className="whitespace-nowrap">{phaseLabel}</span>
      {gameHudState?.isMyTurn && (
        <span className="hidden rounded-full bg-amber-300/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100 lg:inline">
          {t("game.yourTurn")}
        </span>
      )}
      {isMobile && <Settings className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />}
    </>
  );
  const gameHudAccessibilityControls = (
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
  );
  const gameHudAudioControls = (
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
  );
  const gameHudControls = (
    <div className="relative flex min-w-0 shrink-0 items-center gap-2 overflow-visible py-1 sm:flex-1">
      {isMobile ? (
        <button
          type="button"
          onClick={() => {
            playSfx("uiClick");
            setGameHudToolsOpen((open) => !open);
          }}
          className={gameHudPhaseClasses}
          title={`${t("game.phase")}: ${phaseLabel}${gameHudState?.isMyTurn ? ` · ${t("game.yourTurn")}` : ""}`}
          aria-label={`${t("game.phase")}: ${phaseLabel}`}
          aria-expanded={gameHudToolsOpen}
        >
          {gameHudPhaseContent}
        </button>
      ) : (
        <>
          <div
            className={gameHudPhaseClasses}
            title={`${t("game.phase")}: ${phaseLabel}${gameHudState?.isMyTurn ? ` · ${t("game.yourTurn")}` : ""}`}
            aria-label={`${t("game.phase")}: ${phaseLabel}`}
          >
            {gameHudPhaseContent}
          </div>
          {gameHudAccessibilityControls}
          {gameHudAudioControls}
        </>
      )}
      {isMobile && gameHudToolsOpen && (
        <div className="absolute left-0 top-full z-[270] mt-1.5 flex w-max max-w-[calc(100vw-1rem)] flex-col gap-1.5 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-xl">
          {gameHudAccessibilityControls}
          {gameHudAudioControls}
        </div>
      )}
    </div>
  );
  const userAvatar = getUserAvatar();
  const username = getUsername();
  const headerBalance = pokerDisplayTotal ?? balance;
  const languageButtonClass =
    "flex aspect-square h-9 min-h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_8px_22px_rgba(0,0,0,0.24)] backdrop-blur-md transition hover:border-white/20 hover:bg-slate-800/80 md:h-11 md:min-h-11 md:w-11 md:min-w-11";
  /** Jetons + connexion quotidienne (pastille) — séparé du bouton profil pour le lobby / menu compact. */
  const lobbyMoneyPill = (
    <div className="flex h-9 shrink-0 items-center overflow-hidden rounded-full border border-white/10 bg-slate-950/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-md md:h-11">
      <button
        type="button"
        onClick={openAddMoney}
        className="flex h-full min-w-0 items-center gap-2 px-3 text-left transition hover:bg-white/[0.06] md:gap-2.5 md:px-4"
        title={t("lobby.addMoney")}
      >
        <ChipIcon size="sm" className="h-4 w-4 shrink-0 brightness-110 md:h-[1.1rem] md:w-[1.1rem]" />
        <span className="flex min-w-0 max-w-[min(52vw,14rem)] items-baseline gap-1.5 sm:max-w-none">
          <span className="min-w-0 truncate whitespace-nowrap text-xs font-bold leading-none tabular-nums text-amber-50 md:text-[0.95rem]">
            {headerBalance.toLocaleString()}
          </span>
          {walletGainFlash != null && walletGainFlash > 0 ? (
            <span
              className="shrink-0 whitespace-nowrap text-[0.65rem] font-bold leading-none tabular-nums text-emerald-400 md:text-xs"
              aria-live="polite"
            >
              {t("lobby.walletGainFlash", { amount: walletGainFlash.toLocaleString() })}
            </span>
          ) : null}
        </span>
        <Plus className="h-4 w-4 shrink-0 text-amber-200/90 md:h-[1.1rem] md:w-[1.1rem]" strokeWidth={2.4} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => {
          playSfx("modalOpen");
          setShowDailyLogin(true);
        }}
        className="relative mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/15 bg-slate-800/60 text-amber-200 transition hover:border-amber-300/60 hover:bg-amber-400/10 md:h-8 md:w-8"
        title={t("dailyLogin.title")}
        aria-label={t("dailyLogin.title")}
      >
        <CalendarDays className="h-3.5 w-3.5 md:h-4 md:w-4" aria-hidden />
        {dailyLoginAvailable ? (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-400 ring-2 ring-slate-950 motion-safe:animate-pulse" />
        ) : null}
      </button>
    </div>
  );

  const lobbyProfileButton = (
    <button
      type="button"
      onClick={() => navigate("/profile")}
      className={`${languageButtonClass} overflow-hidden p-0 hover:border-emerald-300/45`}
      title={t("lobby.profile")}
      aria-label={t("lobby.profile")}
    >
      <img src={userAvatar} alt="" className="h-full w-full object-cover" draggable={false} />
      <span className="sr-only">{username}</span>
    </button>
  );

  const lobbyMoneyAndProfile = (
    <div className="flex shrink-0 items-center gap-2 md:gap-2.5">
      {lobbyMoneyPill}
      {lobbyProfileButton}
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
        <span className="flex min-w-0 max-w-[min(52vw,14rem)] items-baseline gap-1.5 sm:max-w-none">
          <span className="min-w-0 truncate whitespace-nowrap text-xs font-bold leading-none tabular-nums text-amber-50 md:text-[0.95rem]">
            {headerBalance.toLocaleString()}
          </span>
          {walletGainFlash != null && walletGainFlash > 0 ? (
            <span
              className="shrink-0 whitespace-nowrap text-[0.65rem] font-bold leading-none tabular-nums text-emerald-400 md:text-xs"
              aria-live="polite"
            >
              {t("lobby.walletGainFlash", { amount: walletGainFlash.toLocaleString() })}
            </span>
          ) : null}
        </span>
        <Plus className="h-4 w-4 shrink-0 text-amber-200/90 md:h-[1.1rem] md:w-[1.1rem]" strokeWidth={2.4} aria-hidden />
      </button>
      <span
        className="mr-1 flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-slate-800 md:h-8 md:w-8"
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
    <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center justify-end gap-1.5 overflow-visible sm:w-auto sm:shrink-0 md:gap-2">
      <div
        className="flex min-w-0 items-center justify-end gap-1 overflow-x-auto overflow-y-visible py-2 scroll-smooth scrollbar-hide [-webkit-overflow-scrolling:touch] [touch-action:pan-x] sm:gap-1.5 md:gap-2"
      >
        <button
          type="button"
          onClick={() => {
            playSfx("uiClick");
            window.dispatchEvent(new Event(isBlackjackGamePage ? "request-blackjack-tour" : "request-game-tour"));
          }}
          className={`${topNavBtn} max-sm:hidden`}
          title={t("game.menuGuidedTour")}
          aria-label={t("game.menuGuidedTour")}
        >
          <CircleHelp className={topNavIcon} aria-hidden />
        </button>
        <LanguageSwitcher buttonClassName={languageButtonClass} className="max-sm:hidden" />
        {gameAccountPill}
        <NotificationCenter />
        {quitGameButton}
      </div>
    </div>
  );

  /** Page config bot : barre haute allégée (accueil reste à gauche dans la barre standalone). */
  const botConfigMenuContent = (
    <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center justify-end gap-1.5 overflow-visible sm:w-auto sm:shrink-0 md:gap-2">
      <LanguageSwitcher buttonClassName={languageButtonClass} />
      {lobbyMoneyAndProfile}
    </div>
  );

  const menuContent = isGameHudPage
    ? gameMenuContent
    : isBotConfigPage
      ? botConfigMenuContent
      : (
    <div className="flex w-full min-w-0 max-w-full flex-nowrap items-center gap-1.5 overflow-visible max-sm:justify-between sm:w-auto sm:shrink-0 sm:justify-end md:gap-2">
      <LanguageSwitcher buttonClassName={languageButtonClass} />
      {lobbyMoneyAndProfile}
      <div
        className="flex min-w-0 max-sm:min-w-0 max-sm:flex-1 max-sm:items-center max-sm:justify-end max-sm:gap-1 max-sm:overflow-x-auto max-sm:overflow-y-visible max-sm:scroll-smooth max-sm:py-2 max-sm:scrollbar-hide max-sm:[-webkit-overflow-scrolling:touch] max-sm:[touch-action:pan-x] sm:min-w-0 sm:shrink-0 sm:gap-1.5 md:gap-2"
      >
        <NotificationCenter />
        <button
          type="button"
          onClick={() => {
            playSfx("uiSelect");
            navigate("/leaderboard");
          }}
          className={topNavBtn}
          title={t("leaderboard.title")}
          aria-label={t("leaderboard.title")}
        >
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

  const lobbyShellBg = (() => {
    if (!lobbyDocumentScroll || isCasinoFullBleed) return "bg-transparent";
    const tab = new URLSearchParams(location.search).get("tab");
    if (tab === "minigames" || tab === "roulette") return "bg-[#02100c]";
    if (tab === "blackjack") return "bg-[#100409]";
    return "bg-[#020716]";
  })();
  const shellBg =
    lobbyDocumentScroll && !isCasinoFullBleed
      ? lobbyShellBg
      : showStandaloneTopBar
        ? "bg-transparent"
      : "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900";
  const shellClass =
    lobbyDocumentScroll && !isCasinoFullBleed
      ? /* Pas de min-h-[100dvh] ni flex-1 sur l’enfant : sinon zone vide en bas (fond document sans dégradés lobby). */
        `flex w-full min-w-0 flex-col overflow-x-clip overflow-y-visible pb-[env(safe-area-inset-bottom,0px)] ${shellBg}`
      : `box-border flex h-[100dvh] max-h-[100dvh] min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden pb-[env(safe-area-inset-bottom,0px)] ${shellBg}`;

  const topPadHamburger =
    "pt-[calc(3.5rem+env(safe-area-inset-top,0px))] md:pt-[calc(4rem+env(safe-area-inset-top,0px))]";
  /** Sous la barre système (encoche / statut), sans double marge si barre de jeu fixe. */
  const topPadMainScroll = topBarPaddingForHamburger
    ? topPadHamburger
    : showStandaloneTopBar
      ? ""
      : "pt-[env(safe-area-inset-top,0px)]";
  const topPadDocScroll = topBarPaddingForHamburger
    ? topPadHamburger
    : "pt-[env(safe-area-inset-top,0px)]";

  return (
    <div className={shellClass}>
      <GlobalHoverTooltip />
      <GlobalCustomScrollbars />
      <TopBarProvider menuContent={showIntegratedTopBar ? menuContent : null}>
      {showStandaloneTopBar && (
        <div
          className={`${isGameHudPage ? "fixed left-0 right-0 top-0" : "sticky top-0"} z-[250] w-full bg-transparent pt-[env(safe-area-inset-top,0px)]`}
        >
          <div className="mx-auto flex w-full max-w-7xl min-w-0 items-center justify-between gap-2 px-3 py-3 sm:gap-3 sm:px-8 lg:px-10">
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
            <div className={`${isGameHudPage ? "min-w-0 flex-1 sm:flex-none sm:shrink-0" : "min-w-0 flex-1"} overflow-x-auto overflow-y-visible py-2 scrollbar-hide`}>
              {menuContent}
            </div>
          </div>
        </div>
      )}
      {showHamburgerMenu && (
        <div className="fixed end-2 top-[calc(0.5rem+env(safe-area-inset-top,0px))] z-[250] flex items-center gap-1 sm:end-4 sm:top-[calc(1rem+env(safe-area-inset-top,0px))] sm:gap-2">
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
                className="flex aspect-square h-7 min-h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-500 bg-slate-700 text-white shadow-lg transition hover:bg-slate-600 sm:h-8 sm:min-h-8 sm:w-8 sm:min-w-8 md:h-9 md:min-h-9 md:w-9 md:min-w-9"
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
                className="flex aspect-square h-7 min-h-7 w-7 min-w-7 shrink-0 items-center justify-center rounded-full border-2 border-slate-500 bg-slate-700 text-white shadow-lg transition hover:bg-slate-600 sm:h-8 sm:min-h-8 sm:w-8 sm:min-w-8 md:h-9 md:min-h-9 md:w-9 md:min-w-9"
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
                  <div className="flex min-w-0 max-w-[min(100vw-2rem,28rem)] flex-row flex-nowrap items-center gap-1 overflow-x-auto overflow-y-visible scroll-smooth px-0.5 py-2 [touch-action:pan-x] scrollbar-hide sm:max-w-none sm:gap-2">
                <LanguageSwitcher buttonClassName={languageButtonClass} />
                {lobbyMoneyAndProfile}
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

      <DailyLoginModal
        open={showDailyLogin && Boolean(showTopBar)}
        onClose={() => {
          playSfx("modalClose");
          setShowDailyLogin(false);
          // Le serveur a peut-être marqué la récompense comme prise.
          fetchDailyLoginStatus().then((s) => {
            setDailyLoginAvailable(Boolean(s && !s.claimedToday));
          });
        }}
        onClaimed={(newBalance) => {
          if (typeof newBalance === "number" && Number.isFinite(newBalance)) {
            updateUserBalance(newBalance);
          }
          setBalance(newBalance);
          setDailyLoginAvailable(false);
          playSfx("success");
        }}
      />

      {/* Modal Ajouter des jetons */}
      {showTopBar && showAddMoney && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={closeAddMoney}>
          <div
            className={`relative ${addMoneyModalHeightClass} max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-hidden rounded-3xl border border-amber-300/20 bg-[#070b12] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.62),0_0_24px_rgba(245,158,11,0.08)] transition-[height] duration-300 ease-out`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(245,158,11,0.11),transparent_36%),radial-gradient(circle_at_100%_35%,rgba(30,64,175,0.13),transparent_42%),linear-gradient(160deg,rgba(8,13,24,0.98)_0%,rgba(3,7,18,0.98)_58%,rgba(11,10,8,0.98)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/45 to-transparent" />
            <div className="relative z-10 flex h-full min-h-0 flex-col">
            <div className="flex shrink-0 items-center justify-between mb-4">
              <h3
                className={`text-xl font-bold ${
                  balanceModalTab === "withdraw" ? "text-emerald-100" : "text-amber-100"
                }`}
              >
                {balanceModalTab === "withdraw"
                  ? t("lobby.withdrawTitle")
                  : t("lobby.addMoneyTitle")}
              </h3>
              <button
                type="button"
                onClick={closeAddMoney}
                className={`p-1 transition ${
                  balanceModalTab === "withdraw"
                    ? "text-emerald-100/55 hover:text-emerald-50"
                    : "text-amber-100/55 hover:text-amber-50"
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-5 flex shrink-0 items-center gap-2 rounded-full border border-amber-400/16 bg-slate-950/42 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={() => setBalanceModalTab("topup")}
                className={`min-h-[2.75rem] flex-1 rounded-full border px-4 py-2 text-sm font-bold tracking-wide transition ${
                  balanceModalTab === "topup"
                    ? "border-amber-200/55 bg-amber-400/14 text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-amber-200/20"
                    : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-amber-300/24 hover:text-amber-100"
                }`}
              >
                {t("lobby.balanceTabTopUp")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceModalTab("withdraw");
                  setWithdrawSuccess(false);
                }}
                className={`min-h-[2.75rem] flex-1 rounded-full border px-4 py-2 text-sm font-bold tracking-wide transition ${
                  balanceModalTab === "withdraw"
                    ? "border-emerald-200/55 bg-emerald-400/12 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.22),inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-emerald-200/20"
                    : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-emerald-300/24 hover:text-emerald-100"
                }`}
              >
                {t("lobby.balanceTabWithdraw")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceModalTab("codes");
                  void loadGiftCodes();
                }}
                aria-label={t("lobby.balanceTabGiftAria")}
                title={t("lobby.balanceTabGiftAria")}
                className={`group relative flex min-h-[2.75rem] w-14 shrink-0 items-center justify-center rounded-full border px-3 py-2 transition ${
                  balanceModalTab === "codes"
                    ? "border-amber-200/55 bg-amber-400/14 text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-amber-200/20"
                    : "border-white/8 bg-black/10 text-slate-400 hover:border-amber-300/24 hover:text-slate-100"
                }`}
              >
                <Gift className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => {
                  setBalanceModalTab("history");
                  void loadBalanceHistory();
                }}
                aria-label={t("lobby.balanceTabHistoryAria")}
                title={t("lobby.balanceTabHistoryAria")}
                className={`group relative flex min-h-[2.75rem] w-14 shrink-0 items-center justify-center rounded-full border px-3 py-2 transition ${
                  balanceModalTab === "history"
                    ? "border-amber-200/55 bg-amber-400/14 text-amber-100 shadow-[0_0_22px_rgba(245,158,11,0.24),inset_0_1px_0_rgba(255,255,255,0.10)] ring-1 ring-amber-200/20"
                    : "border-white/8 bg-black/10 text-slate-400 hover:border-amber-300/24 hover:text-slate-100"
                }`}
              >
                <History className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <CustomScrollArea className="min-h-0 flex-1 pr-1" contentClassName="pr-3">
            {balanceModalTab === "history" ? (
              <>
                {historyLoading ? (
                  <p className="text-slate-300 text-center py-4">{t("common.loading")}</p>
                ) : null}
                {historyError ? <p className="text-rose-300 text-sm text-center py-3">{historyError}</p> : null}
                {!historyLoading && !historyError ? (
                  <div className="space-y-2">
                    {historyEntries.length === 0 ? (
                      <p className="text-amber-100/45 text-center py-6">{t("lobby.balanceHistoryEmpty")}</p>
                    ) : (
                      historyEntries.map((entry) => {
                        const before = typeof entry.balanceBefore === "number" ? entry.balanceBefore : null;
                        const after = typeof entry.balanceAfter === "number" ? entry.balanceAfter : null;
                        const delta = before !== null && after !== null ? after - before : entry.amount;
                        return (
                          <div key={entry.id} className="rounded-xl border border-amber-300/12 bg-slate-950/34 px-3 py-2">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                                  {entry.reason.startsWith("GIFT_CODE_") ? (
                                    <Gift className="h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                                  ) : null}
                                  <span>{reasonLabel(entry.reason)}</span>
                                </p>
                                <p className="text-xs text-slate-400">
                                  {new Intl.DateTimeFormat(i18n.language, {
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
                              {t("lobby.balanceHistoryBeforeAfter", {
                                before: before !== null ? before.toLocaleString() : "—",
                                after: after !== null ? after.toLocaleString() : "—",
                              })}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : null}
              </>
            ) : balanceModalTab === "codes" ? (
              <div className="space-y-4">
                <div>
                  <p className="mb-3 flex items-center gap-2 text-sm text-slate-300">
                    <Gift className="h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                    {t("lobby.giftCodesAvailable")}
                  </p>
                  {codesLoading ? (
                    <div className="text-center py-8 text-slate-400">{t("common.loading")}</div>
                  ) : giftCodes.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {giftCodes.map((code) => (
                        <div
                          key={code.id}
                          className="bg-slate-800/40 border border-amber-300/16 rounded-lg p-3 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-mono text-amber-300 font-bold text-sm">{code.code}</p>
                            {code.description && (
                              <p className="text-xs text-slate-400">{code.description}</p>
                            )}
                            {code.expiresAt && (
                              <p className="text-xs text-rose-400 mt-1">
                                {t("lobby.giftCodeExpires")}{" "}
                                {new Date(code.expiresAt).toLocaleDateString(i18n.language)}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-amber-300 font-bold flex items-center gap-1 text-sm">
                              <ChipIcon className="w-4 h-4" />
                              +{code.amount}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-center py-4">{t("lobby.giftCodesNone")}</p>
                  )}
                </div>

                <div>
                  <p className="text-slate-300 text-sm mb-2">{t("lobby.giftCodeEnterLabel")}</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === "Enter" && handleValidateCode()}
                      placeholder={t("lobby.giftCodeInputPlaceholder")}
                      className="flex-1 bg-slate-950/40 border border-white/10 rounded-lg px-3 py-2 text-slate-50 placeholder-slate-500 focus:outline-none focus:border-amber-300/55 focus:ring-1 focus:ring-amber-300/35"
                      disabled={codesLoading}
                    />
                    <button
                      onClick={handleValidateCode}
                      disabled={codesLoading || !codeInput.trim()}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("lobby.validate")}
                    </button>
                  </div>
                </div>

                {codesError && (
                  <div className="bg-rose-900/30 border border-rose-700/50 rounded-lg p-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-300">{codesError}</p>
                  </div>
                )}

                {codesSuccess && (
                  <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-3">
                    <p className="text-xs text-emerald-300">{codesSuccess}</p>
                  </div>
                )}
              </div>
            ) : balanceModalTab === "withdraw" ? (
              (() => {
                const ibanCheck = validateIban(withdrawIban);
                const amountValid =
                  withdrawAmount != null &&
                  Number.isFinite(withdrawAmount) &&
                  withdrawAmount >= WITHDRAW_MIN_AMOUNT;
                const amountExceedsBalance =
                  withdrawAmount != null && withdrawAmount > balance;
                const holderValid = withdrawHolder.trim().length >= 2;
                const canSubmitWithdraw =
                  !withdrawSubmitting &&
                  amountValid &&
                  !amountExceedsBalance &&
                  ibanCheck.ok &&
                  holderValid;

                const ibanMessageKey: string | null =
                  withdrawIban.length === 0
                    ? null
                    : ibanCheck.ok
                      ? "lobby.withdrawIbanValid"
                      : ibanCheck.code === "tooShort"
                        ? "lobby.withdrawIbanTooShort"
                        : ibanCheck.code === "tooLong"
                          ? "lobby.withdrawIbanTooLong"
                          : ibanCheck.code === "wrongLength"
                            ? "lobby.withdrawIbanWrongLength"
                            : ibanCheck.code === "invalidChars"
                              ? "lobby.withdrawIbanInvalidChars"
                              : ibanCheck.code === "unknownCountry"
                                ? "lobby.withdrawIbanUnknownCountry"
                                : "lobby.withdrawIbanInvalidChecksum";

                if (withdrawSuccess) {
                  const successChips = withdrawCompletedAmount ?? withdrawAmount ?? 0;
                  const successEur = chipsToEur(successChips);
                  return (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <CheckCircle2 className="h-12 w-12 text-emerald-300" aria-hidden />
                      <p className="text-emerald-200 font-semibold">
                        {t("lobby.withdrawSuccessTitle")}
                      </p>
                      <p className="max-w-xs text-sm text-slate-300">
                        {t("lobby.withdrawSuccessBody", {
                          amount: successChips.toLocaleString(),
                          eur: formatEur(successEur, i18n.language),
                          iban: formatIban(withdrawIban),
                        })}
                      </p>
                    </div>
                  );
                }

                const eurEquivalent = chipsToEur(withdrawAmount ?? 0);
                return (
                  <div className="space-y-3">
                    {/* Montant */}
                    <div>
                      <div className="mb-1.5 flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {t("lobby.withdrawAmountLabel")}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {t("lobby.withdrawRateHint", {
                            chips: 10,
                            eur: formatEur(10 * WITHDRAW_EUR_PER_CHIP, i18n.language),
                          })}
                        </p>
                      </div>
                      <div className="mb-2 grid grid-cols-5 gap-1.5 sm:gap-2">
                        {WITHDRAW_PRESETS.map((amount) => {
                          const disabled = amount > balance;
                          return (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setWithdrawAmount(amount)}
                              disabled={disabled}
                              className={`rounded-full border px-1.5 py-2 text-xs font-bold tabular-nums transition sm:px-3 sm:text-sm ${
                                withdrawAmount === amount
                                  ? "border-emerald-200/60 bg-emerald-400/15 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.16)]"
                                  : disabled
                                    ? "cursor-not-allowed border-white/5 bg-white/[0.02] text-slate-600"
                                    : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-emerald-300/28 hover:text-emerald-100"
                              }`}
                            >
                              {amount.toLocaleString()}
                            </button>
                          );
                        })}
                      </div>
                      {(() => {
                        const wInvalid =
                          withdrawAmount != null &&
                          (withdrawAmount < WITHDRAW_MIN_AMOUNT || withdrawAmount > balance);
                        return (
                          <input
                            type="number"
                            inputMode="numeric"
                            min={WITHDRAW_MIN_AMOUNT}
                            max={balance}
                            step={50}
                            value={withdrawAmount ?? ""}
                            onFocus={(e) => {
                              if (e.currentTarget.value === "0") e.currentTarget.select();
                            }}
                            onChange={(e) => {
                              /* Saisie libre : on stocke la valeur brute sans clamp pour
                               * que l'utilisateur puisse, p. ex., taper "1" -> "10" -> "100".
                               * La validation visuelle + le bouton "Retirer" lock la chose. */
                              const raw = e.target.value === "" ? null : Number(e.target.value);
                              setWithdrawAmount(
                                raw == null || !Number.isFinite(raw) ? null : Math.floor(raw),
                              );
                            }}
                            placeholder={t("lobby.withdrawAmountPlaceholder", {
                              min: WITHDRAW_MIN_AMOUNT,
                            })}
                            className={`w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-50 placeholder-slate-500 focus:outline-none focus:border-emerald-300/55 focus:ring-1 focus:ring-emerald-300/35 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${wInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                            aria-label={t("lobby.withdrawAmountLabel")}
                            aria-invalid={wInvalid}
                          />
                        );
                      })()}
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500">
                          {t("lobby.withdrawAvailableBalance", {
                            amount: balance.toLocaleString(),
                          })}
                        </span>
                        {withdrawAmount != null && withdrawAmount > 0 && (
                          <span className="font-semibold tabular-nums text-emerald-200">
                            ≈ {formatEur(eurEquivalent, i18n.language)}
                          </span>
                        )}
                      </div>
                      {amountExceedsBalance && (
                        <p className="mt-1 text-[11px] text-rose-300">
                          {t("lobby.withdrawAmountExceedsBalance")}
                        </p>
                      )}
                      {!amountExceedsBalance &&
                        withdrawAmount != null &&
                        !amountValid && (
                          <p className="mt-1 text-[11px] text-rose-300">
                            {t("lobby.withdrawMinAmount", {
                              min: WITHDRAW_MIN_AMOUNT,
                            })}
                          </p>
                        )}
                    </div>

                    {/* Titulaire */}
                    <div>
                      <label
                        htmlFor="withdraw-holder"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {t("lobby.withdrawHolderLabel")}
                      </label>
                      <input
                        id="withdraw-holder"
                        type="text"
                        autoComplete="name"
                        maxLength={80}
                        value={withdrawHolder}
                        onChange={(e) => setWithdrawHolder(e.target.value)}
                        placeholder={t("lobby.withdrawHolderPlaceholder")}
                        className="w-full rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-slate-50 placeholder-slate-500 focus:outline-none focus:border-emerald-300/55 focus:ring-1 focus:ring-emerald-300/35"
                      />
                    </div>

                    {/* IBAN */}
                    <div>
                      <label
                        htmlFor="withdraw-iban"
                        className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
                      >
                        {t("lobby.withdrawIbanLabel")}
                      </label>
                      <input
                        id="withdraw-iban"
                        type="text"
                        autoComplete="off"
                        spellCheck={false}
                        inputMode="text"
                        value={formatIban(withdrawIban)}
                        onChange={(e) => setWithdrawIban(normalizeIban(e.target.value))}
                        placeholder="FR76 1234 5678 9012 3456 7890 123"
                        aria-invalid={withdrawIban.length > 0 && !ibanCheck.ok}
                        className={`w-full rounded-lg border bg-slate-950/40 px-3 py-2 font-mono text-sm uppercase tracking-wider text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-1 ${
                          withdrawIban.length === 0
                            ? "border-white/10 focus:border-emerald-300/55 focus:ring-emerald-300/35"
                            : ibanCheck.ok
                              ? "border-emerald-400/55 focus:border-emerald-300/70 focus:ring-emerald-300/40"
                              : "border-rose-500/55 focus:border-rose-400/70 focus:ring-rose-400/30"
                        }`}
                      />
                      {ibanMessageKey && (
                        <p
                          className={`mt-1 flex items-center gap-1.5 text-xs ${
                            ibanCheck.ok ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {ibanCheck.ok ? (
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                          ) : (
                            <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                          )}
                          <span>
                            {t(ibanMessageKey, {
                              country: ibanCheck.country ?? "",
                            })}
                          </span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => void submitWithdrawal()}
                      disabled={!canSubmitWithdraw}
                      className="w-full rounded-full border border-emerald-200/35 bg-emerald-400/14 py-2 font-bold text-emerald-100 transition hover:bg-emerald-400/22 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-800/60 disabled:text-slate-500"
                    >
                      {withdrawSubmitting ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t("lobby.withdrawSubmitting")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <Banknote className="h-4 w-4" aria-hidden />
                          {t("lobby.withdrawConfirm")}
                          {withdrawAmount != null && withdrawAmount > 0 && (
                            <span className="font-normal text-emerald-200/85">
                              · {formatEur(eurEquivalent, i18n.language)}
                            </span>
                          )}
                        </span>
                      )}
                    </button>

                    {withdrawError && (
                      <p className="flex items-center gap-1.5 text-xs text-rose-300">
                        <AlertCircle className="h-3.5 w-3.5" aria-hidden />
                        <span>
                          {t("lobby.withdrawErrorPrefix")} {withdrawError}
                        </span>
                      </p>
                    )}

                    <p className="text-[11px] leading-relaxed text-slate-500">
                      {t("lobby.withdrawDisclaimer")}
                    </p>
                  </div>
                );
              })()
            ) : addSuccess ? (
              <p className="text-emerald-300 font-medium text-center py-4">{t("lobby.captchaSuccess")}</p>
            ) : (
              <>
                <p className="text-slate-300 text-sm mb-3">{t("lobby.chooseAmount")}</p>
                <div className="mb-4 grid grid-cols-5 gap-1.5 sm:gap-2">
                  {ADD_MONEY_PRESETS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setAddMoneyAmount(amount)}
                      className={`rounded-full border px-1.5 py-2 text-xs font-bold tabular-nums transition sm:px-3 sm:text-sm ${
                        addMoneyAmount === amount
                          ? "border-amber-200/60 bg-amber-400/15 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.14)]"
                          : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-amber-300/28 hover:text-amber-100"
                      }`}
                    >
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>
                {addMoneyAmount != null && (
                  <div className="space-y-3">
                    <FakeCardTopUpFields
                      addMoneyAmount={addMoneyAmount}
                      promoCode={promoCode}
                      setPromoCode={(code) => {
                        setPromoCode(code);
                        void validatePaymentPromo(code);
                      }}
                      promoDiscount={promoDiscount}
                      promoFreeCheckout={freeCheckoutPromo}
                      isPromoValidating={promoValidating}
                      cardName={cardName}
                      setCardName={setCardName}
                      cardDigits={cardDigits}
                      setCardDigits={setCardDigits}
                      cardExpiry={cardExpiry}
                      setCardExpiry={setCardExpiry}
                      cardCvv={cardCvv}
                      setCardCvv={setCardCvv}
                    />
                    <button
                      type="button"
                      onClick={() => void submitAddMoney()}
                      disabled={!canSubmitTopUp}
                      className="w-full rounded-full border border-amber-200/35 bg-amber-400/16 py-2 font-bold text-amber-100 transition hover:bg-amber-400/24 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-800/60 disabled:text-slate-500"
                    >
                      {t("lobby.confirmTopUp")}
                    </button>
                  </div>
                )}
              </>
            )}
            </CustomScrollArea>
          </div>
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
        <div className="fixed right-5 top-[calc(1.25rem+env(safe-area-inset-top,0px))] z-[9999] max-w-sm w-[calc(100%-2rem)] sm:w-full">
          {notification.kind === "friend_request" ? (
            <div className="bg-slate-900/95 border border-emerald-500/70 shadow-2xl rounded-2xl px-4 py-4 backdrop-blur-md animate-in slide-in-from-right-5 duration-300">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-600/25 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-emerald-300" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-sm mb-2">
                    {t("toast.friendRequestFrom", { username: notification.senderUsername })}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={respondingFriendRequest}
                      onClick={async () => {
                        playSfx("uiSelect");
                        try {
                          await respondFriendRequest({
                            requestId: notification.requestId,
                            status: "ACCEPTED",
                          }).unwrap();
                        } catch {
                          /* RTK Query invalide les tags : la cloche se resynchronise */
                        }
                        setNotification(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      {t("notifications.acceptFriend")}
                    </button>
                    <button
                      type="button"
                      disabled={respondingFriendRequest}
                      onClick={async () => {
                        playSfx("uiSelect");
                        try {
                          await respondFriendRequest({
                            requestId: notification.requestId,
                            status: "REJECTED",
                          }).unwrap();
                        } catch {
                          /* idem */
                        }
                        setNotification(null);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X className="h-4 w-4" aria-hidden />
                      {t("notifications.rejectFriend")}
                    </button>
                  </div>

                  <button
                    type="button"
                    className="mt-2 text-left text-emerald-400/95 text-xs font-medium hover:text-emerald-300"
                    onClick={() => {
                      playSfx("uiSelect");
                      navigate('/friends?tab=requests');
                      setNotification(null);
                    }}
                  >
                    {t("notifications.viewRequests")} →
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
          ) : notification.kind === "friend_message" ? (
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
        className={`w-full min-w-0 overflow-x-clip overflow-y-visible ${
          isCasinoFullBleed
            ? "box-border flex min-h-0 flex-1 flex-col overflow-hidden pt-[env(safe-area-inset-top,0px)] [&>*:last-child]:flex [&>*:last-child]:min-h-0 [&>*:last-child]:flex-1 [&>*:last-child]:flex-col"
            : lobbyDocumentScroll
              ? "w-full min-w-0"
              : "min-h-0 flex-1"
        }`}
      >
        {isCasinoFullBleed ? (
          children
        ) : lobbyDocumentScroll ? (
          <div className={`w-full min-w-0 ${topPadDocScroll}`}>{children}</div>
        ) : (
          <div
            data-native-scrollbar="true"
            className={`app-main-scroll h-full min-h-0 w-full min-w-0 overflow-x-hidden overflow-y-auto ${topPadMainScroll}`}
          >
            {children}
          </div>
        )}
      </div>
      </TopBarProvider>
    </div>
  );
}
