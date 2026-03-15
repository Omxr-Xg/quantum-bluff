import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

interface MusicContextType {
  isPlaying: boolean;
  volume: number;
  toggleMusic: () => void;
  setVolume: (volume: number) => void;
  playMusic: () => void;
  pauseMusic: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

const MUSIC_URL = '/music/background-music.mp3';

export const MusicProvider = ({ children }: { children: React.ReactNode }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedVolume = localStorage.getItem('musicVolume');
    const savedPlaying = localStorage.getItem('musicPlaying') === 'true';
    const initialVolume = savedVolume ? parseFloat(savedVolume) : 0.3;

    setVolumeState(initialVolume);
    audioRef.current = new Audio(MUSIC_URL);
    audioRef.current.loop = true;
    audioRef.current.volume = initialVolume;

    if (savedPlaying) {
      audioRef.current.play().catch(() => {
        console.log('Autoplay bloqué, attendre interaction utilisateur');
      });
      setIsPlaying(true);
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
