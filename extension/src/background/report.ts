import { Logger } from '../common/logger';

export interface Session {
  startTime: number;
  endTime?: number;
  durationSeconds: number;
  mode: string; // 'focus' | 'relax' etc
  autoStopped: boolean;
}

export interface WeeklyStats {
  totalMinutes: number;
  sessionCount: number;
  topMode: string;
  autoStopCount: number;
}

const STORAGE_KEY = 'reading_sessions';

export class SessionManager {
  private currentSession: Session | null = null;
  private autoStopTimer: any = null;
  private readonly AUTO_STOP_LIMIT = 15 * 60 * 1000; // 15 min

  public startSession(mode: string = 'focus') {
    if (this.currentSession) this.endSession(false);
    
    this.currentSession = {
      startTime: Date.now(),
      durationSeconds: 0,
      mode,
      autoStopped: false
    };
    Logger.log('Session started');
    this.resetAutoStop();
  }

  public onActivity() {
    // Call this on scroll/messages from content? 
    // Content script sends events implicitly by checking activity.
    // However, Prompt 0 says: "Auto-stop after 15 minutes of reading inactivity"
    // We need to receive hearbeats or infer from events.
    // For MVP, if music plays, we assume activity? No, music is background.
    // We need a heartbeat from Content Script.
    // Prompt 3 says "Detect scroll".
    // We can add a "HEARTBEAT" message or similar.
    // For now, let's just reset on any message from Content/Controller.
    this.resetAutoStop();
  }

  private resetAutoStop() {
    if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
    if (!this.currentSession) return;
    
    this.autoStopTimer = setTimeout(() => {
       Logger.log('Auto-stopping session due to inactivity');
       this.endSession(true);
       // Trigger logic to stop player?
       // We'll need a callback or observer pattern.
       // For this file, just manage data. Listener in index.ts handles actual stop.
    }, this.AUTO_STOP_LIMIT);
  }

  public async endSession(autoStopped: boolean) {
    if (!this.currentSession) return;
    if (this.autoStopTimer) clearTimeout(this.autoStopTimer);
    
    this.currentSession.endTime = Date.now();
    this.currentSession.durationSeconds = Math.floor((this.currentSession.endTime - this.currentSession.startTime) / 1000);
    this.currentSession.autoStopped = autoStopped;

    if (this.currentSession.durationSeconds > 10) { 
      await this.saveSession(this.currentSession);
    }
    
    const session = this.currentSession;
    this.currentSession = null;
    Logger.log('Session ended', { autoStopped });
    
    return session; // return so caller can react (e.g. stop music)
  }

  private async saveSession(session: Session) {
    const data = await chrome.storage.local.get([STORAGE_KEY]);
    const sessions: Session[] = data[STORAGE_KEY] || [];
    sessions.push(session);
    
    // Prune > 7 days (Prompt 10 says "rolling 7 days", Prune older)
    // Actually keep 30 days history just in case, limit report to 7.
    const cutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const filtered = sessions.filter(s => s.startTime > cutoff);
    
    await chrome.storage.local.set({ [STORAGE_KEY]: filtered });
  }

  public async getWeeklyStats(): Promise<WeeklyStats> {
    const data = await chrome.storage.local.get([STORAGE_KEY]);
    const sessions: Session[] = data[STORAGE_KEY] || [];
    
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recent = sessions.filter(s => s.startTime > cutoff);

    const totalMinutes = Math.floor(recent.reduce((acc, s) => acc + s.durationSeconds, 0) / 60);
    const sessionCount = recent.length;
    const autoStopCount = recent.filter(s => s.autoStopped).length;
    
    // Top Mode
    const modeCounts: Record<string, number> = {};
    recent.forEach(s => {
      modeCounts[s.mode] = (modeCounts[s.mode] || 0) + 1;
    });
    
    const topMode = Object.entries(modeCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { totalMinutes, sessionCount, topMode, autoStopCount };
  }
}

export const sessionManager = new SessionManager();
