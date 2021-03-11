export interface LoggerMetadata {
  [key: string]: unknown;
}

export interface LoggerLike {
  log: (level: string, message?: unknown, metadata?: LoggerMetadata) => void;
  info: (message: unknown, metadata?: LoggerMetadata) => void;
  error: (message: unknown, metadata?: LoggerMetadata) => void;
  debug: (message: unknown, metadata?: LoggerMetadata) => void;
  warn: (message: unknown, metadata?: LoggerMetadata) => void;
}

export class LoggerWithMetadata implements LoggerLike {
  constructor(public readonly source: LoggerLike, public readonly staticMetadata: LoggerMetadata) {}

  log(level: string, message?: unknown, metadata?: LoggerMetadata): void {
    this.source.log(level, message, { ...metadata, ...this.staticMetadata });
  }

  info(message: unknown, metadata?: LoggerMetadata): void {
    this.source.info(message, { ...metadata, ...this.staticMetadata });
  }

  error(message: unknown, metadata?: LoggerMetadata): void {
    this.source.error(message, { ...metadata, ...this.staticMetadata });
  }

  debug(message: unknown, metadata?: LoggerMetadata): void {
    this.source.debug(message, { ...metadata, ...this.staticMetadata });
  }

  warn(message: unknown, metadata?: LoggerMetadata): void {
    this.source.warn(message, { ...metadata, ...this.staticMetadata });
  }
}
