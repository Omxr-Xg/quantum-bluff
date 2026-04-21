import { useState, useRef } from 'react';
import { useAudio } from '../contexts/MusicContext';
import { Volume2, VolumeX, Music } from 'lucide-react';

const HOVER_CLOSE_DELAY_MS = 250;

export const MusicPlayer = () => {
  const { bgmPlaying, bgmVolume, bgmEnabled, toggleBgm, setBgmVolume, playSfx } = useAudio();
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

  const displayVolume = bgmEnabled ? bgmVolume : 0;
  const volumeForSlider = bgmEnabled ? bgmVolume : 0;
  const toggleMusic = () => {
    toggleBgm();
    playSfx("uiClick");
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {showVolume && (
        <div
          className="bg-slate-800 rounded-lg p-2 shadow-xl border border-slate-700"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMusic}
              className="p-1 hover:bg-slate-700 rounded transition"
              aria-label={bgmEnabled ? 'Couper la musique' : 'Activer la musique'}
            >
              {!bgmEnabled || bgmVolume === 0 ? (
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
              onChange={(e) => setBgmVolume(parseFloat(e.target.value))}
              className="w-24 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
              style={{
                background: `linear-gradient(to right, #f59e0b 0%, #f59e0b ${displayVolume * 100}%, #4a5568 ${displayVolume * 100}%, #4a5568 100%)`,
              }}
            />
            <span className="text-white text-xs w-8 tabular-nums">{Math.round(displayVolume * 100)}%</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={toggleMusic}
        className={`p-4 rounded-full shadow-xl transition-all transform hover:scale-105 ${
          bgmPlaying && bgmEnabled ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-700 hover:bg-slate-600'
        }`}
        title={bgmEnabled ? 'Couper la musique' : 'Activer la musique'}
        aria-label={bgmEnabled ? 'Couper la musique' : 'Activer la musique'}
      >
        <Music className={`w-6 h-6 ${bgmPlaying && bgmEnabled ? 'text-white' : 'text-gray-300'}`} />
      </button>
    </div>
  );
};
