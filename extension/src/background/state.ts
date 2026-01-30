import { AppState, ReadingContext, TrackInfo, UserSettings } from '../common/types';
import { Logger } from '../common/logger';
import { MessageType, StateUpdatePayload } from '../common/messages';

const DEFAULT_SETTINGS: UserSettings = {
  dailyUsage: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  allowlist: [],
  mode: 'focus'
};

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
      Logger.log('Settings loaded', this.settings);
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
    }
    
    this.broadcastState();
  }

  public broadcastState() {
     const payload: StateUpdatePayload = {
       state: this.state,
       track: this.currentTrack || undefined
     };
     // Broadcast to Popup and Content Scripts
     chrome.runtime.sendMessage({
       type: MessageType.STATE_UPDATED,
       payload
     }).catch(() => {
       // No listener, ignore
     });
     
     if (this.context?.sourceTabId) {
        chrome.tabs.sendMessage(this.context.sourceTabId, {
          type: MessageType.STATE_UPDATED,
          payload
        }).catch(() => {});
     }
  }
  
  // Helpers
  public incrementUsage() {
    this.checkDailyReset();
    this.settings.dailyUsage++;
    this.saveSettings();
  }
  
  public getUsage() {
    this.checkDailyReset();
    return this.settings.dailyUsage;
  }
}

export const stateManager = new MoodReaderState();
