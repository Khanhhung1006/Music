import React, { useEffect, useState, useRef } from 'react';
import { AudioProvider, useAudio } from './lib/AudioProvider';
import { Header } from './components/Header';
import { NowPlaying } from './components/NowPlaying';
import { MusicList } from './components/MusicList';
import { SleepTimerScreen } from './components/SleepTimerScreen';
import { SettingsScreen } from './components/SettingsScreen';

function AppContent() {
  const [isPortrait, setIsPortrait] = useState(window.innerHeight > window.innerWidth);
  const [showTimer, setShowTimer] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const { currentSong } = useAudio();
  const playlistTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleResize = () => setIsPortrait(window.innerHeight > window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Ẩn playlist ngay lập tức khi bài hát thay đổi
  useEffect(() => {
    if (currentSong) {
      if (playlistTimeoutRef.current) clearTimeout(playlistTimeoutRef.current);
      setShowPlaylist(false);
    }
  }, [currentSong]);

  // Ẩn/hiện playlist khi chạm vào NowPlaying
  const handleNowPlayingTap = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't toggle if clicking on interactive elements like buttons or sliders
    if (target.closest('button') || target.tagName === 'INPUT') {
      return;
    }
    
    setShowPlaylist(prev => !prev);
    if (playlistTimeoutRef.current) clearTimeout(playlistTimeoutRef.current);
  };

  return (
    <div 
      className="flex flex-col h-screen w-screen bg-bg-primary text-text-primary relative overflow-hidden font-sans"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)'
      }}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 z-0 pointer-events-none" />

      {isPortrait ? (
        <div className="flex flex-col w-full h-full z-10">
          <div className="flex-none h-[10vh] w-full">
            <Header onSettings={() => setShowSettings(true)} isPortrait={isPortrait} />
          </div>
          <div 
            className={`flex-none w-full transition-all duration-500 ease-in-out ${showPlaylist ? 'h-[40vh]' : 'h-[90vh]'}`}
            onClick={handleNowPlayingTap}
          >
            <NowPlaying isPortrait={isPortrait} onTimer={() => setShowTimer(true)} />
          </div>
          <div 
            className={`w-full bg-bg-surface rounded-t-[3vh] overflow-hidden transition-all duration-500 ease-in-out shadow-[0_-10px_40px_rgba(0,0,0,0.1)] ${showPlaylist ? 'h-[50vh] opacity-100 translate-y-0 border-t border-border' : 'h-0 opacity-0 translate-y-full border-t-0'}`}
          >
            <MusicList isPortrait={isPortrait} />
          </div>
        </div>
      ) : (
        <div className="flex flex-col w-full h-full z-10">
          {/* Top Header - Landscape */}
          <div className="flex-none h-[10vh] w-full border-b border-border">
            <Header onSettings={() => setShowSettings(true)} isPortrait={isPortrait} />
          </div>
          <div className="flex flex-row flex-1 h-[90vh] overflow-hidden w-full">
            {/* Left Column - Playlist */}
            <div 
              className={`h-full transition-all duration-500 ease-in-out ${showPlaylist ? 'w-[35vw] border-r border-border opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'}`}
            >
              <MusicList isPortrait={isPortrait} />
            </div>
            {/* Right Column - Now Playing */}
            <div 
              className={`h-full flex flex-col relative transition-all duration-500 ease-in-out ${showPlaylist ? 'w-[65vw]' : 'w-[100vw]'}`}
              onClick={handleNowPlayingTap}
            >
              <NowPlaying isPortrait={isPortrait} onTimer={() => setShowTimer(true)} />
            </div>
          </div>
        </div>
      )}

      {showTimer && <SleepTimerScreen onClose={() => setShowTimer(false)} />}
      {showSettings && <SettingsScreen onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AudioProvider>
      <AppContent />
    </AudioProvider>
  );
}

