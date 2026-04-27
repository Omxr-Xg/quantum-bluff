import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Users, UserPlus, Loader2, ChevronRight } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../hooks/useSocket";
import {
  useGetFriendsQuery,
  useGetFriendRequestsQuery
} from "../services/api";

export function FriendsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userId } = useUser();
  const { socket, isConnected, connect } = useSocket();

  const {
    data: friends,
    isLoading: loadingFriends,
    refetch: refetchFriends
  } = useGetFriendsQuery(userId!, {
    skip: !userId
  });

  const {
    data: requests,
    isLoading: loadingRequests,
    refetch: refetchRequests
  } = useGetFriendRequestsQuery(userId!, {
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
      await refetchRequests();
      await refetchFriends();
    };

    const handleFriendRequestAccepted = async (_payload: unknown) => {
      console.log("LOBBY FRIEND_REQUEST_ACCEPTED:", _payload);
      await refetchRequests();
      await refetchFriends();
    };

    const handleFriendListUpdated = async (_payload: unknown) => {
      console.log("LOBBY FRIEND_LIST_UPDATED:", _payload);
      await refetchRequests();
      await refetchFriends();
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

  const pendingCount = requests?.length || 0;
  const friendsCount = friends?.length || 0;

  return (
    <div className="min-h-full rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl text-white font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-200" />
          {t('lobby.friends')}
        </h2>

        <button
          onClick={() => navigate("/friends")}
          className="text-blue-400 hover:text-blue-300 transition"
          title={t('friends.seeAll')}
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">{t('lobby.friends')}</span>
            <span className="text-white font-bold">{friendsCount}</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-200" />
              {t('friends.pendingRequests')}
            </span>
            <span className="text-blue-200 font-bold">{pendingCount}</span>
          </div>
        </div>

        {loadingFriends || loadingRequests ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
          </div>
        ) : friendsCount > 0 ? (
          <div className="space-y-3">
            {friends!.slice(0, 5).map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-md"
              >
                <div>
                  <p className="text-white font-medium">{friend.username}</p>
                  <p className="text-xs text-gray-400">{t('friends.level', { level: friend.level })}</p>
                </div>
                <div className="text-xs text-gray-400">
                  🏆 {friend.stats?.wins || 0}
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate("/friends")}
              className="w-full mt-2 rounded-xl border border-blue-300/15 bg-blue-950/75 py-3 font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80"
            >
              {t('lobby.manageFriends')}
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">{t('friends.noFriendsYet')}</p>
            <button
              onClick={() => navigate("/friends")}
              className="w-full rounded-xl border border-blue-300/15 bg-blue-950/75 py-3 font-semibold text-white transition hover:border-blue-200/25 hover:bg-blue-900/80"
            >
              {t('friends.addFriends')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
