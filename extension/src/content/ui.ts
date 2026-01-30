import { MessageType, ControlActionPayload } from '../common/messages';
import { AppState } from '../common/types';

const btnStyle = `
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export class ControlBar {
  private el: HTMLDivElement;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private state: AppState = AppState.IDLE;
  
  constructor() {
    this.el = document.createElement('div');
    this.setupStyles();
    this.render();
    document.body.appendChild(this.el);
    this.attachListeners();
  }

  private setupStyles() {
    this.el.id = 'moodreader-bar';
    Object.assign(this.el.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      zIndex: '2147483647', // Max z-index
      backgroundColor: '#1a1a1a',
      color: 'white',
      padding: '8px 16px',
      borderRadius: '24px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      transition: 'opacity 0.3s',
      opacity: '0', // Hidden initially
      pointerEvents: 'none' // Click-through when hidden
    });
  }

  private render() {
    // Icons: Play(▶), Stop(■), Next(⏭), Quit(✕), Player(↗)
    this.el.innerHTML = `
      <span id="mr-status" style="opacity:0.7; font-size:12px">Ready</span>
      <button id="mr-play" style="${btnStyle}">▶</button>
      <button id="mr-stop" style="${btnStyle}; display:none">■</button>
      <button id="mr-next" style="${btnStyle}">⏭</button>
      <div style="width:1px; height:16px; background:#444"></div>
      <button id="mr-player" style="${btnStyle}" title="Open Player">↗</button>
      <button id="mr-quit" style="${btnStyle}" title="Quit">✕</button>
    `;
  }
  
  private attachListeners() {
    const on = (id: string, action: string) => {
      this.el.querySelector(`#${id}`)?.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          type: MessageType.CONTROL_ACTION,
          payload: { action } as ControlActionPayload
        });
      });
    };
    
    on('mr-play', 'PLAY');
    on('mr-stop', 'STOP');
    on('mr-next', 'NEXT'); 
    on('mr-quit', 'QUIT');
    on('mr-player', 'OPEN_PLAYER');
  }

  public show() {
    this.el.style.opacity = '1';
    this.el.style.pointerEvents = 'auto';
  }

  public updateState(newState: AppState) {
    this.state = newState;
    const playBtn = this.el.querySelector('#mr-play') as HTMLElement;
    const stopBtn = this.el.querySelector('#mr-stop') as HTMLElement;
    const status = this.el.querySelector('#mr-status') as HTMLElement;

    if (status) status.textContent = newState;

    if (newState === AppState.PLAYING) {
      if (playBtn) playBtn.style.display = 'none';
      if (stopBtn) stopBtn.style.display = 'block';
    } else {
      if (playBtn) playBtn.style.display = 'block';
      if (stopBtn) stopBtn.style.display = 'none';
    }
  }
}
