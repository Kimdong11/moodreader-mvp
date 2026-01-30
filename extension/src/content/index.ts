import { computeContext, extractPageText } from './extract';
import { ControlBar } from './ui';
import { ConsentModal } from './consent';
import { MessageType, AnalyzeRequestPayload, StateUpdatePayload, MessageEnvelope } from '../common/messages';
import { Logger } from '../common/logger';

let hasScrolled = false;
let controlBar: ControlBar | null = null;

async function init() {
  // 1. Wait for scroll
  window.addEventListener('scroll', onFirstScroll, { passive: true });
  
  // 2. Listen for messages
  chrome.runtime.onMessage.addListener((msg: MessageEnvelope) => {
    if (msg.type === MessageType.STATE_UPDATED) {
      const payload = msg.payload as StateUpdatePayload;
      controlBar?.updateState(payload.state);
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

  // Check Allowlist
  let allowed = false;
  try {
    const storage = await chrome.storage.local.get(['settings']);
    const allowlist = storage.settings?.allowlist || [];
    if (allowlist.includes(ctx.domainHash)) {
      allowed = true;
    }
  } catch (e) {
    Logger.error('Failed to read settings', e);
  }

  if (!allowed) {
    // Show Modal
    const modal = new ConsentModal(ctx.domain);
    const result = await modal.ask();
    if (!result.allowed) {
      Logger.log('User denied consent.');
      return; 
    }
    
    // If allowed and remember, update allowlist
    if (result.remember) {
      chrome.runtime.sendMessage({
        type: MessageType.CMD_ALLOWLIST,
        payload: { domainHash: ctx.domainHash }
      });
    }
  }

  // Proceed
  Logger.log('Consent granted. Starting MoodReader...');
  controlBar = new ControlBar();
  controlBar.show();

  // Extract Text
  const text = extractPageText();
  if (text.length < 200) {
    Logger.log('Page text too short, skipping.');
    return;
  }

  // Send Request
  chrome.runtime.sendMessage({
    type: MessageType.ANALYZE_REQUEST,
    payload: {
      textShort: text,
      domainHash: ctx.domainHash,
      urlHash: ctx.urlHash
    } as AnalyzeRequestPayload
  });
}

init();
