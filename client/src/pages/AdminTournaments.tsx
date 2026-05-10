import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 IMPORT AJOUTÉ
import { Trophy, Calendar, Users, Coins, PlusCircle, ArrowLeft, Globe, Lock } from 'lucide-react'; // 👈 ArrowLeft AJOUTÉ
import { useTranslation } from 'react-i18next';
import { TournamentService } from '../services/tournament.service';
import { useToast } from '../contexts/ToastContext';

export function AdminTournaments() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const navigate = useNavigate(); // 👈 INITIALISATION DE NAVIGATE
  const [loading, setLoading] = useState(false);
  const [quickStartMinutes, setQuickStartMinutes] = useState<number>(15);
  const [formData, setFormData] = useState({
    name: '',
    buyIn: 100,
    maxPlayers: 9,
    startTime: '',
    visibility: 'PUBLIC' as 'PUBLIC' | 'PRIVATE',
  });

  const setStartInMinutes = (minutes: number) => {
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(now.getMinutes() + minutes);
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setFormData((prev) => ({ ...prev, startTime: `${yyyy}-${mm}-${dd}T${hh}:${min}` }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!formData.startTime) {
        addToast(t('tournament.admin.errorUnknown'), "error");
        setLoading(false);
        return;
      }

      // Convertir la date locale du formulaire au format ISO attendu par le serveur
      const isoDate = new Date(formData.startTime).toISOString();
      
      await TournamentService.createTournament({
        name: formData.name,
        buyIn: formData.buyIn,
        maxPlayers: formData.maxPlayers,
        startTime: isoDate,
        visibility: formData.visibility,
      });
      
      addToast(t('tournament.admin.toastCreated'), "success");
      
      // 🚀 REDIRECTION VERS LE LOBBY APRÈS CRÉATION
      navigate('/tournaments'); 
      
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('tournament.admin.errorUnknown');
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 mt-10">
      
      {/* 🔙 LE NOUVEAU BOUTON RETOUR */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/tournaments')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors w-fit group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold text-sm uppercase tracking-wider">{t('tournament.admin.backToTournaments')}</span>
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Déco */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />

        <div className="flex items-center gap-4 mb-8 relative z-10">
          <div className="bg-amber-500/20 p-3 rounded-2xl border border-amber-500/30">
            <Trophy className="w-8 h-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white italic uppercase tracking-wider">
              {t('tournament.admin.pageTitle')}{' '}
              <span className="text-amber-500">{t('tournament.admin.pageTitleHighlight')}</span>
            </h1>
            <p className="text-slate-400 text-sm">{t('tournament.admin.pageSubtitle')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          {/* Nom du tournoi */}
          <div>
            <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 block">{t('tournament.admin.nameLabel')}</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder={t('tournament.admin.namePlaceholder')}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Buy-in */}
            <div>
              <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" /> {t('tournament.admin.buyInLabel')}
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
                <Users className="w-4 h-4 text-amber-500" /> {t('tournament.admin.maxPlayersLabel')}
              </label>
              <input
                type="number"
                min="4"
                max="36"
                required
                value={formData.maxPlayers}
                onChange={(e) => setFormData({...formData, maxPlayers: Number(e.target.value)})}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
              />
              <p className="text-slate-400 text-xs mt-1">{t('tournament.admin.playersRangeHint')}</p>
            </div>
          </div>

          {/* Visibilité */}
          <div>
            <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 block">
              {t("tournament.admin.visibilityLabel")}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, visibility: 'PUBLIC' })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold transition ${
                  formData.visibility === 'PUBLIC'
                    ? 'border-green-500 bg-green-600/20 text-green-300'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Globe className="w-4 h-4" />
                {t("lobby.public")}
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, visibility: 'PRIVATE' })}
                className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold transition ${
                  formData.visibility === 'PRIVATE'
                    ? 'border-purple-500 bg-purple-600/20 text-purple-300'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Lock className="w-4 h-4" />
                {t("lobby.private")}
              </button>
            </div>
          </div>

          {/* Date et Heure */}
          <div>
            <label className="text-slate-300 text-sm font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-500" /> {t('tournament.admin.startTimeLabel')}
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[5, 15, 30, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setQuickStartMinutes(m);
                    setStartInMinutes(m);
                  }}
                  className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    quickStartMinutes === m
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {t("tournament.admin.presetPlusMinutes", { minutes: m })}
                </button>
              ))}
            </div>
            <input 
              type="datetime-local" 
              required
              value={formData.startTime}
              onChange={(e) => setFormData({...formData, startTime: e.target.value})}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
            />
            <p className="mt-2 text-xs text-slate-400">{t("tournament.admin.startTimeHint")}</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            {loading ? t('tournament.admin.submitting') : t('tournament.admin.submit')}
            <PlusCircle className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}