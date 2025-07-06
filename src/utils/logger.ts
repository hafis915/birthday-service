/**
 * Simple logger utility for consistent logging
 */
export class Logger {
  private context: string;

  /**
   * Create a new logger instance
   * @param context - Context for the logger
   */
  constructor(context: string) {
    this.context = context;
  }

  /**
   * Log info message
   * @param message - Message to log
   * @param optionalParams - Optional parameters
   */
  info(message: string, ...optionalParams: any[]): void {
    console.log(
      `[${new Date().toISOString()}] [INFO] [${this.context}] ${message}`,
      ...optionalParams
    );
  }

  /**
   * Log error message
   * @param message - Message to log
   * @param optionalParams - Optional parameters
   */
  error(message: string, ...optionalParams: any[]): void {
    console.error(
      `[${new Date().toISOString()}] [ERROR] [${this.context}] ${message}`,
      ...optionalParams
    );
  }

  /**
   * Log warning message
   * @param message - Message to log
   * @param optionalParams - Optional parameters
   */
  warn(message: string, ...optionalParams: any[]): void {
    console.warn(
      `[${new Date().toISOString()}] [WARN] [${this.context}] ${message}`,
      ...optionalParams
    );
  }

  /**
   * Log debug message
   * @param message - Message to log
   * @param optionalParams - Optional parameters
   */
  debug(message: string, ...optionalParams: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[${new Date().toISOString()}] [DEBUG] [${this.context}] ${message}`,
        ...optionalParams
      );
    }
  }
}

export default Logger;
