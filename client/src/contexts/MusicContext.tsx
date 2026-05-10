import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import musicSrc from '@/assets/music/background-music.mp3';
import victorySound from '@/assets/sounds/victory.mp3';

type SfxName =
  | 'uiHover'
  | 'uiClick'
  | 'uiSelect'
  | 'modalOpen'
  | 'modalClose'
  | 'success'
  | 'notification'
  | 'victory'
  | 'timerTick'
  | 'timerEnd';

interface AudioContextType {
  bgmEnabled: boolean;
  bgmVolume: number;
  bgmPlaying: boolean;
  sfxEnabled: boolean;
  sfxVolume: number;
  startBgm: () => void;
  stopBgm: () => void;
  setBgmVolume: (volume: number) => void;
  setSfxVolume: (volume: number) => void;
  toggleBgm: (enabled?: boolean) => void;
  toggleSfx: (enabled?: boolean) => void;
  playSfx: (name: SfxName) => void;
  unlockAudio: () => void;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  toggleMusic: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  playMusic: () => void;
  pauseMusic: () => void;
}

const AudioSettingsContext = createContext<AudioContextType | undefined>(undefined);

const DEFAULT_BGM_VOLUME = 0.3;
const DEFAULT_SFX_VOLUME = 0.55;

const clampVolume = (value: number) => Math.max(0, Math.min(1, value));

/** Routes console / login admin : pas de musique de fond (même après unlock audio). */
function isAdminRoutePath(): boolean {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
  const full = window.location.pathname;
  const path = base && full.startsWith(base) ? full.slice(base.length) || '/' : full;
  return path === '/auth/admin' || path.startsWith('/admin/');
}

