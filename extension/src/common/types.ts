export enum AppState {
  IDLE = 'IDLE',
  READY = 'READY', // Music found & paused
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  STOPPED = 'STOPPED', // explicit stop or error
}

export interface ReadingContext {
  sourceTabId: number;
  domainHash: string;
  urlHash: string;
}

export interface TrackInfo {
  id: string; // YouTube Video ID
  title: string;
  channel: string;
}

export interface UserSettings {
  dailyUsage: number;
  lastResetDate: string; // YYYY-MM-DD
  allowlist: string[]; // List of domain hashes
  mode: 'focus' | 'lofi' | 'ambient';
}
