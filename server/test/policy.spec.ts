import { Logger } from '../src/policy/logging';

describe('Logging Policy', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('should scrub sensitive text', () => {
    const sensitive = { text: 'secret', user: 'kdh' };
    Logger.info('test', sensitive);

    const call = logSpy.mock.calls[0][0];
    const json = JSON.parse(call);
    
    expect(json.user).toBe('kdh');
    expect(json.text).toBeUndefined();
  });
});
