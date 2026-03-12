import { useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { useSearchUsersQuery, useSendFriendRequestMutation } from '../services/api';
import { Search, UserPlus, Loader2 } from 'lucide-react';

export const FriendSearch = () => {
  const { userId } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [sendRequest, { isLoading: isSending }] = useSendFriendRequestMutation();

  // Debounce la recherche (attend 500ms après la dernière frappe)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: results, isLoading, error } = useSearchUsersQuery(debouncedTerm, {
    skip: debouncedTerm.length < 2, // Ne cherche qu'à partir de 2 caractères
  });

  const handleSendRequest = async (receiverUsername: string) => {
    if (!userId) return;
    try {
      await sendRequest({ senderId: userId, receiverUsername }).unwrap();
      alert(`Demande d'ami envoyée à ${receiverUsername}`);
    } catch (err) {
      console.error('Erreur:', err);
      alert('Erreur lors de l\'envoi de la demande');
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-purple-500">
      <h2 className="text-xl text-white font-bold mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-purple-400" />
        Rechercher des joueurs
      </h2>

      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nom d'utilisateur..."
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
          Erreur de recherche
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
                  Niveau {user.level} • {user.stats.totalGames} parties
                </div>
              </div>
              <button
                onClick={() => handleSendRequest(user.username)}
                disabled={isSending}
                className="bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 text-white p-2 rounded-lg transition"
                title="Ajouter en ami"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      ) : debouncedTerm.length >= 2 && !isLoading && (
        <div className="text-center py-4 text-gray-400">
          Aucun joueur trouvé
        </div>
      )}

      {debouncedTerm.length < 2 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          Tapez au moins 2 caractères pour rechercher
        </div>
      )}
    </div>
  );
};
