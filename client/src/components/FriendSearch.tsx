import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../hooks/useUser';
import { useSearchUsersQuery, useSendFriendRequestMutation } from '../services/api';
import { Search, Loader2 } from 'lucide-react';
import { FriendSearchResultRow } from './FriendSearchResultRow';

const pokerGlassCard =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";
const pokerInput =
  "rounded-xl border border-white/10 bg-slate-950/55 text-white placeholder-slate-500 transition-all focus:border-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/25";

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
    <div className={`p-5 sm:p-8 ${pokerGlassCard}`}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
        <Search className="h-5 w-5 shrink-0 text-blue-200" />
        {t("friends.searchPlayers")}
      </h2>

      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t("friends.usernamePlaceholder")}
          className={`w-full py-3 pl-10 pr-4 ${pokerInput}`}
        />
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-blue-300" />
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-900/50 p-3 text-sm text-red-200">{t("friends.searchError")}</div>
      )}

      {results && results.length > 0 ? (
        <div className="space-y-2">
          {results.map((user) => (
            <FriendSearchResultRow
              key={user.id}
              user={user}
              viewerUserId={userId}
              onAdd={(username) => void handleSendRequest(username)}
              disabled={isSending}
            />
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
