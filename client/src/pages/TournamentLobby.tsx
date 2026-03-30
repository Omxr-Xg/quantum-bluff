import React, { useEffect, useState } from 'react';
import { Trophy, Users, Coins, Clock, ChevronRight, ArrowLeft, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TournamentService, Tournament } from '../services/tournament.service';
import { useToast } from '../contexts/ToastContext';
import { socket } from '../services/socket'; // 👈 IMPORT DU SOCKET

// Fonction utilitaire pour le compte à rebours
function formatTimeLeft(targetDate: string) {
  const difference = +new Date(targetDate) - +new Date();
  if (difference <= 0) return "Démarrage...";

  const minutes = Math.floor((difference / 1000 / 60) % 60);
  const seconds = Math.floor((difference / 1000) % 60);

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function TournamentLobby() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setNow] = useState(new Date()); // Pour forcer le refresh du timer
  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadTournaments = async () => {
    try {
      const data = await TournamentService.getTournaments();
      setTournaments(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
    
    // Refresh de la liste toutes les minutes en sécurité
    const listInterval = setInterval(loadTournaments, 60000);
    // Refresh du timer toutes les secondes
    const timerInterval = setInterval(() => setNow(new Date()), 1000);

    // 🎧 NOUVEAU : Écouteur en temps réel pour actualiser les compteurs de joueurs
    const handleTournamentUpdate = () => {
      console.log("🔄 Mise à jour des tournois reçue via Socket !");
      loadTournaments();
    };

    socket.on('tournament-updated', handleTournamentUpdate);

    return () => {
      clearInterval(listInterval);
      clearInterval(timerInterval);
      socket.off('tournament-updated', handleTournamentUpdate); // On débranche au démontage
    };
  }, []);

  const handleJoin = async (id: string) => {
    try {
      await TournamentService.joinTournament(id);
      addToast("Inscription validée !", "success");
      loadTournaments(); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      addToast(message, "error");
    }
  };

  const handleLeave = async (id: string) => {
    try {
        await TournamentService.leaveTournament(id);
        addToast("Vous avez quitté le tournoi.", "info");
        loadTournaments(); 
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        addToast(message, "error");
    }
  };

  if (loading && tournaments.length === 0) {
    return <div className="flex justify-center items-center h-64 text-amber-500 font-bold">Initialisation du lobby...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">

        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm uppercase tracking-wider">Retour au Casino</span>
          </button>

          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
              Lobby <span className="text-amber-500">Tournois</span>
            </h1>
            <p className="text-slate-400">Affrontez l'élite. Gagnez gros.</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/tournaments')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 p-4 rounded-2xl border border-slate-700 transition-all shadow-xl group"
          >
            <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-bold text-sm uppercase tracking-wider">Créer</span>
          </button>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
            <Trophy className="text-amber-500 w-8 h-8" />
          </div>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-slate-800/40 border-2 border-dashed border-slate-700 rounded-3xl p-20 text-center">
          <p className="text-slate-500 text-xl italic">La salle est vide... Revenez plus tard !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tournaments.map((t) => (
            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-amber-500/40 transition-all duration-300 group shadow-2xl">
              
              {/* Header de la Carte */}
              <div className="bg-gradient-to-br from-amber-600 to-amber-400 p-5">
                <h3 className="text-2xl font-black text-slate-950 truncate uppercase italic">{t.name}</h3>
              </div>

              {/* Infos & Stats */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <Coins className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Buy-in</span>
                    </div>
                    <p className="text-white font-black text-lg">{t.buyIn}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Joueurs</span>
                    </div>
                    <p className="text-white font-black text-lg">{t._count.players}/{t.maxPlayers}</p>
                  </div>
                </div>

                {/* Timer dynamique */}
                <div className="flex items-center justify-center gap-3 bg-slate-800/80 py-3 rounded-xl border border-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span className="text-amber-200 font-mono font-bold tracking-widest">
                    Lancement : {formatTimeLeft(t.startTime)}
                  </span>
                </div>

                {/* Footer & Action */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-end mb-6">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Cagnotte</span>
                      <span className="text-2xl font-black text-green-400 leading-none">{t.prizePool} 💰</span>
                    </div>
                  </div>

                  {t.isJoined ? (
                    <div className="flex gap-2">
                        <div className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 font-black py-4 rounded-2xl flex items-center justify-center gap-3 tracking-widest uppercase italic text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                        Inscrit
                        </div>
                        <button
                        onClick={() => handleLeave(t.id)}
                        className="px-4 bg-red-500/20 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all font-bold text-xs uppercase"
                        >
                        Quitter
                        </button>
                    </div>
                    ) : (
                    <button
                        onClick={() => handleJoin(t.id)}
                        disabled={t._count.players >= t.maxPlayers}
                        className="w-full bg-amber-500 hover:bg-white text-slate-950 font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-[1.02] shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t._count.players >= t.maxPlayers ? 'TOURNOI COMPLET' : "S'INSCRIRE"}
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}