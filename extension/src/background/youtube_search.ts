import { Logger } from '../common/logger';

export interface VideoCandidate {
  id: string;
  title: string;
  duration?: string;
  views?: string;
}

export class YouTubeSearch {
  static async search(query: string): Promise<VideoCandidate[]> {
    const encoded = encodeURIComponent(query);
    const url = `https://www.youtube.com/results?search_query=${encoded}&sp=EgIQAQ%253D%253D`; // sp=EgIQAQ%3D%3D filters for Video only
    
    Logger.log('Fetching search results for:', query);

    try {
      const response = await fetch(url);
      const text = await response.text();
      const match = text.match(/ytInitialData\s*=\s*({.+?});/);
      
      if (!match || !match[1]) {
        Logger.warn('Failed to parse YouTube search results');
        return [];
      }

      const json = JSON.parse(match[1]);
      const videos = YouTubeSearch.extractVideos(json);
      return videos;
    } catch (e) {
      Logger.error('Search fetch failed', e);
      return [];
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static extractVideos(data: any): VideoCandidate[] {
    const candidates: VideoCandidate[] = [];
    
    // Deep traverse to find videoRenderer
    // Simplified path traversal with helper
    
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
    
    // Optimization: Target specific contents array to avoid traversing widely
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
    
    return candidates.slice(0, 15); // Return top 15
  }
}
