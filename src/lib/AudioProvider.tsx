import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Song, PlayMode } from '../types';
import { audioEngine } from './audio';
import * as mm from 'music-metadata-browser';
import { set, get } from 'idb-keyval';

const DB_KEY = 'kh_music_playback_state';

interface AudioContextType {
  library: Song[];
  queue: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playMode: PlayMode;
  loadFiles: (files: FileList) => Promise<void>;
  playSong: (index: number) => void;
  togglePlayPause: () => void;
  next: () => void;
  prev: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlayMode: (mode: PlayMode) => void;
  visualizerData: Uint8Array | null;
  eqGains: number[];
  setEqGains: (gains: number[]) => void;
  skipSilence: boolean;
  setSkipSilence: (enabled: boolean) => void;
  silenceThreshold: number;
  setSilenceThreshold: (db: number) => void;
  minSilenceDuration: number;
  setMinSilenceDuration: (ms: number) => void;
  sleepTimer: number | null;
  setSleepTimer: (mins: number | null) => void;
  hiddenSongs: string[];
  setHiddenSongs: (ids: string[]) => void;
  toggleHideSong: (id: string) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [library, setLibrary] = useState<Song[]>([]);
  const [queue, setQueue] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [playMode, setPlayMode] = useState<PlayMode>('normal');
  const [eqGains, setEqGainsState] = useState([0, 0, 0, 0, 0]);
  const [isReady, setIsReady] = useState(false);
  const [skipSilence, setSkipSilenceState] = useState(false);
  const [silenceThreshold, setSilenceThresholdState] = useState(-45);
  const [minSilenceDuration, setMinSilenceDurationState] = useState(250);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [hiddenSongs, setHiddenSongs] = useState<string[]>([]);
  const nextRef = useRef<() => void>();

  const currentSong = queue[currentIndex] || null;
  const duration = currentSong?.duration || 0;

  // Persist State logic
  const saveState = useCallback(async () => {
    if (!isReady) return;
    try {
      // Strip coverUrls before saving as blob URLs don't persist
      const cleanQueue = queue.map(s => ({ ...s, coverUrl: null }));
      await set(DB_KEY, {
        queue: cleanQueue,
        currentIndex,
        currentTime,
        volume,
        playMode,
        eqGains,
        skipSilence,
        silenceThreshold,
        minSilenceDuration,
        hiddenSongs
      });
    } catch (e) {
      console.warn("Failed to save state", e);
    }
  }, [isReady, queue, currentIndex, currentTime, volume, playMode, eqGains, skipSilence, silenceThreshold, minSilenceDuration, hiddenSongs]);

