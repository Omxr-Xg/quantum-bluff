import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Swords, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TournamentService, Tournament } from '../services/tournament.service';

export function TournamentWidget() {
  const [nextTournament, setNextTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNextTournament = async () => {
      try {
        const data = await TournamentService.getTournaments();
        // On prend juste le premier tournoi (le plus proche dans le temps)
        if (data.length > 0) {
          setNextTournament(data[0]);
        }
      } catch (err) {
        console.error("Erreur chargement widget tournoi", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNextTournament();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 animate-pulse flex items-center justify-center h-48">
        <Trophy className="w-8 h-8 text-amber-500/50" />
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-3xl p-6 relative overflow-hidden group hover:border-amber-500/50 transition-all duration-500 shadow-xl">
      {/* Effet de brillance en fond */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-all duration-500" />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-bold uppercase tracking-widest text-xs mb-1">
            <Swords className="w-4 h-4" />
            <span>Arène des Tournois</span>
          </div>
          <h2 className="text-2xl font-black text-white italic">
            {nextTournament ? nextTournament.name : "Aucun Tournoi"}
          </h2>
        </div>
        <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
          <Trophy className="w-6 h-6 text-amber-500" />
        </div>
      </div>

      {nextTournament ? (
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-700/50">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 text-sm">
                Le {new Date(nextTournament.startTime).toLocaleDateString('fr-FR')} à {new Date(nextTournament.startTime).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <span className="text-green-400 font-black text-sm">{nextTournament.prizePool} 💰</span>
          </div>
          
          <button 
            onClick={() => navigate('/tournaments')}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2 group/btn"
          >
            REJOINDRE LE LOBBY
            <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          <p className="text-slate-400 text-sm">Les organisateurs préparent la prochaine bataille. Revenez bientôt !</p>
          <button 
            onClick={() => navigate('/tournaments')}
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-all"
          >
            Visiter le Lobby
          </button>
        </div>
      )}
    </div>
  );
}