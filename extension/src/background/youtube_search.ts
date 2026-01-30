import { Logger } from '../common/logger';

export interface VideoCandidate {
  id: string;
  title: string;
  duration?: string;
  views?: string;
}

const FALLBACK_TRACKS: VideoCandidate[] = [
  // Using confirmed stable non-live videos for reliability
  { id: 'TURbeWK2wwg', title: 'Relaxing Jazz Piano Music', duration: '3:00:00' },
  { id: 'lTRiuFIWV54', title: 'Slow Jazz - Cafe Music BGM', duration: '4:00:00' },
  { id: 'wmdy93uK3bw', title: 'Classical Music for Reading - Mozart, Chopin, Debussy', duration: '2:00:00' },
  { id: 'njXeLp7f4X4', title: 'Rain Sounds for Sleep & Relaxation', duration: '10:00:00' },
  { id: 'mPZkdNFkNps', title: 'Heavy Rain in Tokyo - Ambience', duration: '8:00:00' }
];

export class YouTubeSearch {
  static async search(query: string): Promise<VideoCandidate[]> {
    Logger.log('Using Safe Mode (Stable Videos) for reliable demo playback.');
    
    // In a real production app with API KEY, we would fetch here.
    // For MVP demonstration, return curated static list.
    
    // Shuffle the list slightly to simulate variety
    return [...FALLBACK_TRACKS].sort(() => Math.random() - 0.5);
  }
}
