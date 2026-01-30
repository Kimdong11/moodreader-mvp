import { Logger } from '../common/logger';
import { MessageType, MessageEnvelope } from '../common/messages';
import { stateManager } from './state';
import { AppState } from '../common/types';

Logger.log('MoodReader Background Initializing...');

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
      // Stub for Prompt 7/8
      stateManager.setContext({
        sourceTabId: sender.tab?.id || 0,
        domainHash: payload.domainHash,
        urlHash: payload.urlHash
      });
      // Mock transition to READY after latency
      setTimeout(() => {
        stateManager.transition(AppState.READY);
      }, 1500);
      break; 

    case MessageType.CONTROL_ACTION:
      handleControl(payload.action);
      break;
  }
  
  return true; // Keep channel open
});

function handleControl(action: string) {
  const playerTab = stateManager.getPlayerTabId();

  switch (action) {
    case 'OPEN_PLAYER':
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
      // Implement Next Logic
      break;
  }
}
