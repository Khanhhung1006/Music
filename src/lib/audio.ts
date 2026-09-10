import { Song } from '../types';

class AudioEngine {
  private audio: HTMLAudioElement;
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  
  private bands = [60, 230, 910, 3600, 14000];
  private filters: BiquadFilterNode[] = [];
  private currentUrl: string | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  
  private onEndCb: (() => void) | null = null;
  private onTimeUpdateCb: ((time: number) => void) | null = null;
  private onPlayCb: (() => void) | null = null;
  private onPauseCb: (() => void) | null = null;
  private animationFrameId: number | null = null;
  
  private skipSilenceEnabled = false;
  private silenceThresholdDb = -45;
  private minSilenceDurationMs = 250;
  private silenceStartMs = 0;
  private isSkipping = false;
  private timeDataArray: Uint8Array | null = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
    this.audio.preservesPitch = true;
    
    this.audio.addEventListener('ended', () => {
      if (this.onEndCb) this.onEndCb();
    });
    
    this.audio.addEventListener('play', () => {
      this.ensureAudioContext();
      this.startTimeUpdateLoop();
      if (this.onPlayCb) this.onPlayCb();
    });
    
    this.audio.addEventListener('pause', () => {
      this.stopTimeUpdateLoop();
      if (this.onPauseCb) this.onPauseCb();
    });

    // Auto-unlock AudioContext on first user interaction for WebView
    const unlockAudio = () => {
      this.ensureAudioContext();
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
  }

  public setCallbacks(onPlay: () => void, onPause: () => void) {
    this.onPlayCb = onPlay;
    this.onPauseCb = onPause;
  }

  public setSkipSilence(enabled: boolean) {
    this.skipSilenceEnabled = enabled;
    if (!enabled && this.isSkipping) {
      this.isSkipping = false;
      this.audio.playbackRate = 1.0;
    }
  }

  public setSilenceThreshold(db: number) {
    this.silenceThresholdDb = db;
  }

  public setMinSilenceDuration(ms: number) {
    this.minSilenceDurationMs = ms;
  }

  private ensureAudioContext() {
    if (this.audioCtx) {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return;
    }
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    this.audioCtx = new AudioContextClass();
    
    // Set up Analyser
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeDataArray = new Uint8Array(this.analyser.fftSize);

    // Set up Equalizer (5-band)
    this.filters = this.bands.map((freq, i) => {
      const filter = this.audioCtx!.createBiquadFilter();
      if (i === 0) filter.type = 'lowshelf';
      else if (i === this.bands.length - 1) filter.type = 'highshelf';
      else filter.type = 'peaking';
      filter.frequency.value = freq;
      filter.gain.value = 0;
      return filter;
    });

    // Chain filters
    for (let i = 0; i < this.filters.length - 1; i++) {
      this.filters[i].connect(this.filters[i + 1]);
    }

    // Connect source -> filters -> analyser -> destination
    this.sourceNode = this.audioCtx.createMediaElementSource(this.audio);
    this.sourceNode.connect(this.filters[0]);
    this.filters[this.filters.length - 1].connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
  }

  private startTimeUpdateLoop() {
    const update = () => {
      if (this.onTimeUpdateCb && !this.audio.paused) {
        this.onTimeUpdateCb(this.audio.currentTime);
        
        // Skip Silence Logic
        if (this.skipSilenceEnabled && this.analyser && this.timeDataArray) {
          this.analyser.getByteTimeDomainData(this.timeDataArray);
          let sumSquare = 0;
          for (let i = 0; i < this.timeDataArray.length; i++) {
            const norm = (this.timeDataArray[i] - 128) / 128.0;
            sumSquare += norm * norm;
          }
          const rms = Math.sqrt(sumSquare / this.timeDataArray.length);
          const db = rms > 0 ? 20 * Math.log10(rms) : -100;
          
          if (db < this.silenceThresholdDb) {
            if (this.silenceStartMs === 0) {
              this.silenceStartMs = performance.now();
            } else {
              const duration = performance.now() - this.silenceStartMs;
              if (duration >= this.minSilenceDurationMs) {
                if (!this.isSkipping) {
                  this.isSkipping = true;
                  this.audio.playbackRate = 4.0;
                }
              }
            }
          } else {
            this.silenceStartMs = 0;
            if (this.isSkipping) {
              this.isSkipping = false;
              this.audio.playbackRate = 1.0;
            }
          }
        }
      }
      this.animationFrameId = requestAnimationFrame(update);
    };
    this.stopTimeUpdateLoop();
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopTimeUpdateLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public setEqGains(gains: number[]) {
    if (this.filters.length === gains.length) {
      this.filters.forEach((filter, i) => {
        filter.gain.value = gains[i];
      });
    }
  }

  public getVisualizerData(): Uint8Array | null {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return null;
  }

  public playFile(file: File, onEnd: () => void, onTimeUpdate: (time: number) => void) {
    this.onEndCb = onEnd;
    this.onTimeUpdateCb = onTimeUpdate;

    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
    }

    this.currentUrl = URL.createObjectURL(file);
    this.audio.src = this.currentUrl;
    this.audio.load();
    
    this.ensureAudioContext();
    
    const playPromise = this.audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(e => {
        if (e.name !== 'AbortError') {
          console.error('Audio play error:', e);
        }
      });
    }
  }

  public play() {
    if (this.audio.paused) {
      this.ensureAudioContext();
      this.audio.play().catch(e => {
        if (e.name !== 'AbortError') {
          console.error(e);
        }
      });
    }
  }

  public pause() {
    if (!this.audio.paused) {
      this.audio.pause();
    }
  }

  public seek(time: number) {
    this.audio.currentTime = time;
    if (this.onTimeUpdateCb) {
      this.onTimeUpdateCb(time);
    }
  }

  public isPlaying(): boolean {
    return !this.audio.paused;
  }

  public setVolume(volume: number) {
    this.audio.volume = Math.max(0, Math.min(1, volume));
  }
}

export const audioEngine = new AudioEngine();
