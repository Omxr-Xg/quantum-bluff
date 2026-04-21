import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../hooks/useUser';
import { useSearchUsersQuery, useSendFriendRequestMutation } from '../services/api';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { getPlayerAvatar } from '../utils/avatars';
import { ImageWithFallback } from './figma/ImageWithFallback';

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
    <div className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-2xl sm:rounded-2xl sm:p-8">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
        <Search className="h-5 w-5 shrink-0 text-amber-400" />
        {t("friends.searchPlayers")}
      </h2>

      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("friends.usernamePlaceholder")}
          className="w-full rounded-xl border border-slate-600 bg-slate-900/50 py-3 pl-10 pr-4 text-white placeholder-gray-500 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-green-400" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/50 p-3 text-sm text-red-200">{t("friends.searchError")}</div>
      )}

      {results && results.length > 0 ? (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-600 bg-slate-800/50 p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-600 bg-slate-700">
                  {getPlayerAvatar(user.username, user.id, userId, user.avatarUrl) ? (
                    <ImageWithFallback
                      src={getPlayerAvatar(user.username, user.id, userId, user.avatarUrl)}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-white">{user.username.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-white">{user.username}</div>
                  <div className="text-xs text-gray-400">
                    {t("friends.level", { level: user.level })} •{" "}
                    {t("friends.gamesCount", {
                      count: user.playerStats?.totalGames ?? user.stats?.totalGames ?? 0,
                    })}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSendRequest(user.username)}
                disabled={isSending}
                className="rounded-lg bg-slate-700 p-2 text-white transition hover:bg-slate-600 disabled:opacity-50"
                title={t("friends.addAsFriend")}
              >
                <UserPlus className="h-5 w-5" />
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