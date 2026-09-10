import React from 'react';
import { Menu, Search, Clock, ListMusic, Heart, Settings } from 'lucide-react';
import { useAudio } from '../lib/AudioProvider';

interface HeaderProps {
  onSettings?: () => void;
  isPortrait?: boolean;
}

export function Header({ onSettings, isPortrait }: HeaderProps) {
  const { loadFiles } = useAudio();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      loadFiles(e.target.files);
    }
  };

  const iconClass = "w-[clamp(1.5rem,3vw,2rem)] h-[clamp(1.5rem,3vw,2rem)]";
  const btnClass = "p-[1vw] max-p-3 rounded-full hover:bg-text-primary/10 active:bg-text-primary/20 transition-colors";

  return (
    <div className="flex items-center justify-between px-[4vw] h-full w-full relative z-20 bg-bg-header text-[clamp(1rem,2vw,1.2rem)] border-b border-border">
      <div className="flex space-x-[2vw] items-center">
        <div className="flex items-center space-x-[2vw] px-[1vw]">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/2/21/Flag_of_Vietnam.svg" 
            alt="Vietnam Flag" 
            className="w-[clamp(1.95rem,3.9vw,2.6rem)] h-auto rounded-[2px] shadow-sm border border-border"
          />
          <div className="flex items-baseline">
            <span className="font-serif font-black italic text-[clamp(1.4rem,2.8vw,1.8rem)] tracking-wider bg-gradient-to-r from-accent to-purple-500 text-transparent bg-clip-text drop-shadow-sm">
              B
            </span>
            <span className="font-serif italic font-light text-[clamp(1.1rem,2.2vw,1.4rem)] text-text-secondary mx-[0.5vw]">
              and
            </span>
            <span className="font-serif font-black italic text-[clamp(1.4rem,2.8vw,1.8rem)] tracking-wider bg-gradient-to-r from-purple-500 to-accent text-transparent bg-clip-text drop-shadow-sm">
              B
            </span>
            <span className="ml-[1vw] font-medium text-[clamp(0.8rem,1.5vw,1rem)] text-text-secondary tracking-widest uppercase">
              Music
            </span>
          </div>
        </div>
      </div>

      <div className="flex space-x-[1vw] items-center">
        <label className={`${btnClass} cursor-pointer text-icon`} title="Load Music">
          <ListMusic className={iconClass} />
          <input 
            type="file" 
            accept="audio/*" 
            multiple 
            className="hidden" 
            onChange={handleFileSelect} 
            // @ts-ignore
            webkitdirectory=""
            directory=""
          />
        </label>
        <button onClick={onSettings} className={`${btnClass} hidden sm:block text-icon hover:text-accent`}>
          <Settings className={iconClass} />
        </button>
      </div>
    </div>
  );
}
