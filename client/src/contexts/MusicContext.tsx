import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import musicUrl from '@/assets/music/background-music.mp3';

interface MusicContextType {
  isPlaying: boolean;
  volume: number;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
  playMusic: () => void;
  pauseMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Import pour que le chemin soit correct en dev, build et déploiement (y compris sous base path)
import musicUrl from '@/assets/music/background-music.mp3';

export const MusicProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedVolume = localStorage.getItem('musicVolume');
    const savedPlaying = localStorage.getItem('musicPlaying') === 'true';
    const initialVolume = savedVolume ? parseFloat(savedVolume) : 0.3;

    setVolumeState(initialVolume);

    try {
      const audio = new Audio(musicUrl);
      audio.loop = true;
      audio.volume = initialVolume;
      audio.addEventListener('error', () => {
        // Évite les 404 bruyants si le fichier est absent
      });
      audioRef.current = audio;

      if (savedPlaying) {
        audio.play().catch(() => {
          // Autoplay bloqué par le navigateur
        });
        setIsPlaying(true);
      }
    } catch {
      // Ignorer silencieusement si la création de l'Audio échoue
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      localStorage.setItem('musicVolume', volume.toString());
    }
  }, [volume]);

  const toggleMusic = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('musicPlaying', 'false');
    } else {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      localStorage.setItem('musicPlaying', 'true');
    }
  };

  const setVolume = (v: number) => {
    setVolumeState(v);
  };

  const playMusic = () => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.play().catch(() => {});
      setIsPlaying(true);
      localStorage.setItem('musicPlaying', 'true');
    }
  };

  const pauseMusic = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      localStorage.setItem('musicPlaying', 'false');
    }
  };

  return (
    <MusicContext.Provider
      value={{
        isPlaying,
        volume,
        toggleMusic,
        setVolume,
        playMusic,
        pauseMusic,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within MusicProvider');
  return context;
};
