import { VideoCandidate } from './youtube_search';

export interface ScoredCandidate extends VideoCandidate {
  score: number;
}

export class TrackSelector {
  private playedHistory: Map<string, number> = new Map(); // trackId -> timestamp
  private readonly DEDUP_WINDOW = 30 * 60 * 1000; // 30 mins

  public select(candidates: VideoCandidate[], contextHash: string): ScoredCandidate | null {
    // 1. Clean history
    this.cleanHistory();

    // 2. Score
    const scored = candidates.map(c => this.scoreCandidate(c));

    // 3. Filter (remove very low scores or bans)
    const valid = scored.filter(s => s.score > 0);
    
    // 4. Sort and Pick
    // weighted selection? For MVP just sort by score descending
    valid.sort((a, b) => b.score - a.score);
    
    // De-duplication check: Find first valid that is NOT recently played
    for (const cand of valid) {
       if (!this.isRecentlyPlayed(cand.id)) {
         // Note: we don't mark played here; NextPolicy does when definitely picked
         return cand; 
       }
    }

    // If all played recently, pick top one as fallback
    return valid[0] || null;
  }

  public markPlayed(trackId: string) {
    this.playedHistory.set(trackId, Date.now());
  }

  private isRecentlyPlayed(id: string): boolean {
    const time = this.playedHistory.get(id);
    if (!time) return false;
    return (Date.now() - time) < this.DEDUP_WINDOW;
  }

  private cleanHistory() {
    const now = Date.now();
    for (const [id, time] of this.playedHistory) {
      if (now - time > this.DEDUP_WINDOW) {
        this.playedHistory.delete(id);
      }
    }
  }

  private scoreCandidate(c: VideoCandidate): ScoredCandidate {
    let score = 100;
    const title = c.title.toLowerCase();

    // Penalties
    if (title.includes('offer') || title.includes('official video') || title.includes(' m/v')) score -= 20;
    if (title.includes('live') && !title.includes('lofi')) score -= 30; // Live performances often have noise
    if (title.includes('cover')) score -= 10;
    if (title.includes('reaction')) score -= 100; // Ban reactions
    if (title.includes('review')) score -= 100;
    if (title.includes('tutorial')) score -= 100;

    // Bonuses
    if (title.includes('1 hour') || title.includes('10 hour') || title.includes('mix')) score += 15;
    if (title.includes('playlist')) score += 10;
    if (title.includes('relax')) score += 5;
    if (title.includes('study')) score += 5;
    if (title.includes('focus')) score += 5;
    
    return { ...c, score };
  }
}

export const selector = new TrackSelector();
