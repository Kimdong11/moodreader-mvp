import request from 'supertest';
import express from 'express';
import { analyzeHandler } from '../src/analyze';
import { LLMService } from '../src/llm/service';

const app = express();
app.use(express.json());
// eslint-disable-next-line @typescript-eslint/no-misused-promises
app.post('/v1/analyze', analyzeHandler);

// Mock LLM
jest.mock('../src/llm/service');

describe('Analyze Endpoint', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 for invalid input', async () => {
    const res = await request(app).post('/v1/analyze').send({});
    expect(res.status).toBe(400);
  });

  it('should return 200 and mood for valid input', async () => {
    (LLMService.analyzeText as jest.Mock).mockResolvedValue({ 
        tempo: 'slow', 
        genres: ['ambient'] 
    });
    
    const res = await request(app).post('/v1/analyze').send({
      textShort: 'Hello world context',
      domainHash: 'abc',
      urlHash: '123'
    });
    
    expect(res.status).toBe(200);
    expect(res.body.tempo).toBe('slow');
    expect(res.body.genres).toContain('ambient');
  });

  it('should handle LLM failure with fallback', async () => {
    (LLMService.analyzeText as jest.Mock).mockRejectedValue(new Error('API Fail'));
    
    const res = await request(app).post('/v1/analyze').send({
      textShort: 'Fail me',
      // Diff hash to avoid cache hit from previous test
      domainHash: 'abc-fail',
      urlHash: '123-fail'
    });
    
    // Fallback logic in handler returns 200 with default
    expect(res.status).toBe(200);
    expect(res.body.genres).toContain('lofi'); // Default fallback
  });
});
