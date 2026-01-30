import { AppState, TrackInfo } from './types';

export enum MessageType {
  // From Content
  ANALYZE_REQUEST = 'ANALYZE_REQUEST',
  CONTROL_ACTION = 'CONTROL_ACTION',
  GET_STATE = 'GET_STATE',

  // From Player
  PLAYER_HELLO = 'PLAYER_HELLO',
  PLAYER_STATE_CHANGE = 'PLAYER_STATE_CHANGE',

  // From Background (Broadcasts)
  STATE_UPDATED = 'STATE_UPDATED',
  
  // Internal/Specific
  CMD_PLAY = 'CMD_PLAY',
  CMD_PAUSE = 'CMD_PAUSE',
  CMD_LOAD = 'CMD_LOAD',
  CMD_SET_VOLUME = 'CMD_SET_VOLUME',
}

export interface MessageEnvelope {
  type: MessageType;
  payload?: any;
}

// Payloads
export interface AnalyzeRequestPayload {
  textShort: string; // Truncated text
  domainHash: string;
  urlHash: string;
  category?: string; // Optional category enum if detected
}

export interface ControlActionPayload {
  action: 'PLAY' | 'STOP' | 'NEXT' | 'QUIT' | 'OPEN_PLAYER';
}

export interface PlayerStatePayload {
  state: 'BUF' | 'PLAY' | 'PAUSE' | 'END' | 'ERR';
  currentTime?: number;
  trackId?: string;
  error?: string;
}

export interface StateUpdatePayload {
  state: AppState;
  track?: TrackInfo;
  currentTrackId?: string;
}
