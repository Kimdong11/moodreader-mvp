import { Logger } from '../common/logger';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
  }
}

export type PlayerState = 'BUF' | 'PLAY' | 'PAUSE' | 'END' | 'ERR';

export class MoodReaderPlayer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private ytPlayer: any;
  private isReady = false;
  private queuePlay = false;

  public onStateChange?: (state: PlayerState, time: number) => void;
  public onError?: (error: string) => void;

  constructor(elementId: string) {
    this.loadApi(elementId);
  }

  private loadApi(elementId: string) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      this.ytPlayer = new window.YT.Player(elementId, {
        height: '100%',
        width: '100%',
        playerVars: {
          'playsinline': 1,
          'controls': 1 
        },
        events: {
          'onReady': this.onPlayerReady.bind(this),
          'onStateChange': this.onPlayerStateChange.bind(this),
          'onError': this.onPlayerError.bind(this)
        }
      });
    };
  }

  private onPlayerReady() {
    this.isReady = true;
    Logger.log('YouTube Player Ready');
    if (this.queuePlay) {
      this.play();
      this.queuePlay = false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onPlayerStateChange(event: any) {
    // YT.PlayerState: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (cued)
    let state: PlayerState | null = null;
    switch (event.data) {
      case 0: state = 'END'; break;
      case 1: state = 'PLAY'; break;
      case 2: state = 'PAUSE'; break;
      case 3: state = 'BUF'; break;
    }

    if (state) {
      const time = this.ytPlayer.getCurrentTime();
      if (this.onStateChange) this.onStateChange(state, time);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private onPlayerError(event: any) {
    Logger.error('YouTube Player Error', event.data);
    if (this.onError) this.onError(event.data.toString());
  }

  // --- Public API ---
  public loadVideo(trackId: string) {
    if (!this.isReady) return;
    this.ytPlayer.cueVideoById(trackId);
  }

  public play() {
    if (!this.isReady) {
      this.queuePlay = true;
      return;
    }
    this.ytPlayer.playVideo();
  }

  public pause() {
    if (!this.isReady) return;
    this.ytPlayer.pauseVideo();
  }
}
