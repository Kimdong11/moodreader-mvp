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
    
    // Attempt to bypass strict origin checks by not declaring origin if possible, or using standard
    // Some videos block playback on 'chrome-extension://' origin.
    // Lofi Girl usually allows embed everywhere.
    // Try removing origin param first, as it defaults to current page origin which might trigger block.
    // Also add referrer policy.
    
    this.iframe.src = `https://www.youtube.com/embed/?enablejsapi=1&controls=1&rel=0&autoplay=0`;
    this.iframe.allow = "autoplay; encrypted-media; gyroscope; picture-in-picture";
    this.iframe.style.border = '0';
    this.iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    
    container.appendChild(this.iframe);
    
    window.addEventListener('message', this.onMessage.bind(this));
    
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
          if (data.event === 'infoDelivery' && data.info) {
              if (data.info.playerState !== undefined) {
                 this.mapState(data.info.playerState);
              }
          }
      } catch (e) {
          // ignore
      }
  }

  private mapState(ytState: number) {
      let state: PlayerState | null = null;
      if (ytState === 0) state = 'END';
      if (ytState === 1) state = 'PLAY';
      if (ytState === 2) state = 'PAUSE';
      if (ytState === 3) state = 'BUF';
      
      if (state && this.onStateChange) {
          this.onStateChange(state, 0);
      }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sendCommand(func: string, args: any[] = []) {
      if (!this.iframe || !this.iframe.contentWindow) return;
      this.iframe.contentWindow.postMessage(JSON.stringify({
          event: 'command',
          func: func,
          args: args
      }), '*');
  }

  public loadVideo(trackId: string) {
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
