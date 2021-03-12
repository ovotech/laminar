import { LoggerLike, RequestLogging } from '../logger';
import { Middleware } from '../types';

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const loggingMiddleware = (logger: LoggerLike): Middleware<RequestLogging> => (next) => (req) =>
  next({ ...req, logger });
