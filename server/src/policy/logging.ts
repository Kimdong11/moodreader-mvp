export class Logger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static info(msg: string, meta?: any) {
    console.log(JSON.stringify({ level: 'INFO', msg, ...Logger.scrub(meta) }));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static error(msg: string, meta?: any) {
    console.error(JSON.stringify({ level: 'ERROR', msg, ...Logger.scrub(meta) }));
  }

  // Remove potential PII/Content
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static scrub(meta?: any): any {
    if (!meta) return {};
    const safe = { ...meta };
    // Block list
    delete safe.text;
    delete safe.rawUrl;
    delete safe.cookies;
    delete safe.authorization;
    return safe;
  }
}
