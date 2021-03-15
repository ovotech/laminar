import { LoggerLike, LoggerContext } from './types';
import { Middleware } from '../types';

/**
 * Logger middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const loggerMiddleware = (logger: LoggerLike): Middleware<LoggerContext> => (next) => (req) =>
  next({ ...req, logger });
