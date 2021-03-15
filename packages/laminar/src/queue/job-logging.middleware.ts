import { withStaticMetadata, LoggerContext, LoggerLike } from '../logger';
import { WorkerMiddleware } from './types';

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const jobLoggingMiddleware = (source: LoggerLike): WorkerMiddleware<LoggerContext> => (next) => async (ctx) => {
  const logger = withStaticMetadata(source, {
    queue: ctx.name,
    jobId: ctx.id,
    ...(ctx.data.traceToken ? { traceToken: ctx.data.traceToken } : {}),
  });

  try {
    const res = await next({ ...ctx, logger });
    logger.info(`Queue Worker Success`);
    return res;
  } catch (errorOrFailure) {
    const error = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    logger.error(`Queue Worker Error: ${error.message}`, { stack: error.stack });
    throw error;
  }
};
