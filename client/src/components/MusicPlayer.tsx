import { useState } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { Volume2, VolumeX, Music } from 'lucide-react';

export const MusicPlayer = () => {
  const { isPlaying, volume, toggleMusic, setVolume } = useMusic();
  const [showVolume, setShowVolume] = useState(false);

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2"
      onMouseEnter={() => setShowVolume(true)}
      onMouseLeave={() => setShowVolume(false)}
    >
      {/* Contrôle du volume (popup au survol) */}
      {showVolume && (
        <div className="bg-slate-800 rounded-lg p-2 shadow-xl border border-slate-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMusic}
              className="p-1 hover:bg-slate-700 rounded transition"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {volume === 0 ? (
                <VolumeX className="w-4 h-4 text-gray-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${volume * 100}%, #4a5568 ${volume * 100}%, #4a5568 100%)`,
              }}
            />
            <span className="text-white text-xs w-8 tabular-nums">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Bouton principal */}
      <button
        type="button"
        onClick={toggleMusic}
        className={`p-4 rounded-full shadow-xl transition-all transform hover:scale-105 ${
          isPlaying ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-700 hover:bg-slate-600'
        }`}
        title={isPlaying ? 'Pause' : 'Jouer la musique'}
        aria-label={isPlaying ? 'Pause musique' : 'Jouer la musique'}
      >
        <Music className={`w-6 h-6 ${isPlaying ? 'text-white' : 'text-gray-300'}`} />
      </button>
    </div>
  );
};
