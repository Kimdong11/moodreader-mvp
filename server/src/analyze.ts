import { Request, Response } from 'express';
import { Logger } from './policy/logging';
import { LLMService } from './llm/service';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { result: any, exp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min
const ipLimit = new Map<string, number>();

function rateLimitExceeded(ip: string): boolean {
  // Simple session/ip based soft limit for demo
  const count = ipLimit.get(ip) || 0;
  ipLimit.set(ip, count + 1);
  return count > 50; 
}

export async function analyzeHandler(req: Request, res: Response) {
  try {
    const { textShort, domainHash, urlHash } = req.body;

    // Rate Limit
    const ip = req.ip || 'unknown';
    if (rateLimitExceeded(ip)) {
       Logger.warn('Rate limit exceeded', { ip });
       return res.status(429).json({ error: 'Too Many Requests' });
    }

    if (!textShort || textShort.length > 2500) { 
      return res.status(400).json({ error: 'Invalid input' });
    }

    const cacheKey = `${domainHash}:${urlHash}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.exp) {
      Logger.info('Cache hit', { domainHash });
      return res.json(cached.result);
    }

    // Call LLM
    const result = await Promise.race([
       LLMService.analyzeText(textShort),
       // eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-promise-reject-errors
       new Promise((_, reject) => setTimeout(() => reject('Timeout'), 3000))
    ]).catch(err => {
       Logger.error('LLM/Timeout Error', { err });
       return { mode: 'focus', tempo: 'medium', genres: ['lofi'] }; // Fallback
    });

    // Update Cache
    cache.set(cacheKey, { result, exp: Date.now() + CACHE_TTL });

    Logger.info('Analysis complete', { domainHash, result });

    res.json(result);
  } catch (e) {
    Logger.error('Handler error', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
