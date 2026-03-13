import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, UserPlus, Loader2, ChevronRight } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { useSocket } from "../contexts/SocketContext";
import {
  useGetFriendsQuery,
  useGetFriendRequestsQuery
} from "../services/api";

export function FriendsList() {
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

    const handleFriendRequestReceived = async (payload: any) => {
      console.log("LOBBY FRIEND_REQUEST_RECEIVED:", payload);
      await refetchRequests();
      await refetchFriends();
    };

    const handleFriendRequestAccepted = async (payload: any) => {
      console.log("LOBBY FRIEND_REQUEST_ACCEPTED:", payload);
      await refetchRequests();
      await refetchFriends();
    };

    const handleFriendListUpdated = async (payload: any) => {
      console.log("LOBBY FRIEND_LIST_UPDATED:", payload);
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
    <div className="bg-slate-800 rounded-2xl p-6 border border-blue-500 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl text-white font-bold flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-400" />
          Amis
        </h2>

        <button
          onClick={() => navigate("/friends")}
          className="text-blue-400 hover:text-blue-300 transition"
          title="Voir tout"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Amis</span>
            <span className="text-white font-bold">{friendsCount}</span>
          </div>
        </div>

        <div className="bg-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-yellow-400" />
              Demandes en attente
            </span>
            <span className="text-yellow-300 font-bold">{pendingCount}</span>
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
                className="bg-slate-700/40 rounded-xl p-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{friend.username}</p>
                  <p className="text-xs text-gray-400">Niveau {friend.level}</p>
                </div>
                <div className="text-xs text-gray-400">
                  🏆 {friend.stats?.wins || 0}
                </div>
              </div>
            ))}

            <button
              onClick={() => navigate("/friends")}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition"
            >
              Gérer mes amis
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-4">Aucun ami pour le moment</p>
            <button
              onClick={() => navigate("/friends")}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition"
            >
              Ajouter des amis
            </button>
          </div>
        )}
      </div>
    </div>
  );
}