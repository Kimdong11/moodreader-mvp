import { MessageType, MessageEnvelope, PlayerStatePayload } from '../common/messages';
import { Logger } from '../common/logger';
import { MoodReaderPlayer } from './player';

export class PlayerBridge {
  private player: MoodReaderPlayer;

  constructor(player: MoodReaderPlayer) {
    this.player = player;
    this.init();
  }

  private init() {
    // Notify Background we are here
    chrome.runtime.sendMessage({ type: MessageType.PLAYER_HELLO });

    // Listen for commands
    chrome.runtime.onMessage.addListener((msg: MessageEnvelope) => {
      this.handleMessage(msg);
    });

    // Listen to Player events
    this.player.onStateChange = (state, ct) => {
      this.sendUpdate({ state, currentTime: ct });
    };
    
    this.player.onError = (err) => {
      this.sendUpdate({ state: 'ERR', error: err });
    };
  }

  private handleMessage(msg: MessageEnvelope) {
    Logger.log('Player Bridge received:', msg.type);
    switch (msg.type) {
      case MessageType.CMD_LOAD:
        if (msg.payload?.trackId) {
          this.player.loadVideo(msg.payload.trackId);
        }
        break;
      case MessageType.CMD_PLAY:
        this.player.play();
        break;
      case MessageType.CMD_PAUSE:
        this.player.pause();
        break;
      case MessageType.CMD_SET_VOLUME:
        // Optional
        break;
    }
  }

  private sendUpdate(payload: PlayerStatePayload) {
    chrome.runtime.sendMessage({
      type: MessageType.PLAYER_STATE_CHANGE,
      payload
    });
  }
}
