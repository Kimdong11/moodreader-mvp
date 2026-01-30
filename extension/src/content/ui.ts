export function renderControlBar(shadowRoot: ShadowRoot, onAction: (action: string) => void) {
  // Check if exists
  if (shadowRoot.getElementById('moodreader-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'moodreader-bar';
  bar.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: rgba(20, 20, 20, 0.9);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 10px 16px;
    display: flex;
    gap: 12px;
    align-items: center;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 999999;
    color: white;
    font-family: system-ui, sans-serif;
    font-size: 13px;
    transition: opacity 0.3s;
  `;

  const title = document.createElement('span');
  title.textContent = 'MoodReader';
  title.style.fontWeight = 'bold';
  title.style.marginRight = '8px';
  title.style.color = '#3b82f6';
  
  const createBtn = (label: string, action: string) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      background: transparent;
      border: 1px solid #444;
      color: #eee;
      border-radius: 4px;
      padding: 4px 8px;
      cursor: pointer;
      font-size: 12px;
    `;
    btn.onmouseover = () => btn.style.borderColor = '#666';
    btn.onmouseout = () => btn.style.borderColor = '#444';
    
    btn.onclick = () => onAction(action);
    return btn;
  };

  bar.appendChild(title);
  bar.appendChild(createBtn('Analyze', 'ANALYZE_CLICK'));
  bar.appendChild(createBtn('Play', 'PLAY'));
  bar.appendChild(createBtn('Stop', 'STOP'));
  bar.appendChild(createBtn('Next', 'NEXT'));
  bar.appendChild(createBtn('Reload', 'ANALYZE_CLICK')); // Reload re-triggers analysis

  shadowRoot.appendChild(bar);
}

export function showToast(shadowRoot: ShadowRoot, message: string, type: 'info'|'error' = 'info') {
   const toast = document.createElement('div');
   toast.textContent = message;
   toast.style.cssText = `
     position: fixed;
     bottom: 80px;
     right: 20px;
     background: ${type === 'error' ? '#ef4444' : '#3b82f6'};
     color: white;
     padding: 8px 12px;
     border-radius: 6px;
     font-size: 13px;
     box-shadow: 0 4px 12px rgba(0,0,0,0.3);
     z-index: 1000000;
     opacity: 0;
     transform: translateY(10px);
     transition: all 0.3s;
     font-family: system-ui;
   `;
   
   shadowRoot.appendChild(toast);
   
   // Animate in
   requestAnimationFrame(() => {
     toast.style.opacity = '1';
     toast.style.transform = 'translateY(0)';
   });
   
   // Remove
   setTimeout(() => {
     toast.style.opacity = '0';
     toast.style.transform = 'translateY(10px)';
     setTimeout(() => toast.remove(), 300);
   }, 3000);
}
