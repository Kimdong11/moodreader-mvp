import { Logger } from '../common/logger';

export type PlayerState = 'BUF' | 'PLAY' | 'PAUSE' | 'END' | 'ERR';

export class MoodReaderPlayer {
  private iframe: HTMLIFrameElement | null = null;
  private isReady = false;
  
  public onStateChange?: (state: PlayerState, time: number) => void;
  public onError?: (error: string) => void;

  constructor(elementId: string) {
    this.initFrame(elementId);
  }

  private initFrame(elementId: string) {
    const container = document.getElementById(elementId);
    if (!container) return;

    // Create frame dynamically
    this.iframe = document.createElement('iframe');
    this.iframe.id = 'yt-player-frame';
    this.iframe.width = '100%';
    this.iframe.height = '100%';
    // Use raw embed with enablejsapi=1
    // Important: No auto-play initially.
    const origin = window.location.origin;
    this.iframe.src = `https://www.youtube.com/embed/?enablejsapi=1&origin=${encodeURIComponent(origin)}&controls=1&rel=0`;
    this.iframe.allow = "autoplay; encrypted-media; gyroscope; picture-in-picture";
    this.iframe.style.border = '0';
    
    container.appendChild(this.iframe);
    
    // Listen for messages from YouTube
    window.addEventListener('message', this.onMessage.bind(this));
    
    // Assume ready after short delay or wait for event (YouTube sends onReady but inconsistent in raw mode)
    // We'll mark ready quickly.
    setTimeout(() => {
        this.isReady = true;
        Logger.log('YouTube Player (Raw) Initialized');
    }, 1500);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onMessage(event: MessageEvent) {
      if (event.origin !== "https://www.youtube.com") return;
      
      try {
          const data = JSON.parse(event.data);
          // Raw messages from YouTube are: { "event": "infoDelivery", "info": { "playerState": 1, ... } }
          if (data.event === 'infoDelivery' && data.info) {
              if (data.info.playerState !== undefined) {
                 this.mapState(data.info.playerState);
              }
              if (data.info.currentTime) {
                  // update time
              }
          }
      } catch (e) {
          // ignore
      }
  }

  private mapState(ytState: number) {
      // YT: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
      let state: PlayerState | null = null;
      if (ytState === 0) state = 'END';
      if (ytState === 1) state = 'PLAY';
      if (ytState === 2) state = 'PAUSE';
      if (ytState === 3) state = 'BUF';
      
      if (state && this.onStateChange) {
          this.onStateChange(state, 0); // time not tracked strictly for MVP
      }
  }

  // Raw Command Sender
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendCommand(func: string, args: any[] = []) {
      if (!this.iframe || !this.iframe.contentWindow) return;
      this.iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: func,
          args: args
      }), '*');
  }

  // --- Public API ---
  public loadVideo(trackId: string) {
      // loadVideoById
      this.sendCommand('loadVideoById', [trackId]);
      this.isReady = true; 
  }

  public play() {
      this.sendCommand('playVideo');
  }

  public pause() {
      this.sendCommand('pauseVideo');
  }
}
