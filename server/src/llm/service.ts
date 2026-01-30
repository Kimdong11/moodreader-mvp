import { buildPrompt } from './prompt';
import { Logger } from '../policy/logging';

export class LLMService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async analyzeText(text: string): Promise<any> {
    const prompt = buildPrompt(text);
    Logger.info('Generated Prompt (internal)', { promptLength: prompt.length });
    
    // TODO: Call Antigravity/Opus API here.
    // const response = await fetch('https://api.anthropic.com/v1/messages', ...);
    
    // For MVP, we still simulate the response but we used the "Prompt 8" structure
    return LLMService.mockResponse(text);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static mockResponse(text: string): any {
    const lower = text.toLowerCase();
    
    if (lower.includes('tech') || lower.includes('code') || lower.includes('javascript')) {
      return { tempo: 'medium', genres: ['lofi', 'electronic'] };
    } 
    if (lower.includes('news') || lower.includes('politic')) {
      return { tempo: 'medium', genres: ['classical', 'minimalism'] };
    }
    if (lower.includes('fitness') || lower.includes('run')) {
      return { tempo: 'fast', genres: ['workout', 'pop'] };
    }
    
    return { tempo: 'slow', genres: ['ambient', 'piano'] };
  }
}
