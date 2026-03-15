import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../hooks/useUser';
import { useSearchUsersQuery, useSendFriendRequestMutation } from '../services/api';
import { Search, UserPlus, Loader2 } from 'lucide-react';

export const FriendSearch = () => {
  const { t } = useTranslation();
  const { userId } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [sendRequest, { isLoading: isSending }] = useSendFriendRequestMutation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: results, isLoading, error } = useSearchUsersQuery(debouncedTerm, {
    skip: debouncedTerm.length < 2,
  });

  const handleSendRequest = async (receiverUsername: string) => {
    if (!userId) return;

    try {
      await sendRequest({ senderId: userId, receiverUsername }).unwrap();
      alert(t('friends.requestSentTo', { username: receiverUsername }));
    } catch (err: unknown) {
      const message = (err as { data?: { error?: string } })?.data?.error || t('friends.sendRequestError');
      console.error('Erreur:', err);
      alert(message);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-purple-500">
      <h2 className="text-xl text-white font-bold mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-purple-400" />
        {t('friends.searchPlayers')}
      </h2>

      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('friends.usernamePlaceholder')}
          className="w-full bg-slate-700 text-white rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <Search className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-900/50 text-red-200 p-3 rounded-lg text-sm">
          {t('friends.searchError')}
        </div>
      )}

      {results && results.length > 0 ? (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg"
            >
              <div>
                <div className="text-white font-medium">{user.username}</div>
                <div className="text-gray-400 text-xs">
                  {t('friends.level', { level: user.level })} • {t('friends.gamesCount', { count: user.stats?.totalGames || 0 })}
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(user.username)}
                disabled={isSending}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white p-2 rounded-lg transition"
                title={t('friends.addAsFriend')}
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      ) : debouncedTerm.length >= 2 && !isLoading ? (
        <div className="text-center py-4 text-gray-400">
          {t('friends.noPlayerFound')}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500 text-sm">
          {t('friends.typeMinChars')}
        </div>
      )}
    </div>
  );
};