import React, { useState } from 'react';
import { Trophy, Calendar, Users, Coins, PlusCircle } from 'lucide-react';
import { TournamentService } from '../services/tournament.service';
import { useToast } from '../contexts/ToastContext';

export function AdminTournaments() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    buyIn: 100,
    maxPlayers: 9,
    startTime: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Convertir la date locale du formulaire au format ISO attendu par le serveur
      const isoDate = new Date(formData.startTime).toISOString();
      
      await TournamentService.createTournament({
        ...formData,
        startTime: isoDate
      });
      
      addToast("Tournoi créé avec succès !", "success");
      setFormData({ name: '', buyIn: 100, maxPlayers: 9, startTime: '' }); // Reset
    } catch (err: any) {
      addToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Déco */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-wider">Créer un <span className="text-amber-500">Tournoi</span></h1>
            <p className="text-slate-400 text-sm">Panneau d'administration - Réservé aux organisateurs</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Nom du tournoi */}
          <div>
            <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 block">Nom du Tournoi</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Ex: Sunday Million, Turbo Cup..."
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Buy-in */}
            <div>
              <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" /> Buy-in (Jetons)
              </label>
              <input 
                type="number" 
                min="0"
                required
                value={formData.buyIn}
                onChange={(e) => setFormData({...formData, buyIn: Number(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
              />
            </div>

            {/* Joueurs Max */}
            <div>
              <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" /> Joueurs Max
              </label>
              <input 
                type="number" 
                min="2"
                max="1000"
                required
                value={formData.maxPlayers}
                onChange={(e) => setFormData({...formData, maxPlayers: Number(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
              />
            </div>
          </div>

          {/* Date et Heure */}
          <div>
            <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" /> Date et Heure de lancement
            </label>
            <input 
              type="datetime-local" 
              required
              value={formData.startTime}
              onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {loading ? "CRÉATION EN COURS..." : "GÉNÉRER LE TOURNOI"}
            <PlusCircle className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}