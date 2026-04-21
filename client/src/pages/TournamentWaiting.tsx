import { useLocation, useNavigate } from 'react-router';
import { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { Trophy, Clock, Users } from 'lucide-react';

export function TournamentWaiting() {
  const location = useLocation();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const state = location.state as { survivorsCount: number; expectedTables: number } | null;
  const [survivorsCount, setSurvivorsCount] = useState(state?.survivorsCount ?? 1);
  const expectedTables = state?.expectedTables ?? 1;

  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: { survivorsCount: number; expectedTables: number }) => {
      setSurvivorsCount(data.survivorsCount);
    };

    const handleFinal = (data: { gameId: string; players: { userId: string; username: string; chips: number }[] }) => {
      navigate(`/game?gameId=${data.gameId}`, { state: { tournamentPlayers: data.players } });
    };

    socket.on('tournament-waiting-final', handleUpdate);
    socket.on('tournament-final-table', handleFinal);

    return () => {
      socket.off('tournament-waiting-final', handleUpdate);
      socket.off('tournament-final-table', handleFinal);
    };
  }, [socket, navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
          <Trophy className="w-8 h-8 text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Vous êtes en finale !</h1>
        <p className="text-slate-400 mb-6">En attente des autres tables...</p>
        <div className="bg-slate-700 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Tables terminées
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
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <Clock className="w-4 h-4 animate-spin" />
          <span className="text-sm">La table finale se prépare...</span>
        </div>
      </div>
    </div>
  );
}
