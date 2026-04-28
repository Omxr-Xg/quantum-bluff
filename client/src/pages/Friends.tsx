import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { UserPlus, Search, MessageCircle, Users, X, Check, Loader2, Home, Coins, Trophy } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../contexts/ToastContext";

import { RefreshCw } from "lucide-react"

import {
  useGetFriendsQuery,
  useGetFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useRespondToFriendRequestMutation,
  useGetFriendMessagesQuery,
  useSendFriendMessageMutation,
  useCreateFriendLoanRequestMutation,
} from "../services/api";
import { FriendSearch } from "../components/FriendSearch";
import { FriendLoansPanel } from "../components/FriendLoansPanel";
import {
  ALLOWED_LOAN_REPAYMENT_RATES,
  previewTotalDue,
  interestPercentForRepaymentRate,
} from "../utils/friendLoanPreview";
import { getFriendLoanApiErrorMessage } from "../utils/friendLoanApiError";

type FriendsTab = "friends" | "requests" | "messages" | "loans";

const pokerGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const pokerInnerCard =
  "rounded-xl border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md";
const pokerButton =
  "rounded-xl border border-blue-300/15 bg-blue-950/75 font-semibold text-white shadow-lg shadow-black/20 transition hover:border-blue-200/25 hover:bg-blue-900/80";
const pokerMutedButton =
  "rounded-xl border border-white/10 bg-white/[0.055] font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]";
const pokerInput =
  "rounded-xl border border-white/10 bg-slate-950/55 text-white placeholder-slate-500 transition-all focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/25";

