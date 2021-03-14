import { withStaticMetadata, RequestLogging, LoggerLike } from '../../';
import { HttpMiddleware } from '../types';

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const requestLoggingMiddleware = (source: LoggerLike): HttpMiddleware<RequestLogging> => (next) => async (
  req,
) => {
  const logger = req.headers['x-trace-token']
    ? withStaticMetadata(source, { traceToken: req.headers['x-trace-token'] })
    : source;

  try {
    const res = await next({ ...req, logger });
    if (res.status >= 200 && res.status < 300) {
      logger.info(`Status: ${res.status} [${req.method} ${req.url.pathname}]`);
    } else {
      logger.error(`Error: ${res.status}, [${req.method} ${req.url.pathname}]`, { body: res.body });
    }
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