const readStoredBoolean = (key: string, fallback: boolean) => {
  const value = localStorage.getItem(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
};

const readStoredVolume = (key: string, fallback: number) => {
  const value = Number(localStorage.getItem(key));
  return Number.isFinite(value) ? clampVolume(value) : fallback;
};

export const MusicProvider = ({ children }: { children: React.ReactNode }) => {
  const migratedBgmEnabled =
    localStorage.getItem('bgmEnabled') ??
    localStorage.getItem('musicPlaying') ??
    'false';
  const migratedBgmVolume =
    localStorage.getItem('bgmVolume') ??
    localStorage.getItem('musicVolume') ??
    String(DEFAULT_BGM_VOLUME);

  const [bgmEnabled, setBgmEnabled] = useState(() => migratedBgmEnabled === 'true');
  const [bgmVolume, setBgmVolumeState] = useState(() => {
    const storedVolume = Number(migratedBgmVolume);
    return Number.isFinite(storedVolume) ? clampVolume(storedVolume) : DEFAULT_BGM_VOLUME;
  });
  const [bgmPlaying, setBgmPlaying] = useState(false);
  const [sfxEnabled, setSfxEnabled] = useState(() => readStoredBoolean('sfxEnabled', true));
  const [sfxVolume, setSfxVolumeState] = useState(() => readStoredVolume('sfxVolume', DEFAULT_SFX_VOLUME));

  const bgmEnabledRef = useRef(bgmEnabled);
  const bgmVolumeRef = useRef(bgmVolume);
  const sfxEnabledRef = useRef(sfxEnabled);
  const sfxVolumeRef = useRef(sfxVolume);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const sfxAudioRefs = useRef<Partial<Record<SfxName, HTMLAudioElement>>>({});
  const audioContextRef = useRef<globalThis.AudioContext | null>(null);

  useEffect(() => {
    bgmEnabledRef.current = bgmEnabled;
    localStorage.setItem('bgmEnabled', String(bgmEnabled));
  }, [bgmEnabled]);

  useEffect(() => {
    bgmVolumeRef.current = bgmVolume;
    localStorage.setItem('bgmVolume', String(bgmVolume));
    if (bgmAudioRef.current) bgmAudioRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  useEffect(() => {
    sfxEnabledRef.current = sfxEnabled;
    localStorage.setItem('sfxEnabled', String(sfxEnabled));
  }, [sfxEnabled]);

  useEffect(() => {
    sfxVolumeRef.current = sfxVolume;
    localStorage.setItem('sfxVolume', String(sfxVolume));
  }, [sfxVolume]);

  useEffect(() => {
    const bgm = new Audio(musicSrc);
    bgm.loop = true;
    bgm.preload = 'auto';
    bgm.volume = bgmVolumeRef.current;
    bgm.addEventListener('pause', () => setBgmPlaying(false));
    bgm.addEventListener('playing', () => setBgmPlaying(true));
    bgm.addEventListener('error', () => setBgmPlaying(false));
    bgmAudioRef.current = bgm;

    const victory = new Audio(victorySound);
    victory.preload = 'auto';
    sfxAudioRefs.current.victory = victory;

    return () => {
      bgm.pause();
      bgmAudioRef.current = null;
      Object.values(sfxAudioRefs.current).forEach((audio) => {
        audio?.pause();
      });
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  const getWebAudioContext = useCallback(() => {
    const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextConstructor) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextConstructor();
    }
    return audioContextRef.current;
  }, []);

  const startBgm = useCallback(() => {
    if (isAdminRoutePath()) return;
    const bgm = bgmAudioRef.current;
    if (!bgm || !bgmEnabledRef.current) return;
    if (!bgm.paused) {
      setBgmPlaying(true);
      return;
    }
    bgm.volume = bgmVolumeRef.current;
    bgm.play()
      .then(() => setBgmPlaying(true))
      .catch(() => setBgmPlaying(false));
  }, []);

  const stopBgm = useCallback(() => {
    const bgm = bgmAudioRef.current;
    if (!bgm) return;
    bgm.pause();
    setBgmPlaying(false);
  }, []);

  const setBgmVolume = useCallback((volume: number) => {
    setBgmVolumeState(clampVolume(volume));
  }, []);

  const setSfxVolume = useCallback((volume: number) => {
    setSfxVolumeState(clampVolume(volume));
  }, []);

  const toggleBgm = useCallback((enabled?: boolean) => {
    const nextEnabled = enabled ?? !bgmEnabledRef.current;
    setBgmEnabled(nextEnabled);
    if (nextEnabled) {
      bgmEnabledRef.current = true;
      startBgm();
    } else {
      bgmEnabledRef.current = false;
      stopBgm();
    }
  }, [startBgm, stopBgm]);

  const toggleSfx = useCallback((enabled?: boolean) => {
    const nextEnabled = enabled ?? !sfxEnabledRef.current;
    sfxEnabledRef.current = nextEnabled;
    setSfxEnabled(nextEnabled);
  }, []);

  const playTone = useCallback((frequency: number, duration: number, gainValue: number, type: OscillatorType = 'sine') => {
    const context = getWebAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume().catch(() => {});

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue * sfxVolumeRef.current), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }, [getWebAudioContext]);

  const playSfx = useCallback((name: SfxName) => {
    if (!sfxEnabledRef.current || sfxVolumeRef.current <= 0) return;
    window.__quantumBluffLastSfxAt = performance.now();

    if (name === 'victory') {
      const audio = sfxAudioRefs.current.victory;
      if (!audio) return;
      audio.currentTime = 0;
      audio.volume = clampVolume(0.85 * sfxVolumeRef.current);
      audio.play().catch(() => {});
      return;
    }

    const tones: Partial<Record<SfxName, [number, number, number, OscillatorType]>> = {
      uiHover: [620, 0.035, 0.025, 'sine'],
      uiClick: [520, 0.055, 0.045, 'triangle'],
      uiSelect: [740, 0.065, 0.04, 'sine'],
      modalOpen: [440, 0.08, 0.035, 'triangle'],
      modalClose: [330, 0.07, 0.03, 'triangle'],
      success: [880, 0.12, 0.055, 'sine'],
      notification: [660, 0.11, 0.04, 'sine'],
      timerTick: [760, 0.075, 0.05, 'sine'],
      timerEnd: [420, 0.25, 0.085, 'square'],
    };
    const tone = tones[name];
    if (tone) playTone(...tone);
  }, [playTone]);

  const unlockAudio = useCallback(() => {
    getWebAudioContext()?.resume().catch(() => {});
    if (isAdminRoutePath()) return;
    if (bgmEnabledRef.current) startBgm();
  }, [getWebAudioContext, startBgm]);

  const value = useMemo<AudioContextType>(() => ({
    bgmEnabled,
    bgmVolume,
    bgmPlaying,
    sfxEnabled,
    sfxVolume,
    startBgm,
    stopBgm,
    setBgmVolume,
    setSfxVolume,
    toggleBgm,
    toggleSfx,
    playSfx,
    unlockAudio,
    isPlaying: bgmPlaying,
    volume: bgmVolume,
    isMuted: !bgmEnabled,
    toggleMusic: () => toggleBgm(),
    toggleMute: () => toggleBgm(),
    setVolume: setBgmVolume,
    playMusic: startBgm,
    pauseMusic: stopBgm,
  }), [
    bgmEnabled,
    bgmVolume,
    bgmPlaying,
    sfxEnabled,
    sfxVolume,
    startBgm,
    stopBgm,
    setBgmVolume,
    setSfxVolume,
    toggleBgm,
    toggleSfx,
    playSfx,
    unlockAudio,
  ]);

  return <AudioSettingsContext.Provider value={value}>{children}</AudioSettingsContext.Provider>;
};

export const AudioProvider = MusicProvider;

export const useAudio = () => {
  const context = useContext(AudioSettingsContext);
  if (!context) throw new Error('useAudio must be used within AudioProvider');
  return context;
};

export const useMusic = useAudio;

declare global {
  interface Window {
    webkitAudioContext?: typeof globalThis.AudioContext;
    __quantumBluffLastSfxAt?: number;
  }
}
