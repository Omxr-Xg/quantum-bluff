import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Coins,
  Home,
  Loader2,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  ShieldBan,
  Flag,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  Unlock,
  X,
} from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { useNumberFieldInput, NUMBER_FIELD_INVALID_CLASS } from "../hooks/useNumberFieldInput";
import { useToast } from "../contexts/ToastContext";
import { useTopBar } from "../contexts/TopBarContext";

import {
  useGetFriendsQuery,
  useGetFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useRespondToFriendRequestMutation,
  useGetFriendMessagesQuery,
  useSendFriendMessageMutation,
  useCreateFriendLoanRequestMutation,
  useRemoveFriendMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetBlockedUsersQuery,
  useReportPlayerMutation,
} from "../services/api";
import { FriendLoansPanel } from "../components/FriendLoansPanel";
import {
  ALLOWED_LOAN_REPAYMENT_RATES,
  previewTotalDue,
  interestPercentForRepaymentRate,
} from "../utils/friendLoanPreview";
import { getFriendLoanApiErrorMessage } from "../utils/friendLoanApiError";
import { censorChatLinks, isChatContentEffectivelyEmpty } from "../utils/chatLinkCensor";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import {
  notifyFriendChatReplied,
  setActiveFriendChat,
} from "../utils/activeFriendChat";

type FriendsTab = "friends" | "messages" | "loans" | "blocked";
type FriendStatusFilter = "all" | "online" | "offline";
type FriendSort = "recent" | "oldest" | "alpha";
type RequestSort = "recent" | "oldest" | "alpha";
type ReportReason = "INAPPROPRIATE_LANGUAGE" | "CHEATING" | "HARASSMENT" | "SPAM" | "OTHER";

const pokerGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const pokerInnerCard =
  "rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md";
const pokerButton =
  "rounded-full border border-blue-300/15 bg-blue-950/75 font-semibold text-white shadow-lg shadow-black/20 transition hover:border-blue-200/25 hover:bg-blue-900/80";
const pokerMutedButton =
  "rounded-full border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";
const pokerDiscreetAction =
  "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-white/[0.04] hover:text-slate-300";
const pokerInput =
  "rounded-xl border border-white/10 bg-slate-950/55 text-white placeholder-slate-500 transition-all focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/25";

type SortDropdownProps = {
  ariaLabel: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
};