  useEffect(() => {
    const saveTimer = setTimeout(() => saveState(), 3000); // debounce 3s
    return () => clearTimeout(saveTimer);
  }, [saveState]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) saveState();
    };
    window.addEventListener('visibilitychange', handleVisibility);
    return () => window.removeEventListener('visibilitychange', handleVisibility);
  }, [saveState]);

  useEffect(() => {
    let interval: number;
    if (sleepTimer !== null && sleepTimer > 0) {
      interval = window.setInterval(() => {
        setSleepTimer(prev => {
          if (prev && prev <= 1) {
            if (isPlaying) {
              audioEngine.pause();
              setIsPlaying(false);
            }
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 60000); // Check every minute
    }
    return () => clearInterval(interval);
  }, [sleepTimer, isPlaying]);

  // Load state on startup
  useEffect(() => {
    const loadState = async () => {
      try {
        const state = await get(DB_KEY);
        if (state) {
          if (state.queue) {
            setLibrary(state.queue);
            setQueue(state.queue);
          }
          if (state.currentIndex !== undefined) setCurrentIndex(state.currentIndex);
          if (state.volume !== undefined) {
            setVolumeState(state.volume);
            audioEngine.setVolume(state.volume);
          }
          if (state.playMode) setPlayMode(state.playMode);
          if (state.eqGains) {
            setEqGainsState(state.eqGains);
            audioEngine.setEqGains(state.eqGains);
          }
          if (state.skipSilence !== undefined) {
            setSkipSilenceState(state.skipSilence);
            audioEngine.setSkipSilence(state.skipSilence);
          }
          if (state.silenceThreshold !== undefined) {
            setSilenceThresholdState(state.silenceThreshold);
            audioEngine.setSilenceThreshold(state.silenceThreshold);
          }
          if (state.minSilenceDuration !== undefined) {
            setMinSilenceDurationState(state.minSilenceDuration);
            audioEngine.setMinSilenceDuration(state.minSilenceDuration);
          }
          if (state.hiddenSongs) {
            setHiddenSongs(state.hiddenSongs);
          }
          
          if (state.queue && state.queue.length > 0 && state.currentIndex >= 0 && state.queue[state.currentIndex]) {
             // We need to re-parse the current file to get its coverURL since it wasn't saved
             const currSong = state.queue[state.currentIndex];
             try {
                const updatedSong = await parseFile(currSong.file);
                setQueue(prev => {
                  const newQ = [...prev];
                  newQ[state.currentIndex] = updatedSong;
                  return newQ;
                });
             } catch (e) {}

             // Restore position and play automatically!
             audioEngine.playFile(currSong.file, 
               () => { /* handled later */ }, 
               (t) => setCurrentTime(t)
             );
             if (state.currentTime) {
               audioEngine.seek(state.currentTime);
               setCurrentTime(state.currentTime);
             }
             // Let it play automatically!
             audioEngine.play();
             setIsPlaying(true);
          }
        }
      } catch (e) {
        console.warn("Failed to load state", e);
      } finally {
        setIsReady(true);
      }
    };
    loadState();

    // Hook up external play/pause sync from audioEngine (e.g. OS interrupts, headset unplug)
    audioEngine.setCallbacks(
      () => setIsPlaying(true),
      () => setIsPlaying(false)
    );
  }, []);

  // Visualizer hook loop
  const [visualizerData, setVisualizerData] = useState<Uint8Array | null>(null);
  const reqRef = useRef<number>(null);

  const loop = useCallback(() => {
    if (isPlaying) {
      const data = audioEngine.getVisualizerData();
      if (data) setVisualizerData(new Uint8Array(data));
      reqRef.current = requestAnimationFrame(loop);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      reqRef.current = requestAnimationFrame(loop);
    } else if (reqRef.current) {
      cancelAnimationFrame(reqRef.current);
    }
    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [isPlaying, loop]);

  const loadFiles = async (files: FileList) => {
    const newSongs: Song[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|flac|m4a|aac|ogg|wma)$/i)) {
        const song = await parseFile(file);
        newSongs.push(song);
      }
    }
    setLibrary(prev => [...prev, ...newSongs]);
    if (queue.length === 0) {
      setQueue([...newSongs]);
    }
  };

  const parseFile = async (file: File): Promise<Song> => {
    try {
      const metadata = await mm.parseBlob(file);
      let coverUrl = null;
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        const blob = new Blob([picture.data], { type: picture.format });
        coverUrl = URL.createObjectURL(blob);
      }
      
      const duration = metadata.format.duration ? Math.floor(metadata.format.duration) : 0;
      const mins = Math.floor(duration / 60);
      const secs = duration % 60;

      return {
        id: file.name + Date.now(),
        title: metadata.common.title || file.name.replace(/\.[^/.]+$/, ""),
        artist: metadata.common.artist || '',
        album: metadata.common.album || '',
        duration: duration,
        durationStr: `${mins}:${secs.toString().padStart(2, '0')}`,
        coverUrl,
        file
      };
    } catch (error) {
      // Fallback
      return new Promise((resolve) => {
        const audio = new Audio(URL.createObjectURL(file));
        audio.onloadedmetadata = () => {
          const duration = Math.floor(audio.duration || 0);
          const mins = Math.floor(duration / 60);
          const secs = duration % 60;
          URL.revokeObjectURL(audio.src);
          
          resolve({
            id: file.name + Date.now(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: '',
            album: '',
            duration: duration,
            durationStr: `${mins}:${secs.toString().padStart(2, '0')}`,
            coverUrl: null,
            file
          });
        };
        audio.onerror = () => {
          resolve({
            id: file.name + Date.now(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            artist: '',
            album: '',
            duration: 0,
            durationStr: '0:00',
            coverUrl: null,
            file
          });
        };
      });
    }
  };

  const playSong = useCallback((index: number) => {
    if (index < 0 || index >= queue.length) return;
    setCurrentIndex(index);
    const song = queue[index];
    
    audioEngine.playFile(
      song.file, 
      () => {
        if (playMode === 'repeat_one') {
          playSong(index);
        } else {
          if (nextRef.current) nextRef.current();
        }
      },
      (time) => {
        setCurrentTime(time);
      }
    );
    setIsPlaying(true);
  }, [queue, playMode]);

  const next = useCallback(() => {
    if (queue.length === 0) return;
    
    let nextIdx = currentIndex;
    let tries = 0;
    
    do {
      if (playMode === 'shuffle') {
        nextIdx = Math.floor(Math.random() * queue.length);
      } else {
        nextIdx = nextIdx + 1;
        if (nextIdx >= queue.length) {
          if (playMode === 'repeat_all') {
            nextIdx = 0;
          } else {
            return; // End of queue
          }
        }
      }
      tries++;
      if (tries > queue.length) return; // All songs might be hidden
    } while (hiddenSongs.includes(queue[nextIdx].id));

    playSong(nextIdx);
  }, [currentIndex, queue, playMode, hiddenSongs, playSong]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const togglePlayPause = () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      if (currentIndex === -1 && queue.length > 0) {
        playSong(0);
      } else {
        audioEngine.play();
        setIsPlaying(true);
      }
    }
  };

  const prev = useCallback(() => {
    if (currentTime > 3) {
      audioEngine.seek(0);
      setCurrentTime(0);
      return;
    }
    if (queue.length === 0) return;
    
    let prevIdx = currentIndex;
    let tries = 0;
    
    do {
      prevIdx = prevIdx - 1;
      if (prevIdx < 0) prevIdx = queue.length - 1;
      tries++;
      if (tries > queue.length) return; // All songs hidden
    } while (hiddenSongs.includes(queue[prevIdx].id));

    playSong(prevIdx);
  }, [currentTime, currentIndex, queue, hiddenSongs, playSong]);

  const seek = (time: number) => {
    audioEngine.seek(time);
    setCurrentTime(time);
  };

  const setEqGains = (gains: number[]) => {
    setEqGainsState(gains);
    audioEngine.setEqGains(gains);
  };

  const setVolume = (val: number) => {
    setVolumeState(val);
    audioEngine.setVolume(val);
  };

  // MediaSession API Integration
  useEffect(() => {
    if ('mediaSession' in navigator) {
      if (currentSong) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentSong.title,
          artist: currentSong.artist || 'Unknown Artist',
          album: currentSong.album || 'Unknown Album',
          artwork: currentSong.coverUrl 
            ? [{ src: currentSong.coverUrl, sizes: '512x512', type: 'image/jpeg' }]
            : []
        });
      }

      navigator.mediaSession.setActionHandler('play', () => {
        if (!isPlaying) togglePlayPause();
      });
      
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isPlaying) togglePlayPause();
      });
      
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        prev();
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        next();
      });
      
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          seek(details.seekTime);
        }
      });
    }
  }, [currentSong, isPlaying, togglePlayPause, prev, next, seek]);

  const setSkipSilence = (enabled: boolean) => {
    setSkipSilenceState(enabled);
    audioEngine.setSkipSilence(enabled);
  };

  const setSilenceThreshold = (db: number) => {
    setSilenceThresholdState(db);
    audioEngine.setSilenceThreshold(db);
  };

  const setMinSilenceDuration = (ms: number) => {
    setMinSilenceDurationState(ms);
    audioEngine.setMinSilenceDuration(ms);
  };

  const toggleHideSong = (id: string) => {
    setHiddenSongs(prev => {
      if (prev.includes(id)) {
        return prev.filter(songId => songId !== id);
      }
      return [...prev, id];
    });
  };

  return (
    <AudioContext.Provider value={{
      library, queue, currentSong, isPlaying, currentTime, duration, playMode, volume,
      loadFiles, playSong, togglePlayPause, next, prev, seek, setPlayMode, setVolume,
      visualizerData, eqGains, setEqGains,
      skipSilence, setSkipSilence, silenceThreshold, setSilenceThreshold, minSilenceDuration, setMinSilenceDuration,
      sleepTimer, setSleepTimer,
      hiddenSongs, setHiddenSongs, toggleHideSong
    }}>
      {children}
    </AudioContext.Provider>
  );
};
