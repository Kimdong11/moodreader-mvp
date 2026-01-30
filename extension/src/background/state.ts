import { Logger } from '../common/logger';
import { AppState, TrackInfo } from '../common/types';

export interface MoodReaderSettings {
  allowlist: string[];
  mode: 'focus' | 'relax' | 'energy';
  intensity: 'low' | 'medium' | 'high';
  volume: number;
  dailyUsage: number;
  lastResetDate: string; // YYYY-MM-DD
  telemetryEnabled: boolean;
}

const DEFAULT_SETTINGS: MoodReaderSettings = {
  allowlist: [],
  mode: 'relax',
  intensity: 'medium',
  volume: 50,
  dailyUsage: 0,
  lastResetDate: '',
  telemetryEnabled: true
};

const DAILY_LIMIT = 20;

export class MoodReaderState {
  private state: AppState = AppState.IDLE;
  private context: {
    sourceTabId: number;
    domainHash: string;
    urlHash: string;
  } = { sourceTabId: -1, domainHash: '', urlHash: '' };
  
  private playerTabId: number | null = null;
  private currentTrack: TrackInfo | null = null;
  private settings: MoodReaderSettings = DEFAULT_SETTINGS;

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    const data = await chrome.storage.local.get(['settings']);
    if (data.settings) {
      this.settings = { ...DEFAULT_SETTINGS, ...data.settings };
    }
    this.checkDailyReset();
  }

  private checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    if (this.settings.lastResetDate !== today) {
      this.settings.dailyUsage = 0;
      this.settings.lastResetDate = today;
      this.saveSettings();
    }
  }

  public async saveSettings() {
    await chrome.storage.local.set({ settings: this.settings });
  }

  // ... (Transition and Getter methods remain same, will copy them to preserve file integrity) ...
  // Re-implementing methods to ensure full file correctness
  public transition(newState: AppState, payload?: any) {
    Logger.log(`State Transition: ${this.state} -> ${newState}`, payload);
    this.state = newState;
    if (payload?.track) {
      this.currentTrack = payload.track;
    }
    this.broadcastState();
  }

  public getState() { return this.state; }
  
  public setContext(ctx: { sourceTabId: number, domainHash: string, urlHash: string }) {
    this.context = ctx;
  }
  
  public getContext() { return this.context; }

  public setPlayerTabId(id: number) { this.playerTabId = id; }
  public getPlayerTabId() { return this.playerTabId; }

  public addToAllowlist(domainHash: string) {
    if (!this.settings.allowlist.includes(domainHash)) {
      this.settings.allowlist.push(domainHash);
      this.saveSettings();
    }
  }

  public isAllowlisted(domainHash: string): boolean {
    return this.settings.allowlist.includes(domainHash);
  }

  public canAnalyze(): boolean {
    this.checkDailyReset();
    return this.settings.dailyUsage < DAILY_LIMIT; // Soft limit 20
  }

  public incrementUsage() {
    this.settings.dailyUsage++;
    this.saveSettings();
  }
  
  public isTelemetryEnabled() {
    return this.settings.telemetryEnabled !== false;
  }

  private broadcastState() {
     chrome.runtime.sendMessage({
       type: 'STATE_UPDATE',
       payload: { state: this.state, track: this.currentTrack }
     }).catch(() => {}); // Ignore if no popup open
  }
}

export const stateManager = new MoodReaderState();
