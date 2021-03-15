import { withStaticMetadata, LoggerContext, LoggerLike } from '../../logger';
import { HttpMiddleware } from '../types';

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const requestLoggingMiddleware = (source: LoggerLike): HttpMiddleware<LoggerContext> => (next) => async (
  ctx,
) => {
  const logger = withStaticMetadata(source, {
    request: `${ctx.method} ${ctx.url.pathname}`,
    ...(ctx.headers['x-trace-token'] ? { traceToken: ctx.headers['x-trace-token'] } : {}),
  });

  try {
    const res = await next({ ...ctx, logger });
    if (res.status >= 200 && res.status < 300) {
      logger.info(`Status: ${res.status}`);
    } else {
      logger.error(`Error: ${res.status}`, { body: res.body });
    }
    return res;
  } catch (errorOrFailure) {
    const error = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    logger.error(`Error: ${error.message}`, { message: error.message, stack: error.stack });
    throw error;
  }
};
