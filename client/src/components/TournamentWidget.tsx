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
      <div className="flex h-48 animate-pulse items-center justify-center rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <Trophy className="w-8 h-8 text-blue-200/50" />
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-500 hover:border-white/20">
      {/* Effet de brillance en fond */}
      <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl transition-all duration-500 group-hover:bg-blue-500/16" />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-blue-200 font-bold uppercase tracking-widest text-xs mb-1">
            <Swords className="w-4 h-4" />
            <span>Arène des Tournois</span>
          </div>
          <h2 className="text-2xl font-black text-white italic">
            {nextTournament ? nextTournament.name : "Aucun Tournoi"}
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-md">
          <Trophy className="w-6 h-6 text-blue-200" />
        </div>
      </div>

      {nextTournament ? (
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-md">
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
            className="w-full rounded-xl border border-blue-300/15 bg-blue-950/75 py-3 font-black text-white transition-all hover:border-blue-200/25 hover:bg-blue-900/80 flex items-center justify-center gap-2 group/btn"
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
            className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-3 font-bold text-white transition-all hover:bg-white/[0.10]"
          >
            Visiter le Lobby
          </button>
        </div>
      )}
    </div>
  );
}
