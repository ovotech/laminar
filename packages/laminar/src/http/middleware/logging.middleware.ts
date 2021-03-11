import { LoggerLike, LoggerMetadata } from '../../logger';
import { HttpRequest, HttpResponse, HttpMiddleware } from '../types';

export interface RequestLogging<TLogger extends LoggerLike = LoggerLike> {
  logger: TLogger;
}

export interface LoggerFormatters {
  request: (req: HttpRequest) => LoggerMetadata;
  response: (req: HttpRequest, res: HttpResponse) => LoggerMetadata;
  error: (req: HttpRequest, error: Error) => LoggerMetadata;
}

export const requestUri = (req: HttpRequest): string => `${req.method} ${req.url.pathname}`;

/**
 * Logging middleware
 *
 * @param logger Logger instance, must implement `info` and `error`. You can use `console` to output to stdout
 * @category middleware
 */
export const loggingMiddleware = <TLogger extends LoggerLike>(
  logger: TLogger,
  { request, response, error }: Partial<LoggerFormatters> = {
    response: (req, res) => ({
      request: requestUri(req),
      status: res.status,
      contentType: res.headers['content-type'],
    }),
    request: (req) => ({
      request: requestUri(req),
      contentType: req.headers['content-type'],
    }),
    error: (req, error) => ({
      request: requestUri(req),
      message: error.message,
      stack: error.stack,
    }),
  },
): HttpMiddleware<RequestLogging<TLogger>> => (next) => async (req) => {
  try {
    if (request) {
      logger.info('Request', request(req));
    }
    const res = await next({ ...req, logger });
    if (response) {
      logger.info('Response', response(req, res));
    }

    return res;
  } catch (errorOrFailure) {
    const err = errorOrFailure instanceof Error ? errorOrFailure : new Error(errorOrFailure);
    if (error) {
      logger.error('Error', error(req, err));
    }
    throw err;
  }
};
