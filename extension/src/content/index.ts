import { computeContext, extractPageText } from './extract';
import { ControlBar } from './ui';
import { MessageType, AnalyzeRequestPayload, StateUpdatePayload } from '../common/messages';
import { Logger } from '../common/logger';

let hasScrolled = false;
let controlBar: ControlBar | null = null;

async function init() {
  // 1. Wait for scroll
  window.addEventListener('scroll', onFirstScroll, { passive: true });
  
  // 2. Listen for messages
  chrome.runtime.onMessage.addListener((msg) => {
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
  Logger.log('Reading activity detected. Starting MoodReader...');
  
  controlBar = new ControlBar();
  controlBar.show();

  const ctx = await computeContext();
  Logger.log('Context:', ctx);

  // Check allowlist (Stub for Prompt 4)
  // For now, always request analysis to verify flow or just log
  
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
