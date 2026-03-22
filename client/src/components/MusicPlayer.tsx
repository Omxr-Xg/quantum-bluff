import { useState, useRef } from 'react';
import { useMusic } from '../contexts/MusicContext';
import { Volume2, VolumeX, Music } from 'lucide-react';

const HOVER_CLOSE_DELAY_MS = 250;

export const MusicPlayer = () => {
  const { isPlaying, volume, isMuted, toggleMute, setVolume } = useMusic();
  const [showVolume, setShowVolume] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setShowVolume(true);
  };

  const handleMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => setShowVolume(false), HOVER_CLOSE_DELAY_MS);
  };

  const displayVolume = isMuted ? 0 : volume;
  const volumeForSlider = isMuted ? 0 : volume;

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Contrôle du volume (popup au survol, se ferme 0.25s après sortie) */}
      {showVolume && (
        <div
          className="bg-slate-800 rounded-lg p-2 shadow-xl border border-slate-700"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1 hover:bg-slate-700 rounded transition"
              aria-label={isMuted ? 'Réactiver le son' : 'Muet'}
            >
              {isMuted || volume === 0 ? (
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
              value={volumeForSlider}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
              style={{
                background: `linear-gradient(to right, #a855f7 0%, #a855f7 ${displayVolume * 100}%, #4a5568 ${displayVolume * 100}%, #4a5568 100%)`,
              }}
            />
            <span className="text-white text-xs w-8 tabular-nums">{Math.round(displayVolume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Bouton principal : clic = mute/unmute */}
      <button
        type="button"
        onClick={toggleMute}
        className={`p-4 rounded-full shadow-xl transition-all transform hover:scale-105 ${
          isPlaying && !isMuted ? 'bg-purple-600 hover:bg-purple-500' : 'bg-slate-700 hover:bg-slate-600'
        }`}
        title={isMuted ? 'Réactiver le son' : 'Muet'}
        aria-label={isMuted ? 'Réactiver le son' : 'Muet'}
      >
        <Music className={`w-6 h-6 ${isPlaying && !isMuted ? 'text-white' : 'text-gray-300'}`} />
      </button>
    </div>
  );
};
