import { HttpMiddleware } from '../types';

export interface ResponseTimeConfig {
  header?: string;
}

export const defaultResponseTimeHeader = 'x-response-time';

/**
 * Track response time of a response
 *
 * @category middleware
 */
export const responseTimeMiddleware = ({
  header = defaultResponseTimeHeader,
}: ResponseTimeConfig = {}): HttpMiddleware => (next) => {
  return async (ctx) => {
    const startAt = process.hrtime();
    const result = await next(ctx);
    const diff = process.hrtime(startAt);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    return { ...result, headers: { ...result.headers, [header]: time.toFixed(3) } };
  };
};
