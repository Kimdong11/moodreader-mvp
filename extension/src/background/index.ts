import { Logger } from '../common/logger';
import { MessageType, MessageEnvelope } from '../common/messages';
import { stateManager } from './state';
import { AppState, TrackInfo } from '../common/types';
import { YouTubeSearch } from './youtube_search';
import { nextPolicy } from './next_policy';

Logger.log('MoodReader Background Initializing...');

// Init logic
chrome.runtime.onMessage.addListener((message: MessageEnvelope, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case MessageType.GET_STATE:
      sendResponse({ state: stateManager.getState() });
      break;
      
    case MessageType.PLAYER_HELLO:
      if (sender.tab?.id) {
        Logger.log('Player tab registered:', sender.tab.id);
        stateManager.setPlayerTabId(sender.tab.id);
      }
      break;

    case MessageType.PLAYER_STATE_CHANGE:
       if (payload?.state === 'PLAY') stateManager.transition(AppState.PLAYING);
       if (payload?.state === 'PAUSE') stateManager.transition(AppState.PAUSED);
       if (payload?.state === 'END') {
         stateManager.transition(AppState.IDLE);
       }
       break;

    case MessageType.CMD_ALLOWLIST:
      if (payload?.domainHash) {
        stateManager.addToAllowlist(payload.domainHash);
      }
      break;

    case MessageType.ANALYZE_REQUEST:
      Logger.log('Analyze Request received', payload);
      handleAnalyzeRequest(payload);
      break; 

    case MessageType.CONTROL_ACTION:
      handleControl(payload.action);
      break;
  }
  
  return true; // Keep channel open
});

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
      // LKG or simple default logic could go here
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
      chrome.tabs.sendMessage(playerTab, { type: MessageType.CMD_PAUSE });
      stateManager.transition(AppState.STOPPED);
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
    Logger.log('Next selected:', track);
    const playerTab = stateManager.getPlayerTabId();
    if (playerTab) {
       sendLoadCommand(playerTab, track);
       // Auto-play on next
       chrome.tabs.sendMessage(playerTab, { type: MessageType.CMD_PLAY });
       stateManager.transition(AppState.PLAYING, { track });
    }
  }
}
