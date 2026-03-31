import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { UserPlus, Search, MessageCircle, Users, X, Check, Loader2, Gamepad2, Home, Coins } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { QuantumBluffLogo } from "../assets/logo";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import { useToast } from "../contexts/ToastContext";
import {
  useGetFriendsQuery,
  useGetFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useRespondToFriendRequestMutation,
  useGetFriendMessagesQuery,
  useSendFriendMessageMutation,
  useCreateFriendLoanRequestMutation,
  api,
} from "../services/api";
import type { AppDispatch } from "../store/index";
import { FriendSearch } from "../components/FriendSearch";
import { FriendLoansPanel } from "../components/FriendLoansPanel";
import {
  ALLOWED_LOAN_REPAYMENT_RATES,
  previewTotalDue,
  interestPercentForRepaymentRate,
} from "../utils/friendLoanPreview";
import { getFriendLoanApiErrorMessage } from "../utils/friendLoanApiError";

type FriendsTab = "friends" | "requests" | "messages" | "loans";

export function Friends() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
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
  const [loanModal, setLoanModal] = useState<{ id: string; username: string } | null>(null);
  const [loanAmount, setLoanAmount] = useState(500);
  const [loanRate, setLoanRate] = useState<number>(30);

  const [createLoanRequest, { isLoading: creatingLoan }] = useCreateFriendLoanRequestMutation();

  const {
    data: friends,
    refetch: refetchFriends,
    isLoading: loadingFriends
  } = useGetFriendsQuery(userId!, {
    skip: !userId
  });

  const {
    data: requests,
    refetch: refetchRequests,
    isLoading: loadingRequests
  } = useGetFriendRequestsQuery(userId!, {
    skip: !userId
  });

  const [sendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [respondRequest] = useRespondToFriendRequestMutation();

  const { data: searchData, isLoading: searching } = useSearchUsersQuery(friendUsername, {
    skip: friendUsername.trim().length < 2 || !showAddFriend
  });

  const isInGame = sessionStorage.getItem("currentGame");

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

    const invalidateLoans = () => {
      dispatch(api.util.invalidateTags(["FriendLoan"]));
    };

    const loanEvents = [
      "LOAN_REQUEST_RECEIVED",
      "LOAN_REQUEST_ACCEPTED",
      "LOAN_REQUEST_REJECTED",
      "LOAN_CREATED",
      "LOAN_REPAYMENT_PROGRESS",
      "LOAN_COMPLETED",
    ] as const;

    socket.on("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
    socket.on("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
    socket.on("FRIEND_LIST_UPDATED", handleFriendListUpdated);
    loanEvents.forEach((ev) => socket.on(ev, invalidateLoans));

    return () => {
      socket.off("FRIEND_REQUEST_RECEIVED", handleFriendRequestReceived);
      socket.off("FRIEND_REQUEST_ACCEPTED", handleFriendRequestAccepted);
      socket.off("FRIEND_LIST_UPDATED", handleFriendListUpdated);
      loanEvents.forEach((ev) => socket.off(ev, invalidateLoans));
    };
  }, [socket, userId, refetchFriends, refetchRequests, dispatch]);

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
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="mx-auto max-w-6xl p-3 sm:p-6">
        {/* En-tête — même structure que Profile */}
        <div className="mb-6 flex flex-col items-start justify-between gap-3 sm:mb-8 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className="flex touch-manipulation items-center gap-1 rounded-lg bg-slate-700 px-3 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-600 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-base"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t("profile.home")}</span>
            </button>
            {isInGame ? (
              <button
                type="button"
                onClick={() => {
                  const gameData = sessionStorage.getItem("currentGame");
                  if (gameData) {
                    navigate(gameData);
                  }
                }}
                className="flex touch-manipulation items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:bg-green-500 sm:gap-2 sm:rounded-xl sm:px-4 sm:py-2 sm:text-base"
              >
                <Gamepad2 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{t("profile.backToGame")}</span>
              </button>
            ) : null}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <QuantumBluffLogo className="h-10 w-10 drop-shadow-2xl sm:h-12 sm:w-12" />
            <span className="text-xl font-bold text-white sm:text-2xl">{t("lobby.title")}</span>
          </div>
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="mx-auto flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-yellow-400 bg-gradient-to-br from-green-600 to-green-800 shadow-2xl sm:mx-0 sm:h-24 sm:w-24">
              <Users className="h-10 w-10 text-white sm:h-12 sm:w-12" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="mb-2 text-2xl font-bold text-white sm:text-4xl">{t("friends.title")}</h1>
              <p className="text-lg text-gray-400">{t("friends.friendsCount", { count: friends?.length || 0 })}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddFriend(true)}
            className="flex w-full shrink-0 touch-manipulation items-center justify-center gap-2 rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white transition-all hover:bg-slate-600 sm:w-auto"
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
                  ? "bg-green-600 text-white shadow-lg"
                  : "bg-slate-700 text-gray-200 hover:bg-slate-600"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "requests" && (
          <div className="mb-4 rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-2xl sm:mb-6 sm:rounded-2xl sm:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-amber-200 sm:text-xl">
              <UserPlus className="h-5 w-5 shrink-0 text-amber-400" />
              {t("friends.friendRequestsCount", { count: requests?.length || 0 })}
            </h2>

            {loadingRequests ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
              </div>
            ) : requests?.length ? (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-600 to-amber-800">
                        <span className="font-bold text-white">{req.sender.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-white">{req.sender.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRespond(req.id, "ACCEPTED")}
                        className="rounded-lg bg-green-600 p-2 text-white transition hover:bg-green-500"
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
            <div className="mb-4 rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-2xl sm:mb-6 sm:rounded-2xl sm:p-8">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("friends.searchFriendPlaceholder")}
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/50 py-3 pl-12 pr-4 text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="mb-6">
              <FriendSearch />
            </div>

            {loadingFriends ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-400" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-2xl transition-all hover:border-slate-600 sm:rounded-2xl sm:p-8"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-yellow-400 bg-gradient-to-br from-green-600 to-green-800 shadow-lg sm:h-20 sm:w-20">
                        {getPlayerAvatar(friend.username, friend.id) ? (
                          <ImageWithFallback
                            src={getPlayerAvatar(friend.username, friend.id)}
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
                          <span className="shrink-0 text-sm font-semibold text-amber-200">
                            {t("friends.level", { level: friend.level })}
                          </span>
                        </div>

                        <div className="mb-4 text-sm text-gray-400">
                          🏆 {friend.stats?.wins || 0} {t("profile.wins")}
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => openChat(friend.id)}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 px-4 py-2.5 font-semibold text-white transition-all hover:bg-slate-600"
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
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/50 bg-amber-900/20 px-4 py-2.5 font-semibold text-amber-100 transition-all hover:bg-amber-900/40"
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
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-slate-600 bg-slate-800/80">
                  <Users className="h-10 w-10 text-gray-500" />
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
                <Loader2 className="h-8 w-8 animate-spin text-green-400" />
              </div>
            ) : friends?.length ? (
              friends.map((friend) => (
                <button
                  key={friend.id}
                  type="button"
                  onClick={() => openChat(friend.id)}
                  className="flex items-center gap-4 rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-left text-white transition hover:border-slate-600"
                >
                  <MessageCircle className="h-8 w-8 text-amber-300" />
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
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {t("friends.loans.requestLoan")} — {loanModal.username}
              </h2>
              <button
                type="button"
                onClick={() => setLoanModal(null)}
                className="rounded-lg bg-slate-700 p-2 text-white hover:bg-slate-600"
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
              className="mb-4 w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-white"
            />
            <label className="mb-1 block text-sm text-gray-300">{t("friends.loans.repaymentRate")}</label>
            <select
              value={loanRate}
              onChange={(e) => setLoanRate(Number(e.target.value))}
              className="mb-4 w-full rounded-xl border border-slate-600 bg-slate-900/60 px-4 py-3 text-white"
            >
              {ALLOWED_LOAN_REPAYMENT_RATES.map((r) => (
                <option key={r} value={r}>
                  {r}%
                </option>
              ))}
            </select>
            <div className="mb-4 space-y-1 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100">
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
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-500 disabled:opacity-50"
            >
              {creatingLoan ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {t("friends.loans.sendRequest")}
            </button>
          </div>
        </div>
      ) : null}

      {showAddFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-400 bg-gradient-to-br from-green-600 to-green-800">
                  <UserPlus className="h-6 w-6 text-white" />
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
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-700 transition-all hover:bg-slate-600"
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
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/50 py-3 pl-12 pr-4 text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-green-400" />
                </div>
              )}

              {searchResults.length > 0 && !searching && (
                <div className="mb-4">
                  <h3 className="mb-2 font-semibold text-white">{t("friends.results")}</h3>
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="mb-2 flex items-center justify-between rounded-lg border border-slate-600 bg-slate-800/50 p-3"
                    >
                      <span className="text-white">{user.username}</span>
                      <button
                        type="button"
                        onClick={() => handleSendRequest(user.username!)}
                        disabled={sendingRequest}
                        className="rounded-lg bg-green-600 px-3 py-1 text-sm text-white hover:bg-green-500 disabled:bg-green-800"
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
                <p className="mt-2 flex items-center gap-2 text-sm text-green-400">
                  <Check className="h-4 w-4 shrink-0" />
                  {t("friends.requestSent")}
                </p>
              )}

              <button
                type="button"
                onClick={handleSearchUser}
                disabled={searching || sendingRequest}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white transition-all hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
          <div className="flex h-[600px] w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-yellow-400 bg-gradient-to-br from-green-600 to-green-800">
                  {getPlayerAvatar(selectedFriend.username, selectedFriend.id) ? (
                    <ImageWithFallback
                      src={getPlayerAvatar(selectedFriend.username, selectedFriend.id)}
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
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-700 transition-all hover:bg-slate-600"
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
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white"
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
                            ? 'bg-green-600 rounded-tr-none'
                            : 'bg-slate-700/50 rounded-tl-none'
                        }`}
                      >
                        <p className="text-white whitespace-pre-wrap break-words">{msg.content}</p>
                        <span
                          className={`text-xs mt-1 block ${isMe ? 'text-green-200' : 'text-gray-400'}`}
                        >
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-slate-700 p-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                  placeholder={t("friends.writeMessage")}
                  className="flex-1 rounded-xl border border-slate-600 bg-slate-900/50 px-4 py-3 text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageInput.trim()}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-slate-700 px-6 py-3 font-semibold text-white transition-all hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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