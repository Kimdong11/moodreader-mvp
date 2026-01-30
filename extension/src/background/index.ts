import { Logger } from '../common/logger';
import { MessageType, MessageEnvelope } from '../common/messages';
import { stateManager } from './state';
import { AppState, TrackInfo } from '../common/types';
import { YouTubeSearch } from './youtube_search';
import { nextPolicy } from './next_policy';
import { sessionManager } from './report';

Logger.log('MoodReader Background Initializing...');

// Init logic
chrome.runtime.onMessage.addListener((message: MessageEnvelope, sender, sendResponse) => {
  const { type, payload } = message;
  
  // Heartbeat / Activity for Auto-stop
  sessionManager.onActivity();

  switch (type) {
    case MessageType.GET_STATE:
      sendResponse({ state: stateManager.getState() });
      break;
      
    case MessageType.PLAYER_HELLO:
      if (sender.tab?.id) {
        stateManager.setPlayerTabId(sender.tab.id);
      }
      break;

    case MessageType.PLAYER_STATE_CHANGE:
       if (payload?.state === 'PLAY') {
         stateManager.transition(AppState.PLAYING);
         sessionManager.startSession(); 
       }
       if (payload?.state === 'PAUSE') {
         stateManager.transition(AppState.PAUSED);
         sessionManager.endSession(false);
       }
       if (payload?.state === 'END') {
         stateManager.transition(AppState.IDLE);
         sessionManager.endSession(false);
       }
       break;

    case MessageType.CMD_ALLOWLIST:
      if (payload?.domainHash) {
        stateManager.addToAllowlist(payload.domainHash);
      }
      break;

    case MessageType.ANALYZE_REQUEST:
      handleAnalyzeRequest(payload);
      break; 

    case MessageType.CONTROL_ACTION:
      handleControl(payload.action);
      break;
  }
  
  return true; // Keep channel open
});

// Auto-stop handler hook (need to wire via polling or callback if cleaner)
// For MVP, we'll just check if sessionManager stops.
// Actually sessionManager.endSession returns session. 
// We need to listen to sessionManager auto-stop. 
// Patching sessionManager.endSession to stop player?
// Cleaner: create a bridge.
// For MVP, I'll modify sessionManager to accept a callback in report.ts?
// Or just let `resetAutoStop` call a global `stopPlayer`.
// I'll make a `stopPlayer()` function exportable or accessible.

// ... existing handleAnalyzeRequest ...
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleAnalyzeRequest(payload: any) {
  stateManager.transition(AppState.READY); // Loading...

  stateManager.setContext({
    sourceTabId: 0, 
    domainHash: payload.domainHash,
    urlHash: payload.urlHash
  });

  // 1. Call Analysis Server OR LKG if Limit Reached
  let mood = { tempo: 'medium', genres: ['lofi'] }; // Fallback/Default

  if (stateManager.canAnalyze()) {
      const API_URL = 'http://localhost:8080/v1/analyze';
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            textShort: payload.textShort,
            domainHash: payload.domainHash,
            urlHash: payload.urlHash
          })
        });
        
        if (response.ok) {
          mood = await response.json();
          Logger.log('Server Analysis Result:', mood);
          stateManager.incrementUsage(); // Deduct quota
        } else {
          Logger.warn('Server returned error:', response.status);
        }
      } catch (e) {
        Logger.error('Analysis Failed (Network/Server)', e);
      }
  } else {
      Logger.warn('Daily Usage Limit reached. Using Local/Default mood.');
  }

  // 2. Build Query based on Analysis
  const primary = mood.genres?.[0] || 'ambient';
  const secondary = mood.genres?.[1] || '';
  const query = `relaxing ${primary} ${secondary} music ${mood.tempo || 'slow'} tempo`;
  
  Logger.log(`Searching YouTube: ${query}`);

  // 3. Search
  const candidates = await YouTubeSearch.search(query);
  Logger.log(`Found ${candidates.length} candidates.`);

  if (candidates.length > 0) {
    // 4. Setup Policy
    nextPolicy.setCandidates(candidates, payload.domainHash, query);
    
    // 5. Pick First
    const track = await nextPolicy.getNext();
    
    if (track) {
      Logger.log('Selected Track:', track);
      playTrack(track);
    } else {
      Logger.warn('No suitable track found.');
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function playTrack(track: any) {
  const playerTab = stateManager.getPlayerTabId();
  if (!playerTab) {
    // Open player
    chrome.tabs.create({ url: chrome.runtime.getURL('player.html'), active: false }, (tab) => {
       if (tab.id) {
         stateManager.setPlayerTabId(tab.id);
         // Wait for Hello
         setTimeout(() => {
           sendLoadCommand(tab.id!, track);
         }, 3000);
       }
    });
  } else {
    sendLoadCommand(playerTab, track);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sendLoadCommand(tabId: number, track: any) {
  chrome.tabs.sendMessage(tabId, {
    type: MessageType.CMD_LOAD,
    payload: { trackId: track.id }
  });
  stateManager.transition(AppState.READY, { track });
}

function stopPlayer() {
    const playerTab = stateManager.getPlayerTabId();
    if (playerTab) {
      chrome.tabs.sendMessage(playerTab, { type: MessageType.CMD_PAUSE });
      stateManager.transition(AppState.STOPPED);
    }
}

function handleControl(action: string) {
  const playerTab = stateManager.getPlayerTabId();

  if (action === 'OPEN_PLAYER') {
     chrome.tabs.create({ url: chrome.runtime.getURL('player.html') });
     return;
  }

  if (!playerTab) {
    Logger.warn('No player tab found for control action');
    return;
  }
  
  switch (action) {
    case 'PLAY':
      chrome.tabs.sendMessage(playerTab, { type: MessageType.CMD_PLAY });
      stateManager.transition(AppState.PLAYING);
      break;
    case 'STOP':
      stopPlayer();
      break;
    case 'QUIT':
      chrome.tabs.remove(playerTab);
      stateManager.setPlayerTabId(-1);
      stateManager.transition(AppState.IDLE);
      break;
    case 'NEXT':
      handleNext();
      break;
  }
}

async function handleNext() {
  const track = await nextPolicy.getNext();
  if (track) {
    const playerTab = stateManager.getPlayerTabId();
    if (playerTab) {
       sendLoadCommand(playerTab, track);
       // Auto-play on next
       chrome.tabs.sendMessage(playerTab, { type: MessageType.CMD_PLAY });
       stateManager.transition(AppState.PLAYING, { track });
    }
  }
}

// Wire Auto Stop
// Needs a nasty hack to monkey patch or use callback.
// I'll add an export function `onAutoStop` in index.ts and pass it to sessionManager?
// Circular dependency.
// I'll poll sessionManager or just have sessionManager send a message to Runtime (self)?
// self-messaging is clean.
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'INTERNAL_AUTO_STOP') {
        stopPlayer();
    }
});

// Update report.ts to send this message:
// `chrome.runtime.sendMessage({ type: 'INTERNAL_AUTO_STOP' })`
