import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Loader2, Search, X, Check, MessageCircle, Phone } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { useVoice } from "../contexts/VoiceContext";
import { useToast } from "../contexts/ToastContext";
import { useSocket } from "../hooks/useSocket";
import {
  useGetFriendsQuery,
  useGetFriendMessagesQuery,
  useLazySearchUsersQuery,
  useSendFriendRequestMutation,
  useSendFriendMessageMutation,
} from "../services/api";
import { getPlayerAvatar } from "../utils/avatars";
import { formatFriendLastSeen } from "../utils/formatLastSeen";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { CosmeticAvatar, CosmeticBannerCard, CosmeticTitle } from "./PlayerCosmetics";

type SearchUser = {
  id: string;
  username: string;
  level: number;
};

export function FriendsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useUser();
  const { addToast } = useToast();
  const { startPrivateCall } = useVoice();
  const { socket, isConnected, connect } = useSocket();
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchError, setSearchError] = useState("");
  const [searchSuccess, setSearchSuccess] = useState(false);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [triggerSearchUsers, { isFetching: searching }] = useLazySearchUsersQuery();
  const [sendRequest, { isLoading: sendingRequest }] = useSendFriendRequestMutation();
  const [sendMessage, { isLoading: sendingMessage }] = useSendFriendMessageMutation();

  const {
    data: friends,
    isLoading: loadingFriends,
    refetch: refetchFriends
  } = useGetFriendsQuery(userId!, {
    skip: !userId
  });

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [isConnected, connect]);

  useEffect(() => {
    if (!socket || !userId) return;

    const handleFriendRequestReceived = async (_payload: unknown) => {
      console.log("LOBBY FRIEND_REQUEST_RECEIVED:", _payload);
      await refetchFriends();
    };

    const handleFriendRequestAccepted = async (_payload: unknown) => {
      console.log("LOBBY FRIEND_REQUEST_ACCEPTED:", _payload);
      await refetchFriends();
    };

    const handleFriendListUpdated = async (_payload: unknown) => {
      console.log("LOBBY FRIEND_LIST_UPDATED:", _payload);
      await refetchFriends();
    };
    const handleFriendStatusChanged = async () => {
      await refetchFriends();
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
  }, [socket, userId, refetchFriends]);

  const runSearch = useCallback(
    async (rawQuery: string) => {
      const query = rawQuery.trim();
      setSearchSuccess(false);

      if (query.length < 2) {
        setSearchResults([]);
        setSearchError(t("friends.minChars"));
        return;
      }

      try {
        const users = await triggerSearchUsers(query).unwrap();
        setSearchResults(users.filter((user): user is SearchUser => Boolean(user.id && user.username)));
        setSearchError(users.length > 0 ? "" : t("friends.noUserFound"));
      } catch {
        setSearchResults([]);
        setSearchError(t("friends.searchError", { defaultValue: "Recherche impossible pour le moment." }));
      }
    },
    [t, triggerSearchUsers],
  );

  useEffect(() => {
    if (!showAddFriend) return;

    const query = friendUsername.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError("");
      return;
    }

    const timer = window.setTimeout(() => {
      void runSearch(query);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [friendUsername, runSearch, showAddFriend]);

  const closeAddFriendModal = () => {
    setShowAddFriend(false);
    setFriendUsername("");
    setSearchResults([]);
    setSearchError("");
    setSearchSuccess(false);
  };

  const handleSendRequest = async (username: string) => {
    if (!userId) return;

    try {
      await sendRequest({ senderId: userId, receiverUsername: username }).unwrap();
      setSearchSuccess(true);
      setSearchResults([]);
      setFriendUsername("");
      setSearchError("");
      await refetchFriends();
    } catch (err: unknown) {
      const message = (err as { data?: { error?: string } })?.data?.error || t("friends.sendRequestError");
      setSearchError(message);
    }
  };

  const friendsCount = friends?.length || 0;

  /** Lobby : connectés d’abord, puis par nom (max 4 affichés). */
  const lobbyFriendsPreview = useMemo(() => {
    if (!friends?.length) return [];
    return [...friends]
      .sort((a, b) => {
        const aOnline = Boolean(a.isOnline);
        const bOnline = Boolean(b.isOnline);
        if (aOnline !== bOnline) return aOnline ? -1 : 1;
        return a.username.localeCompare(b.username, undefined, { sensitivity: "base" });
      })
      .slice(0, 4);
  }, [friends]);

  const selectedFriend = friends?.find((friend) => friend.id === selectedChat);
  const {
    data: messages = [],
    error: messagesError,
    refetch: refetchMessages,
  } = useGetFriendMessagesQuery(
    selectedChat && userId ? { userId, friendId: selectedChat } : { userId: "", friendId: "" },
    { skip: !selectedChat || !userId },
  );

  const openFriendsPage = () => navigate("/friends");
  const openFriendChat = (friendId: string) => {
    setSelectedChat(friendId);
    setMessageInput("");
  };
  const handleCallFriend = (
    event: React.MouseEvent,
    friend: { id: string; username: string; isOnline?: boolean; avatarUrl?: string | null },
  ) => {
    event.stopPropagation();
    if (!friend.isOnline) {
      addToast(t("voice.callFriendOffline", { username: friend.username }), "warning");
      return;
    }
    startPrivateCall(friend.id, friend.username, friend.avatarUrl);
  };
  const closeChat = () => {
    setSelectedChat(null);
    setMessageInput("");
  };
  const formatMessageTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };
  const handleSendMessage = async () => {
    const content = messageInput.trim();
    if (!selectedChat || !content) return;
    try {
      await sendMessage({ receiverId: selectedChat, content }).unwrap();
      setMessageInput("");
      await refetchMessages();
    } catch {
      // L'erreur est affichée par la zone messages si l'API refuse l'envoi.
    }
  };

  useEffect(() => {
    if (!socket || !selectedChat || !userId) return;
    const handleFriendMessage = (data: { senderId: string; receiverId: string }) => {
      if (data.senderId === selectedChat || data.receiverId === selectedChat) {
        void refetchMessages();
      }
    };
    socket.on("FRIEND_MESSAGE", handleFriendMessage);
    return () => {
      socket.off("FRIEND_MESSAGE", handleFriendMessage);
    };
  }, [socket, selectedChat, userId, refetchMessages]);

  useEffect(() => {
    if (!selectedChat) return;
    const frame = window.requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedChat, messages.length]);

  return (
    <>
    <div
      role="button"
      tabIndex={0}
      onClick={openFriendsPage}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openFriendsPage();
        }
      }}
      className="relative flex h-full min-h-[15rem] cursor-pointer flex-col overflow-hidden rounded-2xl border border-amber-200/16 bg-slate-900/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-xl transition hover:border-amber-200/28 hover:bg-slate-900/68 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/45 xl:p-5"
      aria-label={t("friends.seeAll")}
    >
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/40 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-200/[0.06] via-blue-950/[0.12] to-transparent" />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-white xl:text-2xl">
          <Users className="h-6 w-6 text-amber-100/85 xl:h-7 xl:w-7" />
          {t('lobby.friends')}
        </h2>
      </div>

      <div className="min-h-0 flex-1 rounded-xl border border-white/10 bg-white/[0.035] p-3">
        {loadingFriends ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
        ) : friendsCount > 0 ? (
          <div className="max-h-full space-y-2 overflow-y-auto pr-1">
            {lobbyFriendsPreview.map((friend) => {
              const lastSeenLabel = !friend.isOnline
                ? formatFriendLastSeen(friend.lastSeenAt, t)
                : null
              return (
              <CosmeticBannerCard
                key={friend.id}
                cosmetics={friend.cosmetics}
                bannerHeightClass="min-h-0"
                className={`${
                  friend.isOnline
                    ? "border-emerald-400/30 shadow-[inset_0_1px_0_rgba(52,211,153,0.12)]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <div className="flex shrink-0 flex-col items-center gap-0.5">
                    <div className="relative h-10 w-10">
                      <CosmeticAvatar cosmetics={friend.cosmetics} sizeClass="h-10 w-10">
                        <div className="flex h-full w-full items-center justify-center bg-blue-950/60">
                          {getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl) ? (
                            <ImageWithFallback
                              src={getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-white">{friend.username.charAt(0).toUpperCase()}</span>
                          )}
                        </div>
                      </CosmeticAvatar>
                      <span
                        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-900 ${
                          friend.isOnline ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                        aria-label={friend.isOnline ? t("friends.online") : t("friends.offline")}
                      />
                    </div>
                    {lastSeenLabel ? (
                      <span
                        className="max-w-[5.25rem] truncate text-center text-[9px] leading-tight text-slate-500"
                        title={lastSeenLabel}
                      >
                        {lastSeenLabel}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{friend.username}</p>
                    <CosmeticTitle cosmetics={friend.cosmetics} className="text-[10px] font-semibold" />
                    <p className="truncate text-xs italic text-gray-400">{friend.currentActivity || "Salon poker"}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(event) => handleCallFriend(event, friend)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-300/15 bg-emerald-950/70 text-emerald-100 transition hover:border-emerald-200/30 hover:bg-emerald-900/80"
                      aria-label={t("voice.callFriend")}
                      title={t("voice.callFriend")}
                    >
                      <Phone className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openFriendChat(friend.id);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-300/15 bg-blue-950/70 text-blue-100 transition hover:border-blue-200/30 hover:bg-blue-900/80"
                      aria-label={t("friends.message", { defaultValue: "Message" })}
                      title={t("friends.message", { defaultValue: "Message" })}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </CosmeticBannerCard>
            )})}
          </div>
        ) : (
          <div className="flex h-full min-h-[8rem] items-center justify-center rounded-lg border border-dashed border-white/10 bg-slate-950/25 px-4 text-center text-sm text-slate-400">
            {t('friends.noFriendsYet')}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setShowAddFriend(true);
        }}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/15 bg-blue-950/75 px-4 py-3 text-sm font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80"
      >
        <UserPlus className="h-4 w-4" />
        {t('friends.addFriend')}
      </button>
      </div>
    </div>

    {showAddFriend && (
      <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-blue-300/30 bg-blue-950/70">
                <UserPlus className="h-5 w-5 text-blue-100" />
              </div>
              <h2 className="text-xl font-bold text-white">{t("friends.addOneFriend")}</h2>
            </div>
            <button
              type="button"
              onClick={closeAddFriendModal}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] transition hover:bg-white/[0.1]"
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="p-5">
            <p className="mb-4 text-sm text-gray-400">{t("friends.searchPlaceholder")}</p>
            <label htmlFor="lobbyFriendUsername" className="mb-2 block text-sm font-semibold text-gray-300">
              {t("friends.usernameLabel")}
            </label>
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                id="lobbyFriendUsername"
                type="text"
                value={friendUsername}
                onChange={(e) => {
                  setFriendUsername(e.target.value);
                  setSearchError("");
                  setSearchSuccess(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void runSearch(friendUsername);
                }}
                placeholder={t("friends.playerNamePlaceholder")}
                className="w-full rounded-xl border border-white/10 bg-slate-950/55 py-3 pl-12 pr-4 text-white outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-500/25"
              />
            </div>

            {searching ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
              </div>
            ) : null}

            {!searching && searchResults.length > 0 ? (
              <div className="mb-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{user.username}</p>
                      <p className="text-xs text-gray-400">{t("friends.level", { level: user.level })}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendRequest(user.username)}
                      disabled={sendingRequest}
                      className="rounded-lg border border-blue-300/20 bg-blue-900/80 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
                    >
                      {t("friends.addFriend")}
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {searchError ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-red-400">
                <X className="h-4 w-4 shrink-0" />
                {searchError}
              </p>
            ) : null}

            {searchSuccess ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-blue-300">
                <Check className="h-4 w-4 shrink-0" />
                {t("friends.requestSent")}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void runSearch(friendUsername)}
              disabled={searching || sendingRequest}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/15 bg-blue-950/75 px-6 py-3 font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {searching || sendingRequest ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              <span>{searching || sendingRequest ? t("friends.searching") : t("friends.searchButton")}</span>
            </button>
          </div>
        </div>
      </div>
    )}

    {selectedChat && (
      <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <div className="flex h-[min(600px,calc(100vh-2rem))] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/10 p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative h-12 w-12 shrink-0">
                {selectedFriend ? (
                  <CosmeticAvatar cosmetics={selectedFriend.cosmetics} sizeClass="h-12 w-12">
                    <div className="flex h-full w-full items-center justify-center bg-blue-950/60">
                      {getPlayerAvatar(selectedFriend.username, selectedFriend.id, userId, selectedFriend.avatarUrl) ? (
                        <ImageWithFallback
                          src={getPlayerAvatar(selectedFriend.username, selectedFriend.id, userId, selectedFriend.avatarUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-white">{selectedFriend.username.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                  </CosmeticAvatar>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-blue-300/30 bg-blue-950/60">
                    <MessageCircle className="h-6 w-6 text-slate-400" />
                  </div>
                )}
                {selectedFriend ? (
                  <span
                    className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-slate-950 ${
                      selectedFriend.isOnline ? "bg-emerald-400" : "bg-slate-500"
                    }`}
                  />
                ) : null}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-bold text-white">
                  {selectedFriend?.username ?? t("friends.chat")}
                </h2>
                {selectedFriend ? (
                  <CosmeticTitle cosmetics={selectedFriend.cosmetics} className="text-xs font-semibold" />
                ) : null}
                <p className="truncate text-sm italic text-gray-400">{selectedFriend?.currentActivity || "Salon poker"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeChat}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.06] transition hover:bg-white/[0.1]"
              aria-label={t("common.close")}
            >
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {messagesError ? (
              <div className="py-8 text-center">
                <p className="mb-4 text-red-400">
                  {(messagesError as { data?: { error?: string } })?.data?.error ?? t("friends.chatOnlyWithFriends")}
                </p>
                <button
                  type="button"
                  onClick={() => refetchMessages()}
                  className="rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-white transition hover:bg-white/[0.12]"
                >
                  {t("common.retry")}
                </button>
              </div>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-gray-400">{t("friends.noMessagesYet")}</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === userId;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        isMe
                          ? "rounded-tr-none border border-blue-300/20 bg-blue-900/80"
                          : "rounded-tl-none border border-white/10 bg-white/[0.07]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-white">{msg.content}</p>
                      <span className={`mt-1 block text-xs ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                        {formatMessageTime(msg.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} aria-hidden />
          </div>

          <div className="border-t border-white/10 p-5">
            <div className="flex gap-3">
              <input
                type="text"
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) void handleSendMessage();
                }}
                placeholder={t("friends.writeMessage")}
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/55 px-4 py-3 text-white outline-none transition focus:border-blue-300/40 focus:ring-2 focus:ring-blue-500/25"
              />
              <button
                type="button"
                onClick={() => void handleSendMessage()}
                disabled={sendingMessage || !messageInput.trim()}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-blue-300/15 bg-blue-950/75 px-5 py-3 font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingMessage ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {t("friends.send")}
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
