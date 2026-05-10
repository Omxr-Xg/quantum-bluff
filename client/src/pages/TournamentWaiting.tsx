import { useLocation, useNavigate } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSocket } from '../hooks/useSocket';
import { Trophy, Clock, Users } from 'lucide-react';
import { TournamentService } from '../services/tournament.service';
import { TournamentWaitingZipGame } from '../components/tournament/TournamentWaitingZipGame';

const isDev = import.meta.env.DEV;

function formatWaitTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TournamentWaiting() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const state = location.state as { survivorsCount: number; expectedTables: number } | null;
  const [survivorsCount, setSurvivorsCount] = useState(state?.survivorsCount ?? 1);
  const expectedTables = state?.expectedTables ?? 1;
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const waitStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    waitStartedAtRef.current = Date.now();
    setElapsedSeconds(0);
    const id = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - waitStartedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: { survivorsCount: number; expectedTables: number }) => {
      if (isDev) console.log('[TOURNOI_TRACE] waiting room tournament-waiting-final', data);
      setSurvivorsCount(data.survivorsCount);
    };

    const handleFinal = (data: { gameId: string; players: { userId: string; username: string; chips: number }[] }) => {
      if (isDev) console.log('[TOURNOI_TRACE] waiting room navigate to final/merge', { gameId: data.gameId, playerCount: data.players?.length });
      navigate(`/game?gameId=${data.gameId}&tournament=1`, { state: { tournamentPlayers: data.players } });
    };

    socket.on('tournament-waiting-final', handleUpdate);
    socket.on('tournament-final-table', handleFinal);
    socket.on('tournament-merge-table', handleFinal);

    return () => {
      socket.off('tournament-waiting-final', handleUpdate);
      socket.off('tournament-final-table', handleFinal);
      socket.off('tournament-merge-table', handleFinal);
    };
  }, [socket, navigate]);

  /**
   * Si les événements `tournament-final-table` / `tournament-merge-table` ont été manqués
   * (perte momentanée de socket, reconnexion, navigation un peu trop tardive…), on retrouve
   * la table active via l'API.
   *
   * Polling agressif au début (1.5 s) puis on relâche (5 s) pour ne pas marteler le serveur
   * si le joueur reste sur la page d'attente plusieurs minutes.
   */
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const start = Date.now();

    const poll = async () => {
      if (cancelled) return;
      try {
        const { gameId } = await TournamentService.getMyTournamentTable();
        if (cancelled) return;
        if (gameId) {
          if (isDev) console.log('[TOURNOI_TRACE] getMyTournamentTable recovered gameId', { gameId });
          navigate(`/game?gameId=${encodeURIComponent(gameId)}&tournament=1`);
          return;
        }
      } catch {
        /* ignore */
      }
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const delay = elapsed < 30_000 ? 1500 : 5000;
      timer = setTimeout(() => void poll(), delay);
    };

    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{t('tournament.waiting.title')}</h1>
        <p className="text-amber-200/90 text-sm font-medium mb-1">{t('tournament.waiting.wonTable')}</p>
        <p className="text-slate-400 mb-6">{t('tournament.waiting.subtitle')}</p>
        <div className="bg-slate-700 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('tournament.waiting.tablesDone')}
            </span>
            <span className="text-white font-bold">{survivorsCount}/{expectedTables}</span>
          </div>
          <div className="w-full bg-slate-600 rounded-full h-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(survivorsCount / expectedTables) * 100}%` }}
            />
          </div>
        </div>
        <div
          className="mb-4 rounded-xl bg-slate-700/60 border border-slate-600/60 px-4 py-3"
          role="timer"
          aria-label={t('tournament.waiting.timerLabel')}
        >
          <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">{t('tournament.waiting.timerLabel')}</div>
          <div className="text-2xl font-mono font-semibold text-white tabular-nums" aria-live="off">
            {formatWaitTime(elapsedSeconds)}
          </div>
        </div>
        <div className="mb-6">
          <TournamentWaitingZipGame />
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Clock className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('tournament.waiting.preparing')}</span>
        </div>
      </div>
    </div>
  );
}
