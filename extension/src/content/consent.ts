export interface ConsentResult {
  allowed: boolean;
  remember: boolean;
}

export class ConsentModal {
  private el: HTMLDivElement | null = null;
  private domain: string;

  constructor(domain: string) {
    this.domain = domain;
  }

  public ask(): Promise<ConsentResult> {
    return new Promise((resolve) => {
      this.render();
      
      const onAllow = () => {
        const checkbox = this.el?.querySelector('#mr-remember') as HTMLInputElement;
        const remember = checkbox?.checked || false;
        this.close();
        resolve({ allowed: true, remember });
      };

      const onAllways = () => {
        this.close();
        resolve({ allowed: true, remember: true });
      };

      const onCancel = () => {
        this.close();
        resolve({ allowed: false, remember: false });
      };

      this.el?.querySelector('#mr-btn-allow')?.addEventListener('click', onAllow);
      this.el?.querySelector('#mr-btn-cancel')?.addEventListener('click', onCancel);
    });
  }

  private render() {
    this.el = document.createElement('div');
    Object.assign(this.el.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: '2147483647',
      backgroundColor: '#222',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      width: '300px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    });

    this.el.innerHTML = `
      <div style="font-weight:bold; font-size:16px;">Enable MoodReader?</div>
      <div style="opacity:0.8; font-size:13px;">
        Start background music for <b>${this.domain}</b>?
      </div>
      <label style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer;">
        <input type="checkbox" id="mr-remember" />
        Auto-ready next time on this domain
      </label>
      <div style="display:flex; gap:8px; margin-top:4px;">
        <button id="mr-btn-allow" style="${primaryBtn}">Enable</button>
        <button id="mr-btn-cancel" style="${secondaryBtn}">Cancel</button>
      </div>
    `;

    document.body.appendChild(this.el);
  }

  private close() {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }
}

const primaryBtn = `
  flex: 1;
  background: #3b82f6;
  border: none;
  color: white;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
`;

const secondaryBtn = `
  flex: 1;
  background: #444;
  border: none;
  color: white;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
`;
