export interface LoggerMetadata {
  [key: string]: unknown;
}

export interface LoggerContext {
  logger: LoggerLike;
}

export interface LoggerLike {
  debug: (message: any, metadata?: LoggerMetadata) => void;
  info: (message: any, metadata?: LoggerMetadata) => void;
  warn: (message: any, metadata?: LoggerMetadata) => void;
  error: (message: any, metadata?: LoggerMetadata) => void;
}

export const withStaticMetadata = (logger: LoggerLike, staticMetadata: LoggerMetadata): LoggerLike => ({
  info(message, metadata) {
    logger.info(message, { ...metadata, ...staticMetadata });
  },

  error(message, metadata) {
    logger.error(message, { ...metadata, ...staticMetadata });
  },

  debug(message, metadata) {
    logger.debug(message, { ...metadata, ...staticMetadata });
  },

  warn(message, metadata) {
    logger.warn(message, { ...metadata, ...staticMetadata });
  },
});
