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

// Fixed Play Logic: Use Localhost Player (URL Control)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function playTrack(track: any) {
  const currentTabId = stateManager.getPlayerTabId();
  const url = `http://localhost:8080/player.html?v=${track.id}#play`;

  if (currentTabId) {
    chrome.tabs.get(currentTabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
             // Tab closed, create new
             createAndSetPlayer(url, track);
        } else {
             // Tab exists, update URL (Change Video)
             chrome.tabs.update(currentTabId, { url: url, active: false });
             stateManager.transition(AppState.PLAYING, { track });
             sessionManager.startSession();
        }
    });
  } else {
    createAndSetPlayer(url, track);
  }
}

function createAndSetPlayer(url: string, track: any) {
    chrome.tabs.create({ url: url, active: false }, (tab) => {
      if (tab.id) {
          stateManager.setPlayerTabId(tab.id);
          stateManager.transition(AppState.PLAYING, { track });
          sessionManager.startSession();
      }
    });
}

function stopPlayer() {
    const playerTab = stateManager.getPlayerTabId();
    if (playerTab) {
       chrome.tabs.get(playerTab, (tab) => {
          if (!chrome.runtime.lastError && tab && tab.url) {
              const base = tab.url.split('#')[0];
              chrome.tabs.update(playerTab, { url: base + '#pause' }); // Hash change triggers pause
              stateManager.transition(AppState.PAUSED);
              sessionManager.endSession(false);
          }
       });
    }
}

function handleControl(action: string) {
  const playerTab = stateManager.getPlayerTabId();

  if (action === 'ANALYZE_CLICK') {
      // Logic handled by Content Script Request
      return;
  }

  if (action === 'OPEN_PLAYER') {
     // Just create tab again? Or focus existing?
     if (playerTab) chrome.tabs.update(playerTab, { active: true });
     else chrome.tabs.create({ url: 'http://localhost:8080/player.html' });
     return;
  }
  
  if (!playerTab) {
     if (action === 'PLAY' || action === 'NEXT') {
         // Should re-analyze or pick last track? Not stored.
         // Just warn.
         Logger.warn('No active player tab. Please Analyze first.');
     }
     return;
  }
  
  switch (action) {
    case 'PLAY':
      chrome.tabs.get(playerTab, (tab) => {
          if (tab && tab.url) {
              const base = tab.url.split('#')[0];
              chrome.tabs.update(playerTab, { url: base + '#play' });
              stateManager.transition(AppState.PLAYING);
              sessionManager.startSession();
          }
      });
      break;
    case 'STOP':
      stopPlayer();
      break;
    case 'QUIT':
      chrome.tabs.remove(playerTab);
      stateManager.setPlayerTabId(-1); // Use null actually, but number expected
      stateManager.transition(AppState.IDLE);
      sessionManager.endSession(false);
      break;
    case 'NEXT':
      handleNext();
      break;
  }
}

async function handleNext() {
  const track = await nextPolicy.getNext();
  if (track) {
     playTrack(track); // Updates URL with new Video ID
  }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'INTERNAL_AUTO_STOP') {
        stopPlayer();
    }
});
