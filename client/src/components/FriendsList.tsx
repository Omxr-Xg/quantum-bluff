import { useState } from 'react';
import { useUser } from '../hooks/useUser';
import { 
  useGetFriendsQuery, 
  useGetFriendRequestsQuery,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useRespondToFriendRequestMutation 
} from '../services/api';

export const FriendsList = () => {
  const { userId } = useUser();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: friends, refetch: refetchFriends } = useGetFriendsQuery(userId!, {
    skip: !userId
  });
  
  const { data: requests } = useGetFriendRequestsQuery(userId!, {
    skip: !userId
  });
  
  const { data: searchResults } = useSearchUsersQuery(searchQuery, { 
    skip: !searchQuery || !userId 
  });
  
  const [sendRequest] = useSendFriendRequestMutation();
  const [respondRequest] = useRespondToFriendRequestMutation();

  const handleSendRequest = async (receiverUsername: string) => {
    if (!userId) return;
    await sendRequest({ senderId: userId, receiverUsername });
    setSearchQuery('');
  };

  const handleRespond = async (requestId: string, status: 'ACCEPTED' | 'REJECTED') => {
    await respondRequest({ requestId, status });
    refetchFriends();
  };

  if (!userId) {
    return <div className="p-4 bg-gray-800 rounded-lg text-white">Connectez-vous pour voir vos amis</div>;
  }

  return (
    <div className="p-4 bg-gray-800 rounded-lg">
      <h2 className="text-xl text-white mb-4">Amis</h2>
      
      {/* Recherche */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Rechercher un joueur..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600 focus:border-purple-500 outline-none"
        />
      </div>
      
      {/* Résultats de recherche */}
      {searchResults && searchResults.length > 0 && (
        <div className="mb-4">
          <h3 className="text-gray-300 mb-2">Résultats</h3>
          {searchResults.map((user) => (
            <div key={user.id} className="flex justify-between items-center p-2 bg-gray-700 mb-2 rounded">
              <div>
                <span className="text-white">{user.username}</span>
                <span className="text-gray-400 ml-2">Niv.{user.level}</span>
              </div>
              <button
                onClick={() => handleSendRequest(user.username)}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
              >
                Ajouter
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Demandes reçues */}
      {requests && requests.length > 0 && (
        <div className="mb-4">
          <h3 className="text-gray-300 mb-2">Demandes d'ami</h3>
          {requests.map((req) => (
            <div key={req.id} className="flex justify-between items-center p-2 bg-yellow-900/30 mb-2 rounded border border-yellow-700">
              <span className="text-white">{req.sender.username} veut être votre ami</span>
              <div>
                <button
                  onClick={() => handleRespond(req.id, 'ACCEPTED')}
                  className="px-3 py-1 bg-green-600 text-white rounded mr-2 hover:bg-green-700 transition"
                >
                  Accepter
                </button>
                <button
                  onClick={() => handleRespond(req.id, 'REJECTED')}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Liste d'amis */}
      <div>
        <h3 className="text-gray-300 mb-2">Ma liste ({friends?.length || 0})</h3>
        {friends && friends.length > 0 ? (
          friends.map((friend) => (
            <div key={friend.id} className="flex items-center p-2 bg-gray-700 mb-2 rounded">
              <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">{friend.username.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1">
                <span className="text-white">{friend.username}</span>
                <span className="text-gray-400 ml-2">Niv.{friend.level}</span>
              </div>
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center py-4">Aucun ami pour le moment</p>
        )}
      </div>
    </div>
  );
};