function SortDropdown({ ariaLabel, value, options, onChange }: SortDropdownProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((option) => option.value === value)?.label ?? t("friends.sort");

  return (
    <div
      className="relative shrink-0"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 min-w-[10.5rem] items-center justify-between gap-3 rounded-full border border-white/10 bg-slate-950/55 px-3.5 text-sm font-bold text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-blue-200/25 hover:bg-slate-900/70"
        aria-label={ariaLabel}
        aria-expanded={open}
      >
        <span className="flex min-w-0 items-center gap-2">
          <ArrowUpDown className="h-4 w-4 shrink-0 text-blue-200" />
          <span className="shrink-0">{t("friends.sort")}</span>
          <span className="hidden max-w-[8rem] truncate text-xs font-semibold text-slate-400 sm:block">
            {selectedLabel}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-950/95 p-2 shadow-[0_22px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                value === option.value
                  ? "bg-blue-500/20 text-blue-50"
                  : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
              }`}
            >
              <span>{option.label}</span>
              {value === option.value ? <Check className="h-4 w-4 text-blue-200" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Friends() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useUser();
  const { socket, isConnected, connect } = useSocket();
  const { addToast } = useToast();
  const { menuContent } = useTopBar();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchResults, setSearchResults] = useState<{ id?: string; username?: string }[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState<FriendsTab>("friends");
  const [friendStatusFilter, setFriendStatusFilter] = useState<FriendStatusFilter>("all");
  const [friendSort, setFriendSort] = useState<FriendSort>("recent");
  const [requestSort, setRequestSort] = useState<RequestSort>("recent");
  const [confirmAction, setConfirmAction] = useState<
    | { kind: "remove"; id: string; username: string }
    | { kind: "block"; id: string; username: string }
    | null
  >(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; username: string } | null>(null);
  const [reportReason, setReportReason] = useState<ReportReason>("INAPPROPRIATE_LANGUAGE");
  const [reportDetail, setReportDetail] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get("tab");
    const withUserId = searchParams.get("with");
    if (tab === "requests") {
      setActiveTab("friends");
    } else if (tab === "messages") {
      setActiveTab("messages");
      if (withUserId) setSelectedChat(withUserId);
      else setSelectedChat(null);
    }
  }, [searchParams]);

  /* Publie au monde la conversation actuellement ouverte : Layout / NotificationCenter
   * s'en servent pour décider de NE PAS pousser une notif si le sender = celui qu'on
   * regarde. Reset au unmount = pas de chat actif (l'utilisateur n'est plus sur Friends). */
  useEffect(() => {
    setActiveFriendChat(selectedChat);
    return () => setActiveFriendChat(null);
  }, [selectedChat]);

  const [loanModal, setLoanModal] = useState<{ id: string; username: string } | null>(null);
  const [loanAmount, setLoanAmount] = useState(500);
  const loanAmountField = useNumberFieldInput({
    value: loanAmount,
    onChange: setLoanAmount,
    min: 100,
    max: 1_000_000,
  });
  const [loanRate, setLoanRate] = useState<number>(30);

  const [createLoanRequest, { isLoading: creatingLoan }] = useCreateFriendLoanRequestMutation();

  const {
    data: friends,
    refetch: refetchFriends,
    isLoading: loadingFriends,
    isFetching: fetchingFriends
  } = useGetFriendsQuery(userId!, {
    skip: !userId
  });

  const {
    data: requests,
    refetch: refetchRequests,
    isLoading: loadingRequests,
    isFetching: fetchingRequests 
  } = useGetFriendRequestsQuery(userId!, {
    skip: !userId
  });

  const {
    data: blockedUsers = [],
    refetch: refetchBlockedUsers,
    isLoading: loadingBlockedUsers,
  } = useGetBlockedUsersQuery(undefined, {
    skip: !userId,
  });

  const [sendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [respondRequest] = useRespondToFriendRequestMutation();
  const [removeFriend, { isLoading: removingFriend }] = useRemoveFriendMutation();
  const [blockUser, { isLoading: blockingUser }] = useBlockUserMutation();
  const [unblockUser, { isLoading: unblockingUser }] = useUnblockUserMutation();
  const [reportPlayer, { isLoading: reportingPlayer }] = useReportPlayerMutation();

  const { data: searchData, isLoading: searching } = useSearchUsersQuery(friendUsername, {
    skip: friendUsername.trim().length < 2 || !showAddFriend
  });

  const filteredFriends = (friends ?? [])
    .filter((friend) => {
      const matchesSearch = friend.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        friendStatusFilter === "all" ||
        (friendStatusFilter === "online" ? friend.isOnline : !friend.isOnline);
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (friendSort === "alpha") {
        return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
      }
      const aTime = a.friendshipCreatedAt ? new Date(a.friendshipCreatedAt).getTime() : 0;
      const bTime = b.friendshipCreatedAt ? new Date(b.friendshipCreatedAt).getTime() : 0;
      return friendSort === "recent" ? bTime - aTime : aTime - bTime;
    });
  const sortedRequests = (requests ?? []).slice().sort((a, b) => {
    if (requestSort === "alpha") {
      return a.sender.username.localeCompare(b.sender.username, undefined, { sensitivity: "base" });
    }
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return requestSort === "recent" ? bTime - aTime : aTime - bTime;
  });
  const friendsCount = friends?.length ?? 0;
  const onlineFriendsCount = friends?.filter((friend) => friend.isOnline).length ?? 0;
  const offlineFriendsCount = Math.max(0, friendsCount - onlineFriendsCount);
  const requestsCount = requests?.length ?? 0;
  const tabItems = [
    { key: "friends" as const, label: t("friends.tabFriends"), Icon: Users },
    { key: "messages" as const, label: t("friends.tabMessages"), Icon: MessageCircle },
    { key: "loans" as const, label: t("friends.tabLoans"), Icon: Coins },
    { key: "blocked" as const, label: t("friends.tabBlocked"), Icon: ShieldBan },
  ];

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (!userId || !isConnected) return;
    const token = getAuthItem("token");
    if (!token) return;
    void fetch(apiUrl("/api/friends/inbox-seen"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => {
      if (r.ok) {
        window.dispatchEvent(new CustomEvent("friends-inbox-cleared"));
      }
    });
  }, [userId, isConnected]);

  useEffect(() => {
    if (!showAddFriend) return;

    if (friendUsername.trim().length < 2) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    if (searching) return;

    if (searchData && searchData.length > 0) {
      setSearchResults(searchData);
      setSearchError("");
    } else {
      setSearchResults([]);
      setSearchError(t('friends.noUserFound'));
    }
  }, [friendUsername, searchData, searching, showAddFriend, t]);

  useEffect(() => {
    const handleRefetchRequests = () => {
      refetchRequests();
    };

    const handleRefetchFriends = () => {
      refetchFriends();
    };

    window.addEventListener("refetch-requests", handleRefetchRequests);
    window.addEventListener("refetch-friends", handleRefetchFriends);

    return () => {
      window.removeEventListener("refetch-requests", handleRefetchRequests);
      window.removeEventListener("refetch-friends", handleRefetchFriends);
    };
  }, [refetchRequests, refetchFriends]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleFriendRequestReceived = () => {
      refetchRequests();
    };

    const handleFriendRequestAccepted = () => {
      refetchFriends();
      refetchRequests();
    };

    const handleFriendListUpdated = () => {
      refetchFriends();
      refetchRequests();
    };

    const handleFriendStatusChanged = () => {
      refetchFriends();
    };

    socket.on("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
    socket.on("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
    socket.on("FRIEND_LIST_UPDATED", handleFriendListUpdated);
    socket.on("FRIEND_STATUS_CHANGED", handleFriendStatusChanged);

    return () => {
      socket.off("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
      socket.off("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
      socket.off("FRIEND_LIST_UPDATED", handleFriendListUpdated);
      socket.off("FRIEND_STATUS_CHANGED", handleFriendStatusChanged);
    };
  }, [socket, userId, refetchFriends, refetchRequests]);

  const handleSearchUser = () => {
    if (!friendUsername.trim() || friendUsername.trim().length < 2) {
      setSearchError(t('friends.minChars'));
      setSearchResults([]);
      return;
    }

    if (searchData && searchData.length > 0) {
      setSearchResults(searchData);
      setSearchError("");
    } else if (!searching) {
      setSearchResults([]);
      setSearchError(t('friends.noUserFound'));
    }
  };

  const handleSendRequest = async (username: string) => {
    if (!userId) return;

    try {
      await sendRequest({ senderId: userId, receiverUsername: username }).unwrap();
      setSearchSuccess(true);
      setSearchResults([]);
      setFriendUsername("");
      setSearchError("");

      setTimeout(() => {
        setSearchSuccess(false);
        setShowAddFriend(false);
      }, 2000);
    } catch (err: unknown) {
      const message = (err as { data?: { error?: string } })?.data?.error || t('friends.sendRequestError');
      setSearchError(message);
    }
  };

  const handleRespond = async (requestId: string, status: "ACCEPTED" | "REJECTED") => {
    try {
      await respondRequest({ requestId, status }).unwrap();
      await refetchFriends();
      await refetchRequests();
    } catch (err) {
      console.error("Erreur:", err);
    }
  };

  const runConfirmedFriendAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.kind === "remove") {
        await removeFriend(confirmAction.id).unwrap();
        addToast(t("friends.removeSuccess", { username: confirmAction.username }), "success");
      } else {
        await blockUser(confirmAction.id).unwrap();
        addToast(t("friends.blockSuccess", { username: confirmAction.username }), "success");
        await refetchBlockedUsers();
      }
      if (selectedChat === confirmAction.id) closeChat();
      setConfirmAction(null);
      await refetchFriends();
      await refetchRequests();
    } catch (err: unknown) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ||
        (confirmAction.kind === "remove" ? t("friends.removeError") : t("friends.blockError"));
      addToast(message, "error");
    }
  };

  const handleUnblock = async (blockedUserId: string, username: string) => {
    try {
      await unblockUser(blockedUserId).unwrap();
      addToast(t("friends.unblockSuccess", { username }), "success");
      await refetchBlockedUsers();
    } catch (err: unknown) {
      addToast((err as { data?: { error?: string } })?.data?.error || t("friends.unblockError"), "error");
    }
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    try {
      await reportPlayer({
        reportedUserId: reportTarget.id,
        reason: reportReason,
        detail: reportDetail.trim() || undefined,
      }).unwrap();
      addToast(t("friends.reportSuccess", { username: reportTarget.username }), "success");
      setReportTarget(null);
      setReportReason("INAPPROPRIATE_LANGUAGE");
      setReportDetail("");
    } catch (err: unknown) {
      addToast((err as { data?: { error?: string } })?.data?.error || t("friends.reportError"), "error");
    }
  };

  const openChat = (friendId: string) => {
    setSelectedChat(friendId);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", "messages");
        next.set("with", friendId);
        return next;
      },
      { replace: true },
    );
  };

  const closeChat = () => {
    setSelectedChat(null);
    setMessageInput("");
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("with");
        return next;
      },
      { replace: true },
    );
  };

  const selectedFriend = friends?.find((f) => f.id === selectedChat);

  const {
    data: messages = [],
    error: messagesError,
    refetch: refetchMessages
  } = useGetFriendMessagesQuery(
    { userId: userId!, friendId: selectedChat! },
    { skip: !userId || !selectedChat }
  );

  const [sendMessage, { isLoading: sendingMessage }] = useSendFriendMessageMutation();

  useEffect(() => {
    if (!messagesError || !addToast) return;
    const e = messagesError as { data?: { error?: string } | string; status?: number };
    const serverMsg = typeof e?.data === 'object' && e?.data?.error ? e.data.error : null;
    const msg =
      serverMsg === "MESSAGE_LINKS_NOT_ALLOWED"
        ? t("friends.messageLinksNotAllowed")
        : serverMsg ?? (e?.status === 403 ? t("friends.chatOnlyWithFriends") : t("friends.sendMessageError"));
    addToast(msg, 'error');
  }, [messagesError, addToast, t]);

  useEffect(() => {
    if (!socket || !userId || !selectedChat) return;

    const handleFriendMessage = (data: { senderId: string; receiverId: string }) => {
      if (userId && data.senderId === userId) return;
      if (
        (data.senderId === selectedChat && data.receiverId === userId) ||
        (data.receiverId === selectedChat && data.senderId === userId)
      ) {
        void refetchMessages();
      }
    };

    socket.on("FRIEND_MESSAGE", handleFriendMessage);
    return () => {
      socket.off("FRIEND_MESSAGE", handleFriendMessage);
    };
  }, [socket, userId, selectedChat, refetchMessages]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const friendId = (ev as CustomEvent<{ friendId: string }>).detail?.friendId;
      if (!friendId || !selectedChat) return;
      if (friendId === selectedChat) void refetchMessages();
    };
    window.addEventListener("refetch-friend-messages", handler);
    return () => window.removeEventListener("refetch-friend-messages", handler);
  }, [selectedChat, refetchMessages]);

  const handleSendMessage = async () => {
    if (!selectedChat || !userId || !messageInput.trim()) return;

    const trimmed = messageInput.trim();
    const censored = censorChatLinks(trimmed);
    if (isChatContentEffectivelyEmpty(censored)) {
      addToast(t("friends.messageLinksNotAllowed"), "error");
      return;
    }

    try {
      await sendMessage({
        receiverId: selectedChat,
        content: censored,
      }).unwrap();
      setMessageInput("");
      /* J'ai répondu : plus besoin de garder une notif/un unread pour ce contact. */
      notifyFriendChatReplied(selectedChat);
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } | string; status?: number };
      const serverMsg = typeof e?.data === 'object' && e?.data?.error ? e.data.error : null;
      const msg =
        serverMsg === "MESSAGE_LINKS_NOT_ALLOWED"
          ? t("friends.messageLinksNotAllowed")
          : serverMsg ?? (e?.status === 403 ? t("friends.chatOnlyWithFriends") : t("friends.sendMessageError"));
      addToast(msg, "error");
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    if (Number.isNaN(date.getTime())) return t("friends.justNow");
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 0) return t("friends.justNow");

    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const lang = i18n.language;

    if (diffHours < 24) {
      return date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
    }
    if (diffDays < 7) return t("friends.daysAgo", { count: diffDays });
    return date.toLocaleDateString(lang);
  };

  return (
    <div className="relative min-h-full w-full overflow-x-hidden bg-[#020716]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_40%,rgba(14,116,144,0.10),transparent_48%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-950/40 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-700/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-950/28 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.26) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.55),transparent_58%)]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl min-w-0 p-3 sm:p-6">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className={`flex w-fit touch-manipulation items-center justify-center gap-2 px-3 py-2 text-sm sm:px-4 ${pokerMutedButton}`}
            >
              <Home className="h-4 w-4" />
              <span>{t("profile.home")}</span>
            </button>
            <div className="min-w-0">
              <h1 className="bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-3xl font-bold text-transparent sm:text-5xl">
                {t("friends.title")}
              </h1>
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3 lg:items-end">
            <div className="min-w-0 overflow-x-auto overflow-y-visible py-1 scrollbar-hide lg:justify-end">
              {menuContent ? menuContent : null}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowAddFriend(true)}
                className={`flex shrink-0 touch-manipulation items-center justify-center gap-2 px-4 py-2 text-sm ${pokerButton}`}
              >
                <UserPlus className="h-4 w-4" />
                {t("friends.addOneFriend")}
              </button>
              <button
                onClick={() => refetchFriends()}
                disabled={fetchingFriends}
                className={`flex shrink-0 items-center justify-center gap-2 px-3.5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${pokerMutedButton}`}
              >
                <RefreshCw className={`h-4 w-4 ${fetchingFriends ? "animate-spin text-blue-300" : ""}`} />
                {fetchingFriends ? t("friends.refreshing") : t("friends.refresh")}
              </button>
            </div>
          </div>
        </header>

        <nav className="mb-5 overflow-x-auto overflow-y-hidden scrollbar-hide" aria-label={t("friends.navAria")}>
          <div className="flex w-max min-w-full items-center gap-1 rounded-full border border-white/10 bg-white/[0.045] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_18px_45px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            {tabItems.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex h-11 min-w-[8rem] flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition-all ${
                  activeTab === key
                    ? "bg-blue-500/25 text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_20px_rgba(59,130,246,0.12)]"
                    : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </nav>

        <main className="min-w-0">

        {activeTab === "friends" && (
          <section className="space-y-5">
            <div className={`p-4 sm:p-5 ${pokerGlassCard}`}>
              <div className={`${loadingRequests || sortedRequests.length > 0 ? "mb-3" : ""} flex flex-col justify-between gap-3 sm:flex-row sm:items-center`}>
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-blue-100 sm:text-lg">
                    <UserPlus className="h-5 w-5 shrink-0 text-blue-200" />
                    {t("friends.friendRequestsCount", { count: requestsCount })}
                    {fetchingRequests && !loadingRequests ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-300/60" />
                    ) : null}
                  </h2>
                  {!loadingRequests && sortedRequests.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-400">{t("friends.noPendingRequests")}</p>
                  ) : null}
                </div>
                {sortedRequests.length > 0 ? (
                  <SortDropdown
                    ariaLabel={t("friends.sortRequestsAria")}
                    value={requestSort}
                    onChange={(value) => setRequestSort(value as RequestSort)}
                    options={[
                      { value: "recent", label: t("friends.sortRecentRequests") },
                      { value: "oldest", label: t("friends.sortOldestRequests") },
                      { value: "alpha", label: t("friends.sortAlphaAZ") },
                    ]}
                  />
                ) : null}
              </div>

              {loadingRequests ? (
                <div className="flex justify-center py-5">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
                </div>
              ) : sortedRequests.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {sortedRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`flex items-center justify-between gap-3 p-3 ${pokerInnerCard}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60">
                          {getPlayerAvatar(req.sender.username, req.sender.id, userId, req.sender.avatarUrl) ? (
                            <ImageWithFallback
                              src={getPlayerAvatar(req.sender.username, req.sender.id, userId, req.sender.avatarUrl)}
                              alt=""
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <span className="font-bold text-white">{req.sender.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                        <span className="truncate font-medium text-white">{req.sender.username}</span>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleRespond(req.id, "ACCEPTED")}
                          className="rounded-full border border-blue-300/25 bg-blue-950/75 p-2 text-white transition hover:bg-blue-900/80"
                          aria-label={t("friends.accept")}
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRespond(req.id, "REJECTED")}
                          className="rounded-full bg-red-600 p-2 text-white transition hover:bg-red-500"
                          aria-label={t("friends.reject")}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("friends.searchFriendPlaceholder")}
                  className="h-12 w-full rounded-full border border-white/10 bg-slate-950/50 py-3 pl-12 pr-4 text-white placeholder-slate-500 transition-all focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                />
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-full border border-white/10 bg-slate-950/45 p-1 md:w-auto md:min-w-[22rem]">
                {[
                  { key: "all" as const, label: t("friends.filterAll"), count: friendsCount },
                  { key: "online" as const, label: t("friends.online"), count: onlineFriendsCount },
                  { key: "offline" as const, label: t("friends.offline"), count: offlineFriendsCount },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setFriendStatusFilter(item.key)}
                    className={`min-w-0 rounded-full px-3 py-2 text-xs font-bold transition sm:text-sm ${
                      friendStatusFilter === item.key
                        ? "bg-blue-500/25 text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_0_20px_rgba(59,130,246,0.12)]"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="ml-1 text-[0.68rem] opacity-80 sm:text-xs">{item.count}</span>
                  </button>
                ))}
              </div>
              <SortDropdown
                ariaLabel={t("friends.sortFriendsAria")}
                value={friendSort}
                onChange={(value) => setFriendSort(value as FriendSort)}
                options={[
                  { value: "recent", label: t("friends.sortAddedRecent") },
                  { value: "oldest", label: t("friends.sortAddedOldest") },
                  { value: "alpha", label: t("friends.sortAlphaAZ") },
                ]}
              />
            </div>

            <div className="min-w-0">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-xl font-bold text-white">{t("friends.tabFriends")}</h2>
                  <p className="text-sm text-slate-400">{t("friends.friendsCount", { count: friendsCount })}</p>
                </div>
                {fetchingFriends && !loadingFriends ? (
                  <div className="flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-950/35 px-3 py-1.5 text-sm text-blue-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("friends.syncing")}
                  </div>
                ) : null}
              </div>

              {loadingFriends ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
                </div>
              ) : filteredFriends.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`group relative overflow-hidden p-4 transition-all hover:border-blue-300/25 ${pokerInnerCard}`}
                    >
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-200/40 to-transparent opacity-0 transition group-hover:opacity-100" />
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 shrink-0">
                          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60 shadow-[0_0_28px_rgba(59,130,246,0.16)]">
                            {getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl) ? (
                              <ImageWithFallback
                                src={getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl)}
                                alt={`${friend.username}'s avatar`}
                                className="h-16 w-16 rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-2xl font-bold text-white">{friend.username.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <span
                            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-slate-950 ${
                              friend.isOnline ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                            aria-label={friend.isOnline ? t("friends.online") : t("friends.offline")}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h3 className="truncate text-xl font-bold text-white">{friend.username}</h3>
                            <span className="shrink-0 rounded-full border border-blue-300/15 bg-blue-950/45 px-2.5 py-1 text-xs font-semibold text-blue-200">
                              {t("friends.level", { level: friend.level })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-slate-400">
                            <Trophy className="h-4 w-4 text-cyan-200/80" />
                            {friend.stats?.wins ?? friend.playerStats?.totalWins ?? 0}{" "}
                            {t("profile.wins")}
                          </div>
                          <div className={`mt-1 text-xs font-semibold ${friend.isOnline ? "text-emerald-300" : "text-slate-500"}`}>
                            {friend.isOnline ? t("friends.online") : t("friends.offline")}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={() => openChat(friend.id)}
                          className={`flex items-center justify-center gap-2 px-4 py-2.5 ${pokerMutedButton}`}
                        >
                          <MessageCircle className="h-4 w-4 shrink-0" />
                          {t("friends.chat")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLoanModal({ id: friend.id, username: friend.username });
                            setLoanAmount(500);
                            setLoanRate(30);
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-950/45 px-4 py-2.5 font-semibold text-cyan-100 transition-all hover:border-cyan-200/35 hover:bg-cyan-900/45"
                        >
                          <Coins className="h-4 w-4 shrink-0" />
                          {t("friends.loans.requestLoan")}
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-end gap-0.5 border-t border-white/[0.06] pt-2">
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ kind: "remove", id: friend.id, username: friend.username })}
                          className={`${pokerDiscreetAction} hover:text-amber-200/75`}
                          title={t("friends.removeFriend")}
                        >
                          <UserMinus className="h-3 w-3 shrink-0 opacity-70" />
                          {t("friends.removeFriend")}
                        </button>
                        <span className="mx-0.5 text-slate-600/80" aria-hidden="true">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfirmAction({ kind: "block", id: friend.id, username: friend.username })}
                          className={`${pokerDiscreetAction} hover:text-red-300/75`}
                          title={t("friends.blockUser")}
                        >
                          <ShieldBan className="h-3 w-3 shrink-0 opacity-70" />
                          {t("friends.blockUser")}
                        </button>
                        <span className="mx-0.5 text-slate-600/80" aria-hidden="true">
                          ·
                        </span>
                        <button
                          type="button"
                          onClick={() => setReportTarget({ id: friend.id, username: friend.username })}
                          className={pokerDiscreetAction}
                          title={t("friends.reportUser")}
                        >
                          <Flag className="h-3 w-3 shrink-0 opacity-70" />
                          {t("friends.reportUser")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-blue-300/20 bg-blue-950/40">
                  <Users className="h-10 w-10 text-slate-500" />
                </div>
                <p className="text-lg text-gray-400">{t("friends.noFriendsFound")}</p>
              </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "messages" && userId && (
          <div className={`p-5 sm:p-6 ${pokerGlassCard}`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-300/20 bg-blue-950/50">
                <MessageCircle className="h-5 w-5 text-blue-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("friends.tabMessages")}</h2>
                <p className="text-sm text-slate-400">{t("friends.friendsCount", { count: friendsCount })}</p>
              </div>
            </div>
            {loadingFriends ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
              </div>
            ) : friends?.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => openChat(friend.id)}
                    className={`group flex items-center justify-between gap-4 p-4 text-left text-white transition hover:border-blue-300/20 ${pokerInnerCard}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60">
                        {getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl) ? (
                          <ImageWithFallback
                            src={getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl)}
                            alt={`${friend.username}'s avatar`}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-white">{friend.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{friend.username}</p>
                        <p className="text-xs text-slate-400">{t("friends.level", { level: friend.level })}</p>
                      </div>
                    </div>
                    <Send className="h-4 w-4 shrink-0 text-blue-200 transition group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">{t("friends.noFriendsFound")}</p>
            )}
          </div>
        )}

        {activeTab === "loans" && userId ? (
          <div className={`p-5 sm:p-6 ${pokerGlassCard}`}>
            <FriendLoansPanel userId={userId} />
          </div>
        ) : null}

        {activeTab === "blocked" && userId ? (
          <div className={`p-5 sm:p-6 ${pokerGlassCard}`}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-red-300/20 bg-red-950/40">
                <ShieldBan className="h-5 w-5 text-red-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("friends.blockedTitle")}</h2>
                <p className="text-sm text-slate-400">{t("friends.blockedSubtitle")}</p>
              </div>
            </div>

            {loadingBlockedUsers ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
              </div>
            ) : blockedUsers.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {blockedUsers.map((entry) => (
                  <div key={entry.id} className={`flex items-center justify-between gap-4 p-4 ${pokerInnerCard}`}>
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-300/25 bg-red-950/45">
                        {getPlayerAvatar(entry.user.username, entry.user.id, userId, entry.user.avatarUrl) ? (
                          <ImageWithFallback
                            src={getPlayerAvatar(entry.user.username, entry.user.id, userId, entry.user.avatarUrl)}
                            alt=""
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-white">{entry.user.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{entry.user.username}</p>
                        <p className="text-xs text-slate-400">{t("friends.blockedAt", { date: new Date(entry.blockedAt).toLocaleDateString(i18n.language) })}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleUnblock(entry.user.id, entry.user.username)}
                      disabled={unblockingUser}
                      className="flex shrink-0 items-center gap-2 rounded-xl border border-blue-300/15 bg-blue-950/75 px-4 py-2.5 font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {unblockingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                      {t("friends.unblock")}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-12 text-center text-slate-400">{t("friends.noBlockedUsers")}</p>
            )}
          </div>
        ) : null}
        </main>
      </div>

      {confirmAction ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 ${pokerGlassCard}`}>
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                confirmAction.kind === "block"
                  ? "border-red-300/25 bg-red-950/45"
                  : "border-amber-300/25 bg-amber-950/45"
              }`}>
                {confirmAction.kind === "block" ? (
                  <ShieldBan className="h-6 w-6 text-red-200" />
                ) : (
                  <UserMinus className="h-6 w-6 text-amber-200" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {confirmAction.kind === "block" ? t("friends.blockConfirmTitle") : t("friends.removeConfirmTitle")}
                </h2>
                <p className="text-sm text-slate-400">
                  {confirmAction.kind === "block"
                    ? t("friends.blockConfirmBody", { username: confirmAction.username })
                    : t("friends.removeConfirmBody", { username: confirmAction.username })}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className={`px-4 py-2.5 ${pokerMutedButton}`}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void runConfirmedFriendAction()}
                disabled={removingFriend || blockingUser}
                className={`flex items-center justify-center gap-2 rounded-full px-4 py-2.5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                  confirmAction.kind === "block"
                    ? "border border-red-300/20 bg-red-700 hover:bg-red-600"
                    : "border border-amber-300/20 bg-amber-700 hover:bg-amber-600"
                }`}
              >
                {removingFriend || blockingUser ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {confirmAction.kind === "block" ? t("friends.blockUser") : t("friends.removeFriend")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reportTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg p-6 ${pokerGlassCard}`}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-red-300/20 bg-red-950/35">
                  <Flag className="h-6 w-6 text-red-200" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-white">
                    {t("friends.reportTitle", { username: reportTarget.username })}
                  </h2>
                  <p className="text-sm text-slate-400">{t("friends.reportSubtitle")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className="rounded-lg border border-white/10 bg-white/[0.06] p-2 text-white hover:bg-white/[0.1]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mb-1.5 block text-sm font-semibold text-slate-300">{t("friends.reportReason")}</label>
            <select
              value={reportReason}
              onChange={(event) => setReportReason(event.target.value as ReportReason)}
              className={`mb-4 w-full px-4 py-3 ${pokerInput}`}
            >
              {(["INAPPROPRIATE_LANGUAGE", "CHEATING", "HARASSMENT", "SPAM", "OTHER"] as ReportReason[]).map((reason) => (
                <option key={reason} value={reason}>
                  {t(`friends.reportReasons.${reason}`)}
                </option>
              ))}
            </select>

            <label className="mb-1.5 block text-sm font-semibold text-slate-300">{t("friends.reportDetail")}</label>
            <textarea
              value={reportDetail}
              onChange={(event) => setReportDetail(event.target.value)}
              maxLength={2000}
              rows={5}
              placeholder={t("friends.reportDetailPlaceholder")}
              className={`mb-4 w-full resize-none px-4 py-3 ${pokerInput}`}
            />

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setReportTarget(null)}
                className={`px-4 py-2.5 ${pokerMutedButton}`}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => void submitReport()}
                disabled={reportingPlayer}
                className="flex items-center justify-center gap-2 rounded-full border border-red-300/20 bg-red-700 px-4 py-2.5 font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {reportingPlayer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                {t("friends.sendReport")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loanModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md p-6 ${pokerGlassCard}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {t("friends.loans.requestLoan")} — {loanModal.username}
              </h2>
              <button
                type="button"
                onClick={() => setLoanModal(null)}
                className="rounded-lg border border-white/10 bg-white/[0.06] p-2 text-white hover:bg-white/[0.1]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <label className="mb-1 block text-sm text-gray-300">{t("friends.loans.amount")}</label>
            <input
              type="number"
              min={100}
              max={1000000}
              value={loanAmountField.inputValue}
              onChange={loanAmountField.handleChange}
              onFocus={loanAmountField.handleFocus}
              onBlur={loanAmountField.handleBlur}
              className={`mb-4 w-full px-4 py-3 ${pokerInput} ${loanAmountField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
              aria-invalid={loanAmountField.isInvalid}
            />
            <label className="mb-1 block text-sm text-gray-300">{t("friends.loans.repaymentRate")}</label>
            <select
              value={loanRate}
              onChange={(e) => setLoanRate(Number(e.target.value))}
              className={`mb-4 w-full px-4 py-3 ${pokerInput}`}
            >
              {ALLOWED_LOAN_REPAYMENT_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
            <div className="mb-4 space-y-1 rounded-xl border border-cyan-300/20 bg-cyan-950/30 p-4 text-sm text-cyan-100">
              <p>
                {t("friends.loans.interestPreview", { rate: interestPercentForRepaymentRate(loanRate) })}
              </p>
              <p>{t("friends.loans.totalDue", { amount: previewTotalDue(loanAmount, loanRate) })}</p>
              <p>
                {t("friends.loans.winExample", {
                  win: 100,
                  slice: Math.floor((100 * loanRate) / 100),
                })}
              </p>
            </div>
            <button
              type="button"
              disabled={creatingLoan || loanAmountField.isInvalid}
              onClick={async () => {
                try {
                  await createLoanRequest({
                    lenderId: loanModal.id,
                    amount: loanAmount,
                    repaymentRate: loanRate,
                  }).unwrap();
                  addToast(t("friends.loans.loanRequestOk"), "success");
                  setLoanModal(null);
                } catch (err) {
                  addToast(getFriendLoanApiErrorMessage(err, t("friends.loans.loanError")), "error");
                }
              }}
              className={`flex w-full items-center justify-center gap-2 py-3 disabled:cursor-not-allowed disabled:opacity-50 ${pokerButton}`}
            >
              {creatingLoan ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {t("friends.loans.sendRequest")}
            </button>
          </div>
        </div>
      ) : null}

      {showAddFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md overflow-hidden ${pokerGlassCard}`}>
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-300/30 bg-blue-950/60">
                  <UserPlus className="h-6 w-6 text-blue-100" />
                </div>
                <h2 className="text-2xl font-bold text-white">{t("friends.addOneFriend")}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddFriend(false);
                  setFriendUsername("");
                  setSearchError("");
                  setSearchSuccess(false);
                  setSearchResults([]);
                }}
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] transition-all hover:bg-white/[0.1]"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <p className="mb-4 text-gray-400">{t("friends.searchPlaceholder")}</p>

              <div className="mb-4">
                <label htmlFor="friendUsername" className="mb-2 block text-sm font-semibold text-gray-300">
                  {t("friends.usernameLabel")}
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="friendUsername"
                    type="text"
                    value={friendUsername}
                    onChange={(e) => {
                      setFriendUsername(e.target.value);
                      setSearchError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                    placeholder={t("friends.playerNamePlaceholder")}
                    className={`w-full py-3 pl-12 pr-4 ${pokerInput}`}
                  />
                </div>
              </div>

              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
                </div>
              )}

              {searchResults.length > 0 && !searching && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold text-white">{t("friends.results")}</h3>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className={`mb-2 flex items-center justify-between p-3 ${pokerInnerCard}`}
                    >
                      <span className="text-white">{user.username}</span>
                      <button
                        type="button"
                        onClick={() => handleSendRequest(user.username!)}
                        disabled={sendingRequest}
                        className="rounded-lg border border-blue-300/20 bg-blue-900/80 px-3 py-1 text-sm text-white hover:bg-blue-800 disabled:opacity-50"
                      >
                        {t("friends.addFriend")}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchError && (
                <p className="mt-2 flex items-center gap-2 text-sm text-red-400">
                  <X className="h-4 w-4 shrink-0" />
                  {searchError}
                </p>
              )}

              {searchSuccess && (
                <p className="mt-2 flex items-center gap-2 text-sm text-blue-300">
                  <Check className="h-4 w-4 shrink-0" />
                  {t("friends.requestSent")}
                </p>
              )}

              <button
                type="button"
                onClick={handleSearchUser}
                disabled={searching || sendingRequest}
                className={`flex w-full items-center justify-center gap-2 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50 ${pokerButton}`}
              >
                {searching || sendingRequest ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t("friends.searching")}</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>{t("friends.searchButton")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`flex h-[600px] w-full max-w-2xl flex-col overflow-hidden ${pokerGlassCard}`}>
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60">
                  {selectedFriend ? (
                    getPlayerAvatar(selectedFriend.username, selectedFriend.id, userId, selectedFriend.avatarUrl) ? (
                      <ImageWithFallback
                        src={getPlayerAvatar(selectedFriend.username, selectedFriend.id, userId, selectedFriend.avatarUrl)}
                        alt={`${selectedFriend.username}'s avatar`}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-white">{selectedFriend.username.charAt(0).toUpperCase()}</span>
                    )
                  ) : loadingFriends ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
                  ) : (
                    <MessageCircle className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-white">
                    {selectedFriend
                      ? selectedFriend.username
                      : loadingFriends
                        ? t("common.loading")
                        : t("friends.chat")}
                  </h2>
                  <p className="text-sm text-gray-400">
                    {selectedFriend ? t("friends.level", { level: selectedFriend.level }) : "\u00a0"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeChat}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] transition-all hover:bg-white/[0.1]"
              >
                <X className="h-5 w-5 text-white" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messagesError ? (
                <div className="text-center py-8">
                  <p className="text-red-400 mb-4">
                    {(messagesError as { data?: { error?: string } })?.data?.error ?? t('friends.chatOnlyWithFriends')}
                  </p>
                  <button
                    onClick={() => refetchMessages()}
                    className="rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-white hover:bg-white/[0.12]"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <p className="text-gray-400 text-center py-8">{t('friends.noMessagesYet')}</p>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === userId;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[70%] ${
                          isMe
                            ? 'rounded-tr-none border border-blue-300/20 bg-blue-900/80'
                            : 'rounded-tl-none border border-white/10 bg-white/[0.07]'
                        }`}
                      >
                        <p className="text-white whitespace-pre-wrap break-words">{msg.content}</p>
                        <span
                          className={`text-xs mt-1 block ${isMe ? 'text-blue-200' : 'text-gray-400'}`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-white/10 p-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder={t("friends.writeMessage")}
                  className={`flex-1 px-4 py-3 ${pokerInput}`}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageInput.trim()}
                  className={`flex shrink-0 items-center gap-2 px-6 py-3 disabled:cursor-not-allowed disabled:opacity-50 ${pokerButton}`}
                >
                  {sendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                  {t("friends.send")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
