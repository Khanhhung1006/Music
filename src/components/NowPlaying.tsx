import React, { useMemo, useEffect, useRef } from 'react';
import { useAudio } from '../lib/AudioProvider';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Repeat1, Shuffle, Heart, Music, MonitorPlay, Clock, Volume2, Wand2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { MainVisualizer } from './MainVisualizer';
import { useTheme } from '../lib/ThemeProvider';

const PASTEL_COLORS = [
  '#A7D8F5', '#B7E4F9', '#C8F7F4', '#CDECCF', '#D9F2D9', 
  '#E6F4C7', '#F7EDB5', '#EBD8B7', '#F8D7C5', '#F6CFC7', 
  '#F8D8E8', '#E5D4F6', '#D9C8F2', '#CCD5F6', '#A7D8F5'
];

export function NowPlaying({ isPortrait = true, onTimer }: { isPortrait?: boolean; onTimer?: () => void }) {
  const { 
    currentSong, isPlaying, currentTime, duration, volume,
    togglePlayPause, next, prev, seek, setVolume, playMode, setPlayMode,
    visualizerData, sleepTimer, hiddenSongs
  } = useAudio();
  const { actualTheme } = useTheme();

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(Number(e.target.value));
  };

  const toggleMode = () => {
    const modes: ('normal' | 'repeat_all' | 'repeat_one' | 'shuffle')[] = ['normal', 'repeat_all', 'repeat_one', 'shuffle'];
    const nextIdx = (modes.indexOf(playMode) + 1) % modes.length;
    setPlayMode(modes[nextIdx]);
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Calculate intensity from visualizer data for the rings
  const intensity = useMemo(() => {
    if (!visualizerData) return 1;
    // Get average of lower frequencies (bass) for pulsing
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += visualizerData[i] || 0;
    }
    const avg = sum / 10;
    return 1 + (avg / 255) * 0.15; // Max 15% expansion
  }, [visualizerData]);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw function that takes visualizerData and progressPercent
    const draw = () => {
      // Set actual size in memory (scaled to account for high DPI)
      const dpr = window.devicePixelRatio || 1;
      // Get CSS display size
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      const width = rect.width;
      const height = rect.height;

      ctx.clearRect(0, 0, width, height);

      const numBars = 64;
      const barWidth = (width / numBars) - 1; // 1px spacing
      
      const midY = height * 0.7; // 70% for main bars, 30% for reflection
      
      // Create a multi-colored gradient for the active bars
      const grad = ctx.createLinearGradient(0, midY, 0, 0);
      grad.addColorStop(0, '#00BCD4'); // Cyan
      grad.addColorStop(0.33, '#2196F3'); // Blue
      grad.addColorStop(0.66, '#3F51B5'); // Indigo
      grad.addColorStop(1, '#7E57C2'); // Purple

      // Reflection gradient
      const reflectGrad = ctx.createLinearGradient(0, midY, 0, height);
      reflectGrad.addColorStop(0, 'rgba(0, 188, 212, 0.4)');
      reflectGrad.addColorStop(0.33, 'rgba(33, 150, 243, 0.2)');
      reflectGrad.addColorStop(1, 'rgba(126, 87, 194, 0)');

      for (let i = 0; i < numBars; i++) {
        const val = visualizerData ? visualizerData[i] : 0;
        // Boost the signal slightly and cap at 100%
        const percent = Math.min(1, (val / 255) * 1.5); 
        // Minimum height so it's always visible
        const barHeight = Math.max(midY * 0.1, percent * midY);
        
        const x = i * (barWidth + 1);
        const y = midY - barHeight;
        
        const isPassed = (i / numBars) * 100 <= progressPercent;
        
        const baseAlpha = isPassed ? 1.0 : 0.4;
        
        // --- Draw Main Bar ---
        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = grad;
        
        ctx.beginPath();
        const radius = Math.min(2, barWidth / 2);
        ctx.moveTo(x, midY);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.lineTo(x + barWidth - radius, y);
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
        ctx.lineTo(x + barWidth, midY);
        ctx.closePath();
        ctx.fill();
        
        // --- Draw Reflection Bar ---
        const reflectHeight = barHeight * 0.5; // Reflection is shorter
        ctx.globalAlpha = baseAlpha;
        ctx.fillStyle = reflectGrad;
        
        ctx.beginPath();
        ctx.moveTo(x, midY);
        ctx.lineTo(x, midY + reflectHeight - radius);
        ctx.quadraticCurveTo(x, midY + reflectHeight, x + radius, midY + reflectHeight);
        ctx.lineTo(x + barWidth - radius, midY + reflectHeight);
        ctx.quadraticCurveTo(x + barWidth, midY + reflectHeight, x + barWidth, midY + reflectHeight - radius);
        ctx.lineTo(x + barWidth, midY);
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = 1.0; // Reset alpha
      }
    };

    draw();
  }, [visualizerData, progressPercent]);

  const albumSizeClass = isPortrait ? "w-[30vw] h-[30vw]" : "w-[28vw] h-[28vw]";
  const btnClass = isPortrait ? "w-[6.4vw] h-[6.4vw]" : "w-[4.8vw] h-[4.8vw]";
  const playBtnClass = isPortrait ? "w-[9.6vw] h-[9.6vw]" : "w-[7.2vw] h-[7.2vw]";

  return (
    <div className="flex-1 flex flex-col items-center p-[2vw] relative w-full h-full">
      
      <div className="flex-1 w-full flex items-center justify-center relative">
      {/* Visualizer Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] max-w-[800px] max-h-[800px] flex items-center justify-center pointer-events-none z-0">
        <MainVisualizer data={visualizerData} isPlaying={isPlaying} />
      </div>

      {/* Album Art */}
      <div className={`relative ${albumSizeClass} z-10 flex-shrink-0 animate-float`}>
        <div 
          className={cn(
            "rounded-full p-[1vw] backdrop-blur-md border border-border h-full w-full transition-all duration-1000",
            isPlaying ? "bg-accent/10 shadow-[0_0_60px_rgba(33,150,243,0.3)]" : "bg-white/5 shadow-[0_0_20px_rgba(0,0,0,0.1)]"
          )}
        >
          <div className={cn(
            "rounded-full p-[0.5vw] border border-border transition-all duration-700 h-full w-full",
            isPlaying ? "bg-bg-surface/90" : "bg-transparent"
          )}>
            <div className={cn(
              "rounded-full overflow-hidden bg-bg-card relative shadow-2xl transition-all duration-700 border border-border",
              "w-full h-full aspect-square flex items-center justify-center"
            )}
            style={{ transform: 'translateZ(0)' /* Hardware acceleration */ }}
            >
              <div 
                className="w-full h-full animate-[spin_20s_linear_infinite]"
                style={{
                  animationPlayState: isPlaying ? 'running' : 'paused',
                  willChange: 'transform' // ObjectAnimator equivalent optimization
                }}
              >
                <AnimatePresence mode="wait">
                  {currentSong?.coverUrl ? (
                    <img 
                      key={currentSong.coverUrl}
                      loading="lazy"
                      src={currentSong.coverUrl} 
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-[2s] ease-out",
                        isPlaying ? "scale-110" : "scale-100"
                      )}
                    />
                  ) : (
                    <div 
                      key="placeholder"
                      className="w-full h-full flex items-center justify-center relative overflow-hidden bg-bg-surface"
                    >
                      <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle at center, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.1) 100%)' }} />
                      <Music className="w-[15vw] h-[15vw] text-white/40 relative z-10" />
                    </div>
                  )}
                </AnimatePresence>
              </div>
              {/* Glossy glass reflection overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10 pointer-events-none rounded-full" />
              {/* Vinyl center hole */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[3vw] h-[3vw] rounded-full bg-bg-primary z-20 border border-border shadow-inner" />
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="w-full flex flex-col items-center flex-none pb-[2vh]">
      {/* Track Info */}
      <div className="w-[80%] flex flex-col items-center text-center z-10 mb-[2vh] overflow-hidden">
        {currentSong?.artist ? (
          <div className="flex items-center text-accent text-[clamp(1rem,2.5vw,1.5rem)] mt-[1vh] truncate w-full px-[2vw] justify-center font-medium">
            <MonitorPlay className="w-[1.25em] h-[1.25em] mr-[0.5em]" />
            {currentSong.artist}
          </div>
        ) : null}
      </div>

      {/* Progress */}
      <div className="w-[90%] px-[2vw] z-10">
        {/* Mini Visualizer Canvas */}
        <canvas 
          ref={canvasRef}
          className="w-full h-[8vh] px-[0.5vw] pointer-events-none block"
        />

        <div className="relative w-full h-[1vh] bg-bg-surface rounded-full group mt-[1vh] border border-border overflow-hidden">
          <div 
            className="absolute top-0 left-0 h-full rounded-full transition-all duration-300"
            style={{ 
              width: `${progressPercent}%`,
              background: 'var(--accent)'
            }}
          />
          <input 
            type="range" 
            min="0" 
            max={duration || 100} 
            value={currentTime} 
            onChange={handleSeek}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
          {/* Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-[2vh] h-[2vh] bg-white rounded-full shadow-[0_0_10px_rgba(33,150,243,0.5)] pointer-events-none border border-border transition-all"
            style={{ left: `calc(${progressPercent}% - 1vh)` }}
          />
        </div>
        
        <div className="relative flex justify-between text-[clamp(0.875rem,2vw,1.25rem)] font-medium text-text-secondary mt-[1vh] px-[0.5vw] items-center w-full">
          <span>{formatTime(currentTime)}</span>
          <span className="absolute left-1/2 -translate-x-1/2 truncate max-w-[60%] text-text-primary text-center">
            {currentSong?.title || 'No song selected'}
          </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="w-[90%] mt-[2vh] flex items-center justify-between px-[2vw] z-10">
        <button onClick={toggleMode} className="p-[1vw] rounded-full hover:bg-text-primary/10 transition-colors text-text-secondary hover:text-text-primary group">
          {playMode === 'shuffle' && <Shuffle className={`${btnClass} text-accent transition-all group-active:scale-110`} />}
          {playMode === 'repeat_all' && <Repeat className={`${btnClass} text-accent transition-all group-active:scale-110`} />}
          {playMode === 'repeat_one' && <Repeat1 className={`${btnClass} text-accent transition-all group-active:scale-110`} />}
          {playMode === 'normal' && <Shuffle className={`${btnClass} transition-all group-active:scale-110`} />}
        </button>
        <button onClick={prev} className="p-[1vw] rounded-full hover:bg-text-primary/10 transition-colors text-icon hover:text-accent active:scale-95">
          <SkipBack className={`${btnClass} fill-current`} />
        </button>
        <button 
          onClick={togglePlayPause} 
          className={`${playBtnClass} rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-accent/30`}
          style={{ background: 'var(--accent)' }}
        >
          {isPlaying ? (
            <Pause className="w-1/2 h-1/2 text-white fill-current" />
          ) : (
            <Play className="w-1/2 h-1/2 text-white fill-current ml-[0.5vw]" />
          )}
        </button>
        <button onClick={next} className="p-[1vw] rounded-full hover:bg-text-primary/10 transition-colors text-icon hover:text-accent active:scale-95">
          <SkipForward className={`${btnClass} fill-current`} />
        </button>
        <button onClick={onTimer} className={`p-[1vw] rounded-full hover:bg-text-primary/10 transition-colors ${sleepTimer ? 'text-accent' : 'text-icon'} hover:text-accent group`}>
          <Clock className={`${btnClass} transition-all group-active:scale-110`} />
        </button>
      </div>
      
      </div>
    </div>
  );
}
