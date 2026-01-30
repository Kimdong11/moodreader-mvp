export class Logger {
  static log(message: string, ...args: any[]) {
    // Basic wrapper, can be enhanced to filter sensitive data
    console.log(`[MoodReader] ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`[MoodReader] ERROR: ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.warn(`[MoodReader] WARN: ${message}`, ...args);
  }
}
