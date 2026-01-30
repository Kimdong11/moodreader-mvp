import { VideoCandidate, YouTubeSearch } from './youtube_search';
import { selector } from './selector';
import { Logger } from '../common/logger';

export class NextPolicy {
  private candidates: VideoCandidate[] = [];
  private currentIndex = 0;
  private contextHash = '';
  private currentQuery = '';

  public setCandidates(candidates: VideoCandidate[], contextHash: string, query: string) {
    this.candidates = candidates;
    this.contextHash = contextHash;
    this.currentQuery = query;
    this.currentIndex = 0;
  }

  public async getNext(): Promise<VideoCandidate | null> {
    // Policy: reuse Top10 candidates up to 3 Next clicks; re-search on 4th.
    
    if (this.currentIndex >= 3) {
      Logger.log('NextPolicy: Exhausted 3 skips. Re-searching...');
      
      // Perform re-search with slight variation or same query?
      // MVP: Same query. Selector handles de-dup so we get fresh tracks
      const newCandidates = await YouTubeSearch.search(this.currentQuery);
      if (newCandidates.length > 0) {
        this.setCandidates(newCandidates, this.contextHash, this.currentQuery);
      } else {
        return null;
      }
    }
    
    if (this.candidates.length === 0) return null;

    // Select potentially filtering out already played
    const track = selector.select(this.candidates, this.contextHash);
    
    if (track) {
      selector.markPlayed(track.id);
      this.currentIndex++;
      
      // Remove from local candidates list so we don't pick it again immediately in logic (though selector handles)
      // Actually selector scores/filters independently.
      return track;
    }
    
    return null;
  }
}

export const nextPolicy = new NextPolicy();
