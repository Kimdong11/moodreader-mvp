import { Logger } from '../common/logger';

export interface VideoCandidate {
  id: string;
  title: string;
  duration?: string;
  views?: string;
}

const FALLBACK_TRACKS: VideoCandidate[] = [
  { id: 'jfKfPfyJRdk', title: 'Lofi Girl - lofi hip hop radio', duration: 'LIVE' },
  { id: '5yx6BWlEVcY', title: 'Chillhop Radio - jazzy & lofi hip hop beats', duration: 'LIVE' },
  { id: 'DWcJFNfaw9c', title: 'Lofi 24/7', duration: 'LIVE' },
  { id: 'tGhosth46TI', title: 'Relaxing Jazz', duration: '2:00:00' },
  { id: '7nos6lNMmys', title: 'Coffee Shop Ambience', duration: '8:00:00' }
];

export class YouTubeSearch {
  static async search(query: string): Promise<VideoCandidate[]> {
    Logger.log('Using Safe Mode (Fallback Tracks) for stability during MVP demo.');
    
    // In a real production app with API KEY, we would fetch here.
    // For MVP demonstration without API Quota issues or blocking, return curated list.
    
    // Shuffle the list slightly to simulate variety
    return [...FALLBACK_TRACKS].sort(() => Math.random() - 0.5);
  }
}
