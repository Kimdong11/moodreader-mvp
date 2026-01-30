import { computeContext, extractPageText } from './extract';
import { renderControlBar, showToast } from './ui';
import { ConsentModal } from './consent';
import { MessageType, AnalyzeRequestPayload, StateUpdatePayload, MessageEnvelope } from '../common/messages';
import { Logger } from '../common/logger';

let hasScrolled = false;
let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

async function init() {
  window.addEventListener('scroll', onFirstScroll, { passive: true });
  
  chrome.runtime.onMessage.addListener((msg: MessageEnvelope) => {
    if (msg.type === MessageType.STATE_UPDATED) {
      // Optional: Update UI based on state if needed
      // const payload = msg.payload as StateUpdatePayload;
      // showToast(shadowRoot!, `State: ${payload.state}`);
    }
  });
  
  Logger.log('Content Script Initialized.');
}

function onFirstScroll() {
  if (hasScrolled) return;
  hasScrolled = true;
  window.removeEventListener('scroll', onFirstScroll);
  startExperience();
}

async function startExperience() {
  Logger.log('Reading activity detected. Checking consent...');
  
  const ctx = await computeContext();
  Logger.log('Context:', ctx);

  // Check Settings
  let allowed = false;
  try {
    const storage = await chrome.storage.local.get(['settings']);
    const allowlist = storage.settings?.allowlist || [];
    if (allowlist.includes(ctx.domainHash)) allowed = true;
  } catch (e) {
    Logger.error('Failed to read settings', e);
  }

  if (!allowed) {
    const modal = new ConsentModal(ctx.domain);
    const result = await modal.ask();
    if (!result.allowed) return;
    
    if (result.remember) {
      chrome.runtime.sendMessage({
        type: MessageType.CMD_ALLOWLIST,
        payload: { domainHash: ctx.domainHash }
      });
    }
  }

  // Init Shadow DOM for UI
  if (!shadowHost) {
      shadowHost = document.createElement('div');
      shadowHost.id = 'moodreader-host';
      document.body.appendChild(shadowHost);
      shadowRoot = shadowHost.attachShadow({ mode: 'open' });
  }

  // Render Bar
  renderControlBar(shadowRoot!, (action) => {
      if (action === 'ANALYZE_CLICK') {
          triggerAnalysis(ctx);
      } else if (['PLAY', 'STOP', 'NEXT'].includes(action)) {
          chrome.runtime.sendMessage({
              type: MessageType.CONTROL_ACTION,
              payload: { action }
          });
      }
  });

  // Initial Analysis
  triggerAnalysis(ctx);
}

function triggerAnalysis(ctx: any) {
    const text = extractPageText();
    if (text.length < 200) {
        if (shadowRoot) showToast(shadowRoot, 'Page text too short.', 'error');
        return;
    }

    if (shadowRoot) showToast(shadowRoot, 'Analyzing mood...');
    
    chrome.runtime.sendMessage({
        type: MessageType.ANALYZE_REQUEST,
        payload: {
            textShort: text,
            domainHash: ctx.domainHash,
            urlHash: ctx.urlHash
        }
    });
}

init();
