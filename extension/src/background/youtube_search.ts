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
  { id: 'tGhosth46TI', title: 'Relaxing Jazz', duration: '2:00:00' }
];

export class YouTubeSearch {
  static async search(query: string): Promise<VideoCandidate[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encoded}&sp=EgIQAQ%253D%253D`; // Video Only
    
    Logger.log('Fetching search results for:', query);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Fetch status: ${response.status}`);
      
      const text = await response.text();
      const match = text.match(/ytInitialData\s*=\s*({.+?});/);
      
      if (!match || !match[1]) {
        throw new Error('Failed to parse ytInitialData');
      }

      const json = JSON.parse(match[1]);
      const videos = YouTubeSearch.extractVideos(json);
      
      if (videos.length === 0) {
        throw new Error('No videos found in parsed data');
      }
      
      return videos;
    } catch (e) {
      Logger.warn('YouTube Search failed/blocked. Using Fallback tracks.', e);
      // Return Fallback to ensure playback works
      return FALLBACK_TRACKS;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractVideos(data: any): VideoCandidate[] {
    const candidates: VideoCandidate[] = [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findRenderers = (obj: any) => {
       if (!obj) return;
       if (obj.videoRenderer) {
         const v = obj.videoRenderer;
         const id = v.videoId;
         const title = v.title?.runs?.[0]?.text || v.title?.simpleText || '';
         const duration = v.lengthText?.simpleText || '';
         const views = v.viewCountText?.simpleText || '';
         
         if (id && title) {
           candidates.push({ id, title, duration, views });
         }
       }
       
       if (Array.isArray(obj)) {
         obj.forEach(findRenderers);
       } else if (typeof obj === 'object') {
         Object.values(obj).forEach(findRenderers);
       }
    };
    
    try {
       const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
       if (contents) {
         findRenderers(contents);
       } else {
         findRenderers(data); // Fallback
       }
    } catch (e) {
       findRenderers(data);
    }
    
    return candidates.slice(0, 15);
  }
}
