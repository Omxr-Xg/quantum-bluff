import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Swords, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TournamentService, Tournament } from '../services/tournament.service';
import { socket } from '../services/socket';

export function TournamentWidget() {
  const { t, i18n } = useTranslation();
  const [nextTournament, setNextTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNextTournament = async () => {
      try {
        const data = await TournamentService.getTournaments();
        setNextTournament(data.length > 0 ? data[0]! : null);
      } catch (err) {
        console.error('Tournament widget load error', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchNextTournament();
    const interval = setInterval(() => void fetchNextTournament(), 45_000);
    const onSocketUpdate = () => void fetchNextTournament();
    socket.on('tournament-updated', onSocketUpdate);
    return () => {
      clearInterval(interval);
      socket.off('tournament-updated', onSocketUpdate);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-48 animate-pulse items-center justify-center rounded-3xl border border-amber-200/20 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_34px_rgba(251,191,36,0.10),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        <Trophy className="w-8 h-8 text-amber-200/60" />
      </div>
    );
  }

  const lang = i18n.language;
  const dateLine =
    nextTournament &&
    t('tournament.widget.scheduledAt', {
      date: new Date(nextTournament.startTime).toLocaleDateString(lang),
      time: new Date(nextTournament.startTime).toLocaleTimeString(lang, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-amber-200/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.09),rgba(255,255,255,0.055)_34%,rgba(15,23,42,0.08))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_0_38px_rgba(251,191,36,0.11),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-all duration-500 hover:border-amber-200/35 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_48px_rgba(251,191,36,0.16),0_24px_66px_rgba(0,0,0,0.34)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-8 bottom-0 h-px bg-gradient-to-r from-transparent via-amber-400/35 to-transparent" />

      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-amber-200 font-bold uppercase tracking-widest text-xs mb-1">
            <Swords className="w-4 h-4" />
            <span>{t('tournament.widget.arena')}</span>
          </div>
          <h2 className="text-2xl font-black text-white italic">
            {nextTournament ? nextTournament.name : t('tournament.widget.none')}
          </h2>
        </div>
        <div className="rounded-2xl border border-amber-200/25 bg-amber-300/10 p-3 shadow-[0_0_22px_rgba(251,191,36,0.14)] backdrop-blur-md">
          <Trophy className="w-6 h-6 text-amber-200" />
        </div>
      </div>

      {nextTournament ? (
        <div className="space-y-4 relative z-10">
          <div className="flex items-center justify-between rounded-xl border border-amber-200/14 bg-white/[0.045] p-3 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-100/70" />
              <span className="text-slate-300 text-sm">{dateLine}</span>
            </div>
            <span className="text-amber-200 font-black text-sm">{nextTournament.prizePool} 💰</span>
          </div>
          
          <button 
            onClick={() => navigate('/tournaments')}
            className="w-full rounded-xl border border-amber-200/30 bg-gradient-to-r from-amber-700/80 via-yellow-700/70 to-amber-900/80 py-3 font-black text-white shadow-[0_0_26px_rgba(251,191,36,0.16)] transition-all hover:border-amber-100/45 hover:from-amber-600/85 hover:via-yellow-600/75 hover:to-amber-800/85 flex items-center justify-center gap-2 group/btn"
          >
            {t('tournament.widget.joinLobby')}
            <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      ) : (
        <div className="space-y-4 relative z-10">
          <p className="text-slate-400 text-sm">{t('tournament.widget.emptyHint')}</p>
          <button 
            onClick={() => navigate('/tournaments')}
            className="w-full rounded-xl border border-amber-200/20 bg-amber-300/10 py-3 font-bold text-amber-100 transition-all hover:border-amber-200/35 hover:bg-amber-300/14"
          >
            {t('tournament.widget.visitLobby')}
          </button>
        </div>
      )}
    </div>
  );
}
