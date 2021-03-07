import { HttpMiddleware } from '../types';
import { HttpError } from '../http-error';

export interface CorsConfig {
  allowOrigin?: string[] | string | RegExp | OriginChecker | true;
  allowHeaders?: string[];
  allowCredentials?: true;
  allowMethods?: string[];
  exposeHeaders?: string[];
  maxAge?: number;
  fallbackAllowOrigin?: string;
}
type OriginChecker = (requestOrigin: string) => boolean;

const toAllowOrigin = (
  origin: CorsConfig['allowOrigin'],
  originHeader: string | string[] | undefined,
  fallbackAllowOrigin: string,
): string => {
  if (origin === true || origin === undefined) {
    return '*';
  } else if (typeof origin === 'string') {
    return origin;
  } else {
    const requestOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

    if (requestOrigin) {
      if (Array.isArray(origin)) {
        return (
          origin.find((item) => item === requestOrigin) ?? `Error, ${requestOrigin} was not one of ${origin.join(', ')}`
        );
      } else if (origin instanceof RegExp) {
        return origin.test(requestOrigin) ? requestOrigin : `Error, ${requestOrigin} did not match ${String(origin)}`;
      } else if (origin instanceof Function) {
        return origin(requestOrigin) ? requestOrigin : `Error, ${requestOrigin} did not match cors function`;
      }
    }
  }

  return fallbackAllowOrigin;
};

const toAllowHeaders = (
  headers: CorsConfig['allowHeaders'],
  requestHeaders: string | string[] | undefined,
): string | undefined => {
  const allowed = headers || requestHeaders;
  return Array.isArray(allowed) ? allowed.join(',') : allowed;
};

const toMaxAge = (maxAge: CorsConfig['maxAge']): string | undefined => (maxAge ? maxAge.toString() : undefined);

const toExposeHeaders = (headers: CorsConfig['exposeHeaders']): string | undefined =>
  Array.isArray(headers) ? headers.join(',') : headers;

const toAllowMethods = (methods: CorsConfig['allowMethods']): string =>
  (methods || ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE']).join(',');

const toAllowCredentials = (credentials: CorsConfig['allowCredentials']): 'true' | undefined =>
  credentials ? 'true' : undefined;

/**
 * Cors middleware
 *
 * @category middleware
 */
export const corsMiddleware = ({
  fallbackAllowOrigin = 'Error matching origin header, none found',
  allowOrigin,
  allowHeaders,
  exposeHeaders,
  allowMethods,
  maxAge,
  allowCredentials,
}: CorsConfig = {}): HttpMiddleware => {
  const accessControlExposeHeaders = toExposeHeaders(exposeHeaders);
  const accessControlAllowMethods = toAllowMethods(allowMethods);
  const accessControlMaxAge = toMaxAge(maxAge);
  const accessControlAllowCredentials = toAllowCredentials(allowCredentials);
  const initialHeaders = {
    ...(accessControlAllowCredentials
      ? { 'Access-Control-Allow-Credentials': accessControlAllowCredentials }
      : undefined),
    ...(accessControlExposeHeaders ? { 'Access-Control-Expose-Headers': accessControlExposeHeaders } : undefined),
  };
  const optionsHeaders = {
    ...(accessControlAllowMethods ? { 'Access-Control-Allow-Methods': accessControlAllowMethods } : undefined),
    ...(accessControlMaxAge ? { 'Access-Control-Max-Age': accessControlMaxAge } : undefined),
  };

  return (next) => {
    return async (req) => {
      const headers = {
        'Access-Control-Allow-Origin': toAllowOrigin(allowOrigin, req.headers.origin, fallbackAllowOrigin),
        ...initialHeaders,
      };

      if (req.method === 'OPTIONS') {
        return {
          body: '',
          headers: {
            ...headers,
            ...optionsHeaders,
            'content-type': '',
            'Access-Control-Allow-Headers': toAllowHeaders(allowHeaders, req.headers['access-control-request-headers']),
          },
          status: 204,
        };
      } else {
        try {
          const response = await next(req);
          return { ...response, headers: { ...response.headers, ...headers } };
        } catch (error) {
          if (error instanceof HttpError) {
            throw new HttpError(error.code, error.body, { ...error.headers, ...headers }, error.stack);
          } else {
            throw new HttpError(500, { message: error.message }, headers, error.stack);
          }
        }
      }
    };
  };
};