export function Friends() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useUser();
  const { socket, isConnected, connect } = useSocket();
  const { addToast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchResults, setSearchResults] = useState<{ id?: string; username?: string }[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [activeTab, setActiveTab] = useState<FriendsTab>("friends");
  const [searchParams] = useSearchParams();
  useEffect(() => {
    const tab = searchParams.get("tab");
    const withUserId = searchParams.get("with");
    if (tab === "requests") {
      setActiveTab("requests");
    } else if (tab === "messages") {
      setActiveTab("messages");
      if (withUserId) setSelectedChat(withUserId);
    }
  }, [searchParams]);

  const [loanModal, setLoanModal] = useState<{ id: string; username: string } | null>(null);
  const [loanAmount, setLoanAmount] = useState(500);
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

  const [sendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [respondRequest] = useRespondToFriendRequestMutation();

  const { data: searchData, isLoading: searching } = useSearchUsersQuery(friendUsername, {
    skip: friendUsername.trim().length < 2 || !showAddFriend
  });

  const filteredFriends =
    friends?.filter((friend) =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

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

    socket.on("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
    socket.on("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
    socket.on("FRIEND_LIST_UPDATED", handleFriendListUpdated);

    return () => {
      socket.off("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
      socket.off("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
      socket.off("FRIEND_LIST_UPDATED", handleFriendListUpdated);
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

  const openChat = (friendId: string) => {
    setSelectedChat(friendId);
  };

  const closeChat = () => {
    setSelectedChat(null);
    setMessageInput("");
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
    const msg = serverMsg ?? (e?.status === 403 ? t('friends.chatOnlyWithFriends') : t('friends.sendMessageError'));
    addToast(msg, 'error');
  }, [messagesError, addToast, t]);

  useEffect(() => {
    if (!socket || !userId || !selectedChat) return;

    const handleFriendMessage = (data: { senderId: string; receiverId: string }) => {
      if (
        (data.senderId === selectedChat && data.receiverId === userId) ||
        (data.receiverId === selectedChat && data.senderId === userId)
      ) {
        refetchMessages();
      }
    };

    socket.on("FRIEND_MESSAGE", handleFriendMessage);
    return () => {
      socket.off("FRIEND_MESSAGE", handleFriendMessage);
    };
  }, [socket, userId, selectedChat, refetchMessages]);

  const handleSendMessage = async () => {
    if (!selectedChat || !userId || !messageInput.trim()) return;

    try {
      await sendMessage({
        receiverId: selectedChat,
        content: messageInput.trim()
      }).unwrap();
      setMessageInput("");
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } | string; status?: number };
      const serverMsg = typeof e?.data === 'object' && e?.data?.error ? e.data.error : null;
      const msg = serverMsg ?? (e?.status === 403 ? t('friends.chatOnlyWithFriends') : t('friends.sendMessageError'));
      addToast(msg, 'error');
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t("friends.justNow");
    if (diffMins < 60) return t("friends.minutesAgo", { count: diffMins });
    if (diffHours < 24) return t("friends.hoursAgo", { count: diffHours });
    if (diffDays < 7) return t("friends.daysAgo", { count: diffDays });
    return date.toLocaleDateString();
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto bg-[#020716]">
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
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:mb-8 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className={`flex touch-manipulation items-center gap-1 px-3 py-2 text-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-base ${pokerMutedButton}`}
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t("profile.home")}</span>
            </button>
          </div>
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => refetchFriends()}
            disabled={fetchingFriends}
            className={`flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60 ${pokerMutedButton}`}
          >
            <RefreshCw className={`w-4 h-4 ${fetchingFriends ? 'animate-spin text-blue-300' : ''}`} />
            {fetchingFriends ? "Mise à jour..." : "Actualiser la liste"}
          </button>
        </div>

        <div className={`mb-6 flex flex-col gap-4 p-5 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${pokerGlassCard}`}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-blue-300/25 bg-blue-950/65 shadow-[0_0_36px_rgba(59,130,246,0.18)] sm:mx-0 sm:h-24 sm:w-24">
              <Users className="h-10 w-10 text-blue-100 sm:h-12 sm:w-12" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="mb-2 bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-2xl font-bold text-transparent sm:text-4xl">{t("friends.title")}</h1>
              <p className="text-lg text-slate-300/75">{t("friends.friendsCount", { count: friends?.length || 0 })}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddFriend(true)}
            className={`flex w-full shrink-0 touch-manipulation items-center justify-center gap-2 px-6 py-3 sm:w-auto ${pokerButton}`}
          >
            <UserPlus className="h-5 w-5" />
            {t("friends.addOneFriend")}
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["friends", t("friends.tabFriends"), Users],
              ["requests", t("friends.tabRequests"), UserPlus],
              ["messages", t("friends.tabMessages"), MessageCircle],
              ["loans", t("friends.tabLoans"), Coins],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex touch-manipulation items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all sm:text-base ${
                activeTab === key
                  ? "bg-gradient-to-br from-blue-950/90 via-slate-900/80 to-slate-950/80 text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_16px_36px_rgba(0,0,0,0.22)] ring-1 ring-blue-300/20"
                  : "border border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/[0.07] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "requests" && (
          <div className={`mb-4 p-5 sm:mb-6 sm:p-8 ${pokerGlassCard}`}>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-blue-100 sm:text-xl">
              <UserPlus className="h-5 w-5 shrink-0 text-blue-200" />
              {t("friends.friendRequestsCount", { count: requests?.length || 0 })}
              {/* Le spinner  qui apparaît pendant les Retry */}
              {fetchingRequests && !loadingRequests && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-300/60 ml-2" />
              )}
            </h2>

            {loadingRequests ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
              </div>
            ) : requests?.length ? (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className={`flex items-center justify-between p-3 ${pokerInnerCard}`}
                  >
                    <div className="flex items-center gap-3">
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
                      <span className="font-medium text-white">{req.sender.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRespond(req.id, "ACCEPTED")}
                        className="rounded-lg border border-blue-300/25 bg-blue-950/75 p-2 text-white transition hover:bg-blue-900/80"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespond(req.id, "REJECTED")}
                        className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">{t("friends.noFriendsYet")}</p>
            )}
          </div>
        )}

        {activeTab === "friends" && (
          <>
            <div className={`mb-4 p-5 sm:mb-6 sm:p-8 ${pokerGlassCard}`}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("friends.searchFriendPlaceholder")}
                  className={`w-full py-3 pl-12 pr-4 ${pokerInput}`}
                />
              </div>
            </div>

            <div className="mb-6">
              <FriendSearch />
            </div>
            {fetchingFriends && !loadingFriends && (
              <div className="flex items-center justify-end mb-2 gap-2 text-sm text-blue-300/70 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                Synchronisation...
              </div>
            )}

            {loadingFriends ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className={`p-5 transition-all hover:border-blue-300/20 sm:p-8 ${pokerGlassCard}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60 shadow-[0_0_28px_rgba(59,130,246,0.16)] sm:h-20 sm:w-20">
                        {getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl) ? (
                          <ImageWithFallback
                            src={getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl)}
                            alt={`${friend.username}'s avatar`}
                            className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-white">{friend.username.charAt(0).toUpperCase()}</span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <h3 className="truncate text-xl font-bold text-white">{friend.username}</h3>
                          <span className="shrink-0 text-sm font-semibold text-blue-200">
                            {t("friends.level", { level: friend.level })}
                          </span>
                        </div>

                        <div className="mb-4 flex items-center gap-1.5 text-sm text-slate-400">
                          <Trophy className="h-4 w-4 text-cyan-200/80" />
                          {friend.stats?.wins ?? friend.playerStats?.totalWins ?? 0}{" "}
                          {t("profile.wins")}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openChat(friend.id)}
                            className={`flex w-full items-center justify-center gap-2 px-4 py-2.5 ${pokerMutedButton}`}
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
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/20 bg-cyan-950/45 px-4 py-2.5 font-semibold text-cyan-100 transition-all hover:border-cyan-200/35 hover:bg-cyan-900/45"
                          >
                            <Coins className="h-4 w-4 shrink-0" />
                            {t("friends.loans.requestLoan")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredFriends.length === 0 && !loadingFriends && (
              <div className="py-12 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-blue-300/20 bg-blue-950/40">
                  <Users className="h-10 w-10 text-slate-500" />
                </div>
                <p className="text-lg text-gray-400">{t("friends.noFriendsFound")}</p>
              </div>
            )}
          </>
        )}

        {activeTab === "messages" && userId && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {loadingFriends ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
              </div>
            ) : friends?.length ? (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => openChat(friend.id)}
                  className={`flex items-center gap-4 p-4 text-left text-white transition hover:border-blue-300/20 ${pokerGlassCard}`}
                >
                  <MessageCircle className="h-8 w-8 text-blue-200" />
                  <span className="font-semibold">{friend.username}</span>
                </button>
              ))
            ) : (
              <p className="text-gray-400">{t("friends.noFriendsFound")}</p>
            )}
          </div>
        )}

        {activeTab === "loans" && userId ? <FriendLoansPanel userId={userId} /> : null}
      </div>

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
              value={loanAmount}
              onChange={(e) => setLoanAmount(Number(e.target.value) || 0)}
              className={`mb-4 w-full px-4 py-3 ${pokerInput}`}
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
              disabled={creatingLoan || loanAmount < 100}
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

      {selectedChat && selectedFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`flex h-[600px] w-full max-w-2xl flex-col overflow-hidden ${pokerGlassCard}`}>
            <div className="flex items-center justify-between border-b border-white/10 p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60">
                  {getPlayerAvatar(selectedFriend.username, selectedFriend.id, userId, selectedFriend.avatarUrl) ? (
                    <ImageWithFallback
                      src={getPlayerAvatar(selectedFriend.username, selectedFriend.id, userId, selectedFriend.avatarUrl)}
                      alt={`${selectedFriend.username}'s avatar`}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-white">{selectedFriend.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-white">{selectedFriend.username}</h2>
                  <p className="text-sm text-gray-400">{t("friends.level", { level: selectedFriend.level })}</p>
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
