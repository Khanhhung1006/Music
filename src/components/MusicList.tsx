import React from 'react';
import { useAudio } from '../lib/AudioProvider';
import { Music, Play } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function MusicList({ isPortrait = true }: { isPortrait?: boolean }) {
  const { queue, currentSong, isPlaying, playSong, hiddenSongs, toggleHideSong } = useAudio();

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar relative w-full h-full pb-[10vh]">
      <div className="flex items-center justify-between mb-[2vh] sticky top-0 bg-bg-primary z-20 py-[2vh] px-[3vw] border-b border-border shadow-sm">
        <h3 className="text-[clamp(1rem,2.4vw,1.2rem)] font-bold text-text-primary">Danh sách phát</h3>
        <span className="text-[clamp(0.64rem,1.6vw,0.8rem)] font-medium text-accent">{queue.length} bài hát</span>
      </div>
      
      {queue.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[20vh] text-text-secondary">
          <Music className="w-[10vw] h-[10vw] max-w-16 max-h-16 mb-[2vh] opacity-50" />
          <p className="text-[clamp(0.8rem,1.6vw,0.96rem)]">Thư viện trống</p>
          <p className="text-[clamp(0.64rem,1.2vw,0.8rem)] mt-[1vh]">Nhấn biểu tượng danh sách để tải nhạc</p>
        </div>
      ) : (
        <div className="px-[2vw]">
          <AnimatePresence initial={false}>
            {queue.map((song, index) => {
              const isCurrent = currentSong?.id === song.id;
              const isHidden = hiddenSongs.includes(song.id);
              
              if (isHidden) return null;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.9, x: -100, height: 0, marginBottom: 0 }}
                  transition={{ 
                    opacity: { duration: 0.2 },
                    layout: { duration: 0.3 }
                  }}
                  key={song.id}
                  onClick={() => playSong(index)}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset }) => {
                    if (offset.x < -50) { // Swipe left to hide
                      toggleHideSong(song.id);
                    }
                  }}
                  className={cn(
                    "group relative flex items-center px-[1vw] py-[0.5vh] rounded-[2vh] cursor-pointer transition-colors duration-300 border h-[7vh] touch-pan-y mb-[1vh]",
                    isCurrent 
                      ? "bg-bg-surface border-accent/20 shadow-[0_0_20px_rgba(33,150,243,0.15)]" 
                      : "bg-bg-primary border-border hover:bg-bg-card shadow-sm"
                  )}
                >
                {/* Thumbnail 80% of 7vh row height */}
                <div className="relative h-[80%] aspect-square rounded-[1vh] overflow-hidden bg-bg-card flex-shrink-0 mr-[3vw] flex items-center justify-center border border-border">
                  {song.coverUrl ? (
                    <img src={song.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-surface text-text-secondary">
                      <Music className="w-[50%] h-[50%]" />
                    </div>
                  )}
                  {isCurrent && isPlaying && (
                    <div className="absolute inset-0 bg-bg-primary/60 flex items-center justify-center backdrop-blur-[2px]">
                      <div className="flex space-x-[2px] items-end h-[40%]">
                        <motion.div animate={{ height: ['100%', '60%', '100%'] }} transition={{ repeat: Infinity, duration: 0.8 }} className="w-[15%] bg-accent rounded-t-sm" />
                        <motion.div animate={{ height: ['60%', '100%', '60%'] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-[15%] bg-accent rounded-t-sm" />
                        <motion.div animate={{ height: ['80%', '40%', '80%'] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-[15%] bg-accent rounded-t-sm" />
                      </div>
                    </div>
                  )}
                  {!isCurrent && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-[40%] h-[40%] fill-white ml-[10%]" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 mr-[2vw]">
                  <h4 className={cn(
                    "font-semibold truncate transition-colors text-[clamp(0.72rem,1.6vw,0.88rem)]",
                    isCurrent ? "text-accent" : "text-text-primary"
                  )}>
                    {song.title}
                  </h4>
                  {song.artist && (
                    <p className="text-[clamp(0.56rem,1.2vw,0.72rem)] text-text-secondary truncate mt-[0.5vh]">
                      {song.artist}
                    </p>
                  )}
                </div>

                {/* Duration */}
                <div className="text-[clamp(0.56rem,1.2vw,0.72rem)] font-medium text-text-secondary/60 group-hover:text-text-primary transition-colors">
                  {song.durationStr}
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
