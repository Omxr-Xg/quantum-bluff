import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { UserPlus, Search, ArrowLeft, MessageCircle, Users, X, Check, Loader2, Gamepad2 } from "lucide-react";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../contexts/SocketContext";
import { useToast } from "../contexts/ToastContext";
import {
  useGetFriendsQuery,
  useGetFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useRespondToFriendRequestMutation,
  useGetFriendMessagesQuery,
  useSendFriendMessageMutation
} from "../services/api";
import { FriendSearch } from "../components/FriendSearch";

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
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-auto">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            {isInGame ? (
              <button
                onClick={() => {
                  const gameData = sessionStorage.getItem("currentGame");
                  if (gameData) {
                    navigate(gameData);
                  }
                }}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-semibold transition-all shadow-lg"
              >
                <Gamepad2 className="w-5 h-5" />
                <span>{t('profile.backToGame')}</span>
              </button>
            ) : null}
            <button
              onClick={() => navigate("/lobby")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>{t('friends.backToLobby')}</span>
            </button>
          </div>

          <button
            onClick={() => setShowAddFriend(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-6 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all"
          >
            <UserPlus className="w-5 h-5" />
            {t('friends.addOneFriend')}
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-full flex items-center justify-center shadow-xl">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-1">{t('friends.title')}</h1>
            <p className="text-gray-400">{t('friends.friendsCount', { count: friends?.length || 0 })}</p>
          </div>
        </div>

        {(loadingRequests || (requests && requests.length > 0)) && (
          <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 rounded-2xl shadow-xl border border-yellow-600 p-6 mb-6">
            <h2 className="text-xl text-yellow-400 font-bold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {t('friends.friendRequestsCount', { count: requests?.length || 0 })}
            </h2>

            {loadingRequests ? (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 text-yellow-300 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                {requests?.map((req) => (
                  <div key={req.id} className="flex items-center justify-between bg-black/30 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-yellow-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold">
                          {req.sender.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-white font-medium">{req.sender.username}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(req.id, "ACCEPTED")}
                        className="bg-green-600 hover:bg-green-500 text-white p-2 rounded-lg"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRespond(req.id, "REJECTED")}
                        className="bg-red-600 hover:bg-red-500 text-white p-2 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-xl border border-slate-700 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('friends.searchFriendPlaceholder')}
              className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="mb-6">
          <FriendSearch />
        </div>

        {loadingFriends ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-green-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFriends.map((friend) => (
              <div
                key={friend.id}
                className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl shadow-xl border border-slate-700 p-6 hover:border-green-500/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white overflow-hidden flex items-center justify-center shadow-lg">
                    {getPlayerAvatar(friend.username) ? (
                      <ImageWithFallback
                        src={getPlayerAvatar(friend.username)}
                        alt={`${friend.username}'s avatar`}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {friend.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-xl font-bold text-white">{friend.username}</h3>
                      <span className="text-yellow-400 text-sm font-semibold">
                        {t('friends.level', { level: friend.level })}
                      </span>
                    </div>

                    <div className="text-gray-400 text-sm mb-3">
                      {t('friends.level', { level: friend.level })}
                    </div>

                    <div className="text-gray-400 text-sm mb-4">
                      🏆 {friend.stats?.wins || 0} {t('profile.wins')}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openChat(friend.id)}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-semibold transition-all"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {t('friends.chat')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredFriends.length === 0 && !loadingFriends && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-gray-600" />
            </div>
            <p className="text-gray-400 text-lg">{t('friends.noFriendsFound')}</p>
          </div>
        )}
      </div>

      {showAddFriend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-800 rounded-full flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">{t('friends.addOneFriend')}</h2>
              </div>
              <button
                onClick={() => {
                  setShowAddFriend(false);
                  setFriendUsername("");
                  setSearchError("");
                  setSearchSuccess(false);
                  setSearchResults([]);
                }}
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-gray-400 mb-4">
                {t('friends.searchPlaceholder')}
              </p>

              <div className="mb-4">
                <label htmlFor="friendUsername" className="block text-sm font-semibold text-gray-300 mb-2">
                  {t('friends.usernameLabel')}
                </label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="friendUsername"
                    type="text"
                    value={friendUsername}
                    onChange={(e) => {
                      setFriendUsername(e.target.value);
                      setSearchError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchUser()}
                    placeholder={t('friends.playerNamePlaceholder')}
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {searching && (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-6 h-6 text-green-400 animate-spin" />
                </div>
              )}

              {searchResults.length > 0 && !searching && (
                <div className="mb-4">
                  <h3 className="text-white font-semibold mb-2">{t('friends.results')}</h3>
                  {searchResults.map((user) => (
                    <div key={user.id} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg mb-2">
                      <span className="text-white">{user.username}</span>
                      <button
                        onClick={() => handleSendRequest(user.username)}
                        disabled={sendingRequest}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-green-800 text-white px-3 py-1 rounded-lg text-sm"
                      >
                        {t('friends.addFriend')}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {searchError && (
                <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                  <X className="w-4 h-4" />
                  {searchError}
                </p>
              )}

              {searchSuccess && (
                <p className="text-green-500 text-sm mt-2 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {t('friends.requestSent')}
                </p>
              )}

              <button
                onClick={handleSearchUser}
                disabled={searching || sendingRequest}
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl shadow-lg transform hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {searching || sendingRequest ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('friends.searching')}</span>
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    <span>{t('friends.searchButton')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedChat && selectedFriend && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 max-w-2xl w-full h-[600px] flex flex-col">
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-white overflow-hidden flex items-center justify-center shrink-0">
                  {getPlayerAvatar(selectedFriend.username) ? (
                    <ImageWithFallback
                      src={getPlayerAvatar(selectedFriend.username)}
                      alt={`${selectedFriend.username}'s avatar`}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-xl font-bold">
                      {selectedFriend.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedFriend.username}</h2>
                  <p className="text-sm text-gray-400">
                    {t('friends.level', { level: selectedFriend.level })}
                  </p>
                </div>
              </div>
              <button
                onClick={closeChat}
                className="w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <X className="w-5 h-5 text-white" />
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

            <div className="p-6 border-t border-slate-700">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder={t('friends.writeMessage')}
                  className="flex-1 bg-slate-900/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageInput.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all flex items-center gap-2"
                >
                  {sendingMessage ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {t('friends.send')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}