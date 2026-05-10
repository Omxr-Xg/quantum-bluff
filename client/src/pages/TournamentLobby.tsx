import React, { useCallback, useEffect, useState } from 'react';
import { Trophy, Users, Coins, Clock, ChevronRight, ArrowLeft, Settings, Eye, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TournamentService,
  Tournament,
  type TournamentSpectatePayload,
} from '../services/tournament.service';
import { useToast } from '../contexts/ToastContext';
import { socket } from '../services/socket'; // 👈 IMPORT DU SOCKET
import { ChipIcon } from '../components/ChipIcon';

function formatTimeLeft(
  targetDate: string,
  status: Tournament['status'],
  t: (key: string, opts?: Record<string, string>) => string,
) {
  const difference = +new Date(targetDate) - +new Date();
  if (difference <= 0) {
    if (status === 'PENDING') {
      return t('tournament.lobby.startingSoon', 'Démarrage en cours…');
    }
    return t('tournament.lobby.starting');
  }

  const minutes = Math.floor((difference / 1000 / 60) % 60);
  const seconds = Math.floor((difference / 1000) % 60);
  const time = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  return t('tournament.lobby.launch', { time });
}

export function TournamentLobby() {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setNow] = useState(new Date()); // Pour forcer le refresh du timer
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [spectateOpenForId, setSpectateOpenForId] = useState<string | null>(null);
  const [spectateLoading, setSpectateLoading] = useState(false);
  const [spectatePayload, setSpectatePayload] = useState<TournamentSpectatePayload | null>(null);

  const loadTournaments = useCallback(async () => {
    try {
      const data = await TournamentService.getTournaments();
      setTournaments(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('tournament.lobby.errorUnknown');
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [t, addToast]);

  useEffect(() => {
    loadTournaments();
    
    // Refresh de la liste toutes les minutes en sécurité
    const listInterval = setInterval(loadTournaments, 60000);
    // Refresh du timer toutes les secondes
    const timerInterval = setInterval(() => setNow(new Date()), 1000);

    const handleTournamentUpdate = () => {
      loadTournaments();
    };

    socket.on('tournament-updated', handleTournamentUpdate);

    return () => {
      clearInterval(listInterval);
      clearInterval(timerInterval);
      socket.off('tournament-updated', handleTournamentUpdate);
    };
  }, [loadTournaments]);

  /** Pendant qu’un PENDING a dépassé l’heure de départ, rafraîchir souvent jusqu’au passage ACTIVE. */
  useEffect(() => {
    const needsFastPoll = tournaments.some(
      (t) => t.status === 'PENDING' && new Date(t.startTime).getTime() <= Date.now(),
    );
    if (!needsFastPoll) return;
    const fast = setInterval(() => void loadTournaments(), 3000);
    return () => clearInterval(fast);
  }, [tournaments, loadTournaments]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadTournaments();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadTournaments]);

  const handleJoin = async (id: string) => {
    try {
      await TournamentService.joinTournament(id);
      addToast(t('tournament.lobby.toastJoin'), "success");
      loadTournaments(); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('tournament.lobby.errorUnknown');
      addToast(message, "error");
    }
  };

  const closeSpectateModal = () => {
    setSpectateOpenForId(null);
    setSpectatePayload(null);
    setSpectateLoading(false);
  };

  const openSpectateModal = async (tournamentId: string) => {
    setSpectateOpenForId(tournamentId);
    setSpectatePayload(null);
    setSpectateLoading(true);
    try {
      const payload = await TournamentService.getSpectateTables(tournamentId);
      setSpectatePayload(payload);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('tournament.lobby.errorUnknown');
      addToast(message, 'error');
      closeSpectateModal();
    } finally {
      setSpectateLoading(false);
    }
  };

  const handleLeave = async (id: string) => {
    try {
        await TournamentService.leaveTournament(id);
        addToast(t('tournament.lobby.toastLeave'), "info");
        loadTournaments(); 
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : t('tournament.lobby.errorUnknown');
        addToast(message, "error");
    }
  };

  if (loading && tournaments.length === 0) {
    return <div className="flex justify-center items-center h-64 text-amber-500 font-bold">{t('tournament.lobby.loading')}</div>;
  }

  const canRegisterForTournament = (trn: Tournament) =>
    trn.status === 'PENDING' && new Date(trn.startTime).getTime() > Date.now();

  const registerButtonLabel = (trn: Tournament) => {
    if (trn._count.players >= trn.maxPlayers) return t('tournament.lobby.full');
    if (trn.status === 'PENDING' && new Date(trn.startTime).getTime() <= Date.now()) {
      return t('tournament.lobby.startingSoon', 'Démarrage en cours…');
    }
    if (!canRegisterForTournament(trn)) return t('tournament.lobby.registrationClosed');
    return trn.visibility === 'PRIVATE'
      ? t('tournament.lobby.requestAccess')
      : t('tournament.lobby.register');
  };

  return (
    <div className="w-full min-w-0 p-4 sm:p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-10">

        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-sm uppercase tracking-wider">{t('tournament.lobby.backToCasino')}</span>
          </button>

          <div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter italic">
              {t('tournament.lobby.title')}{' '}
              <span className="text-amber-500">{t('tournament.lobby.titleHighlight')}</span>
            </h1>
            <p className="text-slate-400">{t('tournament.lobby.subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/tournaments')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 hover:border-amber-500/50 p-4 rounded-2xl border border-slate-700 transition-all shadow-xl group"
          >
            <Settings className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
            <span className="font-bold text-sm uppercase tracking-wider">{t('tournament.lobby.create')}</span>
          </button>

          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 shadow-xl">
            <Trophy className="text-amber-500 w-8 h-8" />
          </div>
        </div>
      </div>

      {tournaments.length === 0 ? (
        <div className="bg-slate-800/40 border-2 border-dashed border-slate-700 rounded-3xl p-20 text-center">
          <p className="text-slate-500 text-xl italic">{t('tournament.lobby.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tournaments.map((trn) => (
            <div key={trn.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden hover:border-amber-500/40 transition-all duration-300 group shadow-2xl">
              
              {/* Header de la Carte */}
              <div className="bg-gradient-to-br from-amber-600 to-amber-400 p-5">
                <h3 className="text-2xl font-black text-slate-950 truncate uppercase italic">{trn.name}</h3>
              </div>

              {/* Infos & Stats */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <Coins className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t('tournament.lobby.buyIn')}</span>
                    </div>
                    <p className="text-white font-black text-lg">{trn.buyIn}</p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <div className="flex items-center gap-2 text-amber-500 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{t('tournament.lobby.players')}</span>
                    </div>
                    <p className="text-white font-black text-lg">{trn._count.players}/{trn.maxPlayers}</p>
                  </div>
                </div>

                {/* Timer dynamique */}
                <div className="flex items-center justify-center gap-3 bg-slate-800/80 py-3 rounded-xl border border-amber-500/20">
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                  <span className="text-amber-200 font-mono font-bold tracking-widest">
                    {trn.status === 'ACTIVE'
                      ? t('tournament.lobby.live')
                      : formatTimeLeft(trn.startTime, trn.status, t)}
                  </span>
                </div>

                {trn.status === 'ACTIVE' && (
                  <button
                    type="button"
                    onClick={() => void openSpectateModal(trn.id)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-400/40 bg-indigo-500/15 py-3 font-bold text-sm uppercase tracking-wide text-indigo-100 transition hover:bg-indigo-500/25"
                  >
                    <Eye className="h-5 w-5" aria-hidden />
                    {t('tournament.lobby.spectate')}
                  </button>
                )}

                {/* Footer & Action */}
                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-end mb-6">
                    <div className="flex flex-col">
                      <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{t('tournament.lobby.prizePool')}</span>
                      <span className="inline-flex items-center gap-1.5 text-2xl font-black text-green-400 leading-none">
                        {trn.prizePool}
                        <ChipIcon size="lg" className="h-7 w-7 shrink-0" />
                      </span>
                    </div>
                  </div>

                  {trn.status === 'PENDING' && trn.players && trn.players.length > 0 && (
                  <div className="mt-4 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-400" />
                      <span className="text-white font-semibold text-sm">
                        {t('tournament.lobby.registeredTitle', { current: String(trn.players.length), max: String(trn.maxPlayers) })}
                      </span>
                    </div>
                    {trn.players.map((player, index) => (
                      <div
                        key={player.user.id}
                        className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-slate-500 text-xs w-5">#{index + 1}</span>
                          <span className="text-white text-sm">{player.user.username}</span>
                        </div>
                        <span className="text-xs text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                          {t('tournament.lobby.levelShort', { level: String(Math.floor((player.user.experience ?? 0) / 1000) + 1) })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {trn.isJoined ? (
                    <div className="flex gap-2">
                        <div className="flex-1 bg-green-500/10 border border-green-500/30 text-green-400 font-black py-4 rounded-2xl flex items-center justify-center gap-3 tracking-widest uppercase italic text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-ping" />
                        {t('tournament.lobby.registered')}
                        </div>
                        <button
                        onClick={() => handleLeave(trn.id)}
                        className="px-4 bg-red-500/20 border border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all font-bold text-xs uppercase"
                        >
                        {t('tournament.lobby.leave')}
                        </button>
                    </div>
                    ) : (
                    <button
                        onClick={async () => {
                          if (!canRegisterForTournament(trn)) return;
                          if (trn.visibility === 'PRIVATE') {
                            try {
                              await TournamentService.requestJoinTournament(trn.id);
                              addToast(t('tournament.lobby.requestAccessToast'), "success");
                            } catch (err: unknown) {
                              const message = err instanceof Error ? err.message : t('tournament.lobby.errorUnknown');
                              addToast(message, "error");
                            }
                            return;
                          }
                          handleJoin(trn.id);
                        }}
                        disabled={
                          trn._count.players >= trn.maxPlayers || !canRegisterForTournament(trn)
                        }
                        className="w-full bg-amber-500 hover:bg-white text-slate-950 font-black py-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 group-hover:scale-[1.02] shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {registerButtonLabel(trn)}
                        <ChevronRight className="w-6 h-6" />
                    </button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {spectateOpenForId && (
        <div
          className="fixed inset-0 z-[500] flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={closeSpectateModal}
          role="presentation"
        >
          <div
            className="max-h-[min(85vh,32rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="spectate-modal-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="spectate-modal-title" className="text-lg font-bold text-white">
                  {t('tournament.lobby.spectatePickTable')}
                </h2>
                <p className="mt-1 text-xs text-slate-400">{t('tournament.lobby.spectateHintCards')}</p>
              </div>
              <button
                type="button"
                onClick={closeSpectateModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                aria-label={t('game.help.close')}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {spectateLoading && (
              <p className="py-8 text-center text-slate-400">{t('tournament.lobby.loading')}</p>
            )}
            {!spectateLoading && spectatePayload && (
              <>
                <p className="mb-3 text-sm font-semibold text-amber-200/90">{spectatePayload.tournamentName}</p>
                {spectatePayload.tables.length === 0 ? (
                  <p className="text-slate-500">{t('tournament.lobby.spectateNoTables')}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {spectatePayload.tables.map((tab) => (
                      <li key={tab.roomId}>
                        <button
                          type="button"
                          disabled={!tab.live}
                          onClick={() => {
                            navigate(`/game?gameId=${encodeURIComponent(tab.roomId)}&spectate=1&tournament=1`);
                            closeSpectateModal();
                          }}
                          className="flex w-full flex-col items-stretch gap-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-left transition hover:border-amber-500/40 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <span className="font-bold text-white">
                            {t('tournament.lobby.spectateTableN', { n: String(tab.tableNumber) })}
                            {!tab.live ? (
                              <span className="ml-2 text-xs font-normal text-slate-500">
                                ({t('tournament.lobby.spectateEnded')})
                              </span>
                            ) : null}
                          </span>
                          <span className="text-xs text-slate-400">
                            {t('tournament.lobby.spectatePlayerCount', {
                              count: String(tab.players.length),
                            })}
                          </span>
                          <span className="truncate text-[11px] text-slate-500">
                            {tab.players.map((p) => p.username).join(' · ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}