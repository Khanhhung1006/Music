import React from 'react';
import { X, Check, Eye, SlidersHorizontal, RefreshCcw } from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';
import { useAudio } from '../lib/AudioProvider';
import { cn } from '../lib/utils';

export function SettingsScreen({ onClose }: { onClose: () => void }) {
  const { mode, setTheme } = useTheme();
  const { 
    skipSilence, setSkipSilence, 
    silenceThreshold, setSilenceThreshold, 
    minSilenceDuration, setMinSilenceDuration,
    hiddenSongs, toggleHideSong, library,
    eqGains, setEqGains
  } = useAudio();

  const bands = ['60Hz', '230Hz', '910Hz', '3.6kHz', '14kHz'];

  const handleSliderChange = (index: number, value: number) => {
    const newGains = [...eqGains];
    newGains[index] = value;
    setEqGains(newGains);
  };

  const presets = [
    { name: 'Normal', gains: [0, 0, 0, 0, 0] },
    { name: 'Pop', gains: [-1, 2, 4, 1, -2] },
    { name: 'Rock', gains: [5, 3, -1, 3, 5] },
    { name: 'Classical', gains: [4, 3, -2, 4, 4] },
    { name: 'Jazz', gains: [3, 2, -1, 2, 4] },
    { name: 'Bass Boost', gains: [8, 5, 0, 0, 0] },
  ];

  return (
    <div className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full sm:w-[90vw] sm:max-w-md bg-bg-surface rounded-t-[3vh] sm:rounded-3xl p-[4vw] sm:p-6 shadow-2xl flex flex-col border border-border max-h-[90vh] overflow-y-auto no-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[clamp(1.2rem,2.5vw,1.5rem)] font-bold text-text-primary">Settings</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-text-primary/10 text-icon transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex flex-col space-y-6">
          <div>
            <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-2">Appearance</h3>
            <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
              {(['light', 'dark', 'auto'] as const).map((m, idx) => (
                <div 
                  key={m} 
                  className={`flex items-center justify-between p-4 cursor-pointer hover:bg-text-primary/5 transition-colors ${idx !== 2 ? 'border-b border-border' : ''}`} 
                  onClick={() => setTheme(m)}
                >
                  <span className="text-text-primary capitalize">{m} {m === 'auto' && '(Recommended)'}</span>
                  {mode === m && <Check className="text-accent w-5 h-5" />}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-2">Equalizer</h3>
            <div className="bg-bg-card rounded-2xl border border-border overflow-hidden p-4">
              <div className="flex justify-between h-48 mb-6 px-2">
                {eqGains.map((gain, idx) => (
                  <div key={idx} className="flex flex-col items-center">
                    <div className="text-xs font-medium text-text-secondary mb-2">{gain > 0 ? `+${gain}` : gain}</div>
                    <div className="relative flex-1 w-10 bg-bg-primary rounded-full flex items-end p-1 border border-border overflow-hidden group shadow-inner">
                      <div 
                        className={cn(
                          "w-full rounded-full transition-all duration-100",
                          gain >= 0 ? "bg-accent opacity-90" : "bg-accent opacity-60"
                        )}
                        style={{ height: `${((gain + 12) / 24) * 100}%` }}
                      />
                      <input 
                        type="range" min="-12" max="12" step="0.5" value={gain}
                        onChange={(e) => handleSliderChange(idx, Number(e.target.value))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full appearance-none"
                        style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' } as any}
                      />
                    </div>
                    <div className="text-[10px] font-semibold text-text-secondary mt-3">{bands[idx]}</div>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Presets</h4>
                <div className="flex flex-wrap gap-2">
                  {presets.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setEqGains(preset.gains)}
                      className="px-3 py-1.5 rounded-full bg-bg-surface hover:bg-bg-primary active:bg-text-primary/10 text-xs font-medium text-text-primary transition-colors border border-border"
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={() => setEqGains([0,0,0,0,0])}
                className="w-full py-3 flex items-center justify-center space-x-2 rounded-xl bg-bg-surface hover:bg-bg-primary text-text-primary text-sm font-medium transition-colors border border-border"
              >
                <RefreshCcw size={16} />
                <span>Reset to Default</span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-2">Playback</h3>
            <div className="bg-bg-card rounded-2xl border border-border overflow-hidden p-4 space-y-4">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setSkipSilence(!skipSilence)}>
                <span className="text-text-primary font-medium">Skip Silence</span>
                <div className={`w-12 h-6 rounded-full transition-colors relative ${skipSilence ? 'bg-accent' : 'bg-text-secondary/30'}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow ${skipSilence ? 'left-7' : 'left-1'}`} />
                </div>
              </div>

              {skipSilence && (
                <div className="space-y-6 pt-4 border-t border-border animate-fade-in">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-secondary">Silence Threshold</span>
                      <span className="text-accent font-medium">{silenceThreshold} dB</span>
                    </div>
                    <input 
                      type="range" min="-60" max="-20" step="1" 
                      value={silenceThreshold} 
                      onChange={(e) => setSilenceThreshold(Number(e.target.value))} 
                      className="w-full accent-accent bg-border h-1 rounded-full appearance-none outline-none" 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-text-secondary">Minimum Silence Duration</span>
                      <span className="text-accent font-medium">{minSilenceDuration} ms</span>
                    </div>
                    <input 
                      type="range" min="100" max="1000" step="50" 
                      value={minSilenceDuration} 
                      onChange={(e) => setMinSilenceDuration(Number(e.target.value))} 
                      className="w-full accent-accent bg-border h-1 rounded-full appearance-none outline-none" 
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-text-secondary text-sm font-semibold uppercase tracking-wider mb-2">Hidden Songs ({hiddenSongs.length})</h3>
            <div className="bg-bg-card rounded-2xl border border-border overflow-hidden p-4 space-y-4 max-h-[30vh] overflow-y-auto no-scrollbar">
              {hiddenSongs.length === 0 ? (
                <div className="text-text-secondary text-sm text-center py-4">No hidden songs</div>
              ) : (
                hiddenSongs.map(id => {
                  const song = library.find(s => s.id === id);
                  return (
                    <div key={id} className="flex items-center justify-between">
                      <div className="flex flex-col overflow-hidden max-w-[70%]">
                        <span className="text-text-primary font-medium truncate text-sm">{song?.title || 'Unknown Song'}</span>
                        <span className="text-text-secondary truncate text-xs">{song?.artist || 'Unknown Artist'}</span>
                      </div>
                      <button 
                        onClick={() => toggleHideSong(id)}
                        className="px-3 py-1.5 text-xs rounded-full border border-border hover:bg-text-primary/10 transition-colors text-text-primary flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Unhide</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
