import { AppState, ReadingContext, TrackInfo, UserSettings } from '../common/types';
import { Logger } from '../common/logger';
import { MessageType, StateUpdatePayload } from '../common/messages';

const DEFAULT_SETTINGS: UserSettings = {
  dailyUsage: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  allowlist: [],
  mode: 'focus'
};

const DAILY_LIMIT = 20;

export class MoodReaderState {
  private state: AppState = AppState.IDLE;
  private context: ReadingContext | null = null;
  private currentTrack: TrackInfo | null = null;
  private settings: UserSettings = { ...DEFAULT_SETTINGS };
  private playerTabId: number | null = null;

  constructor() {
    this.loadSettings();
  }

  // --- Settings ---
  private async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['settings']);
      if (result.settings) {
        this.settings = { ...DEFAULT_SETTINGS, ...result.settings };
      }
      this.checkDailyReset();
    } catch (e) {
      Logger.error('Failed to load settings', e);
    }
  }

  private async saveSettings() {
    await chrome.storage.local.set({ settings: this.settings });
  }

  private checkDailyReset() {
    const today = new Date().toISOString().split('T')[0];
    if (this.settings.lastResetDate !== today) {
      this.settings.dailyUsage = 0;
      this.settings.lastResetDate = today;
      this.saveSettings();
    }
  }

  public canAnalyze(): boolean {
    this.checkDailyReset();
    return this.settings.dailyUsage < DAILY_LIMIT;
  }
  
  public incrementUsage() {
    this.checkDailyReset();
    // Soft increment: only if under limit. The blocking check happens before call.
    if (this.settings.dailyUsage < DAILY_LIMIT) {
       this.settings.dailyUsage++;
       this.saveSettings();
    }
  }

  public getUsage() {
    this.checkDailyReset();
    return this.settings.dailyUsage;
  }

  public async addToAllowlist(domainHash: string) {
    if (!this.settings.allowlist.includes(domainHash)) {
      this.settings.allowlist.push(domainHash);
      await this.saveSettings();
      Logger.log('Domain added to allowlist:', domainHash);
    }
  }

  // --- State Management ---
  public getState(): AppState {
    return this.state;
  }
  
  public getContext() {
    return this.context;
  }

  public setContext(ctx: ReadingContext) {
    this.context = ctx;
  }

  public setPlayerTabId(id: number) {
    this.playerTabId = id;
  }

  public getPlayerTabId() {
    return this.playerTabId;
  }

  public transition(newState: AppState, payload?: any) {
    if (newState === this.state && newState !== AppState.PLAYING) return;

    Logger.log(`State transition: ${this.state} -> ${newState}`);
    this.state = newState;

    if (newState === AppState.PLAYING && payload) {
      // payload might be track info if available
      if (payload.track) this.currentTrack = payload.track;
    }
    
    this.broadcastState();
  }

  public broadcastState() {
     const payload: StateUpdatePayload = {
       state: this.state,
       track: this.currentTrack || undefined
     };
     // Broadcast messages
     chrome.runtime.sendMessage({
       type: MessageType.STATE_UPDATED,
       payload
     }).catch(() => {});
     
     if (this.context?.sourceTabId) {
        chrome.tabs.sendMessage(this.context.sourceTabId, {
          type: MessageType.STATE_UPDATED,
          payload
        }).catch(() => {});
     }
  }
}

export const stateManager = new MoodReaderState();
