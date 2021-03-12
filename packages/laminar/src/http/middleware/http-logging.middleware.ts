import { LoggerLike, withStaticMetadata, RequestLogging } from '../../logger';
import { HttpMiddleware } from '../types';

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const httpLoggingMiddleware = (source: LoggerLike): HttpMiddleware<RequestLogging> => (next) => async (req) => {
  const logger = req.headers['x-trace-token']
    ? withStaticMetadata(source, { traceToken: req.headers['x-trace-token'] })
    : source;

  try {
    const res = await next({ ...req, logger });
    source.info(`Status: ${res.status} [${req.method} ${req.url.pathname}]`);
    return res;
  } catch (errorOrFailure) {
    const error = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    logger.error(`Error: ${error.message} [${req.method} ${req.url.pathname}]`, {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};
