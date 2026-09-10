export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  durationStr: string;
  coverUrl: string | null;
  file: File;
}

export type PlayMode = 'normal' | 'repeat_all' | 'repeat_one' | 'shuffle';

export interface EqualizerPreset {
  name: string;
  gains: number[];
}
