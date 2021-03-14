/* eslint-disable @typescript-eslint/explicit-function-return-type */

import { lookup } from 'mime-types';
import { HttpResponse } from './types';
import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { createReadStream, statSync } from 'fs';
import { Json, parseRange, toJson } from '../helpers';
import { Stats } from 'fs';
import * as cookie from 'cookie';

/**
 * Set additional paramters for the cookie
 */
export interface SetCookie extends cookie.CookieSerializeOptions {
  value: string;
}

/**
 * Set cookie heders on the response
 *
 * @category component
 */
export const setCookie = (cookies: { [key: string]: string | SetCookie }, res: HttpResponse): HttpResponse => ({
  ...res,
  headers: {
    ...res.headers,
    'set-cookie': Object.entries(cookies).map(([name, content]) => {
      if (typeof content === 'string') {
        return cookie.serialize(name, content);
      } else {
        const { value, ...options } = content;
        return cookie.serialize(name, value, options);
      }
    }),
  },
});

/**
 * @category HttpResponse
 * @typeParam TResponseBody The type of the response body
 */
export function response<TResponseBody>({
  body,
  status = 200,
  headers = { 'content-type': 'application/json' },
}: Partial<HttpResponse<TResponseBody>> = {}) {
  return { body, status, headers };
}

/**
 * Create a response object that will redirect to a given location.
 * Sets the 'Location' header.
 *
 * @param location URL the location to redirect to, would be set as the "Location" header
 * @category HttpResponse
 */
export function redirect(
  location: string,
  { status = 302, headers, body = `Redirecting to ${location}` }: Partial<HttpResponse> = {},
): HttpResponse {
  return {
    body,
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', location, ...headers },
  };
}

/**
 * Options for {@link file}
 *
 * @category HttpResponse
 */
export interface FileOptions {
  /**
   * The raw incommingMessage from the request, would be used to get the Range headers
   */
  incommingMessage?: IncomingMessage;
  /**
   * A file stats object. If you've already made a `stat` call to the filesystem, you can reuse that data and spare that IO call, by providing the data directly.
   */
  stats?: Stats;
}

/**
 * Return a file response.
 * Setting the 'content-type', 'content-length', 'last-modified' headers based on the file itself.
 * Supports content ranges as well, if you pass the incommingMessage from the request, so it can determine the range.
 *
 * 'Content-Type' header is set by inspecting the file extention. If no match could be found, defaults to 'text/plain'.
 *
 * Would set the 'Last-Modified', 'Content-Type' and 'Content-Length' headers
 * If you provide `incommingMessage`, would set 'Last-Modified', 'Content-Type' and 'Accept-Ranges'. Also 'Content-Range' if there was a 'Range' header in the request
 *
 * @param filename a local path to the file.
 * @category HttpResponse
 */
export function file(filename: string): HttpResponse<string, 200>;
export function file(filename: string, options: Partial<HttpResponse> & FileOptions): HttpResponse;
export function file(
  filename: string,
  { headers, status = 200, incommingMessage, stats }: Partial<HttpResponse> & FileOptions = {},
): HttpResponse {
  const stat = stats ?? statSync(filename);
  const contentType = lookup(filename) || 'text/plain';
  const lastModified = stat.mtime.toISOString();
  const hasRange = incommingMessage?.headers.range?.match(/^bytes=/);

  if (hasRange) {
    const range = incommingMessage?.headers.range ? parseRange(incommingMessage.headers.range, stat.size) : undefined;

    if (range) {
      return {
        status: 206 as const,
        body: createReadStream(filename, range),
        headers: {
          'content-type': contentType,
          'accept-ranges': 'bytes',
          'last-modified': lastModified,
          'content-range': `bytes ${range.start}-${range.end}/${stat.size}`,
          ...headers,
        },
      };
    } else {
      return {
        status: 416 as const,
        headers: { 'accept-ranges': 'bytes', 'Content-Range': `bytes */${stat.size}` },
        body: '',
      };
    }
  } else {
    return {
      status,
      body: createReadStream(filename),
      headers: {
        ...(incommingMessage ? { 'accept-ranges': 'bytes' } : {}),
        'content-type': contentType,
        'content-length': stat.size,
        'last-modified': lastModified,
        ...headers,
      },
    };
  }
}

/**
 * Status
 * ===========================================================================================
 */

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `200`
 *
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function ok<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 200 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `204`
 *
 * The server successfully processed the request, and is not returning any content.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function noContent<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 204 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `301`
 *
 * This and all future requests should be directed to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function movedPermanently<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(
  res: TResponse,
) {
  return { ...res, status: 301 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `302`
 *
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function found<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 302 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `303`
 *
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function seeOther<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 303 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `304`
 *
 * Indicates that the resource has not been modified since the version specified by the request headers If-Modified-Since or If-None-Match.
 * In such case, there is no need to retransmit the resource since the client still has a previously-downloaded copy
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function notModified<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 304 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `400`
 *
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function badRequest<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 400 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `401`
 *
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function unauthorized<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 401 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `403`
 *
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function forbidden<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 403 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `404`
 *
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function notFound<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, status: 404 as const };
}

/**
 * A helper to set the status of a {@link HttpResponse} to a specific type literal constant.
 *
 * Status: `500`
 *
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function internalServerError<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(
  res: TResponse,
) {
  return { ...res, status: 500 as const };
}

/**
 * Type
 * ===========================================================================================
 *
 * @category HttpResponse
 */

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 * Deeply convert JS Date types to string and remove undefined values.
 *
 * Content-Type: `application/json`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function json<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return {
    ...res,
    body: toJson(res.body) as Json<TResponseBody>,
    headers: { ...res.headers, 'content-type': 'application/json' as const },
  };
}

/**
 * A HttpResponse creator helper, used for {@link optional}
 */
type ResponseCreator<TResponseBody, TStatus, THeaders> = (
  body: TResponseBody,
  headers?: OutgoingHttpHeaders,
) => { status: TStatus; body: TResponseBody; headers: THeaders };

/**
 * A helper to allow optional bodies to be chained with nullish coallesing
 * For example you can combine {@link jsonOk} and {@link jsonNotFound}
 *
 * ```typescript
 * const handler = () => {
 *   const value: MyType | undefined = ...
 *   return optional(jsonOk, value) ?? jsonNotFound({ message: 'Not Found' });
 * }
 * ```
 *
 * @typeParam TResponseBody Strictly type the response body, can be undefined too
 * @typeParam TStatus Strictly type the http status value
 * @typeParam THeaders Strictly type the http headers.
 *
 * @category HttpResponse
 */
export function optional<TResponseBody, TStatus, THeaders>(
  response: ResponseCreator<TResponseBody, TStatus, THeaders>,
  body: TResponseBody,
  headers?: OutgoingHttpHeaders,
): {
  status: TStatus;
  body: Exclude<TResponseBody, undefined>;
  headers: THeaders;
};
export function optional<TResponseBody, TStatus, THeaders>(
  response: ResponseCreator<TResponseBody, TStatus, THeaders>,
  body: undefined,
  headers?: OutgoingHttpHeaders,
): undefined;
export function optional<TResponseBody, TStatus, THeaders>(
  response: ResponseCreator<TResponseBody, TStatus, THeaders>,
  body: TResponseBody | undefined,
  headers: OutgoingHttpHeaders = {},
):
  | {
      status: TStatus;
      body: TResponseBody;
      headers: THeaders;
    }
  | undefined {
  return body !== undefined ? response(body, headers) : undefined;
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `application/yaml`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function yaml<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, headers: { ...res.headers, 'content-type': 'application/yaml' as const } };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `application/octet-stream`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function binary<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return {
    ...res,
    headers: { ...res.headers, 'content-type': 'application/octet-stream' as const },
  };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `application/pdf`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function pdf<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, headers: { ...res.headers, 'content-type': 'application/pdf' as const } };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `application/xml`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function xml<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, headers: { ...res.headers, 'content-type': 'application/xml' as const } };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `text/plain`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function text<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, headers: { ...res.headers, 'content-type': 'text/plain' as const } };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `text/html`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function html<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, headers: { ...res.headers, 'content-type': 'text/html' as const } };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `text/css`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function css<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, headers: { ...res.headers, 'content-type': 'text/css' as const } };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `text/csv`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function csv<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return { ...res, headers: { ...res.headers, 'content-type': 'text/csv' as const } };
}

/**
 * A helper to set the `Content-Type` header of a {@link HttpResponse} to a specific type literal constant.
 *
 * Content-Type: `application/x-www-form-urlencoded`
 *
 * @typeParam TResponseBody Strictly type the response body
 * @typeParam TResponse A generic response, allowing us to preserve the types passed from previous helpers
 *
 * @category HttpResponse
 */
export function form<TResponseBody, TResponse extends Partial<HttpResponse<TResponseBody>>>(res: TResponse) {
  return {
    ...res,
    headers: { ...res.headers, 'content-type': 'application/x-www-form-urlencoded' as const },
  };
}

/**
 * JSON
 * ===========================================================================================
 */

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link json} and {@link ok}
 * Deeply convert JS Date types to string and remove undefined values.
 *
 * Content-Type: `application/json`
 * Status: `200`
 *
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonOk<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 200;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(ok({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link json} and {@link noContent}
 * No body is specified as this response should not have any content
 *
 * Content-Type: `application/json`
 * Status: `204`
 *
 * The server successfully processed the request, and is not returning any content.
 *
 * @category HttpResponse
 */
export function jsonNoContent(
  headers: OutgoingHttpHeaders = {},
): {
  status: 204;
  body: undefined;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(noContent({ body: undefined, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * Deeply convert JS Date types to string and remove undefined values.
 * A combination of {@link json} and {@link movedPermanently}
 *
 * Content-Type: `application/json`
 * Status: `301`
 *
 * This and all future requests should be directed to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonMovedPermanently<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 301;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(movedPermanently({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * Deeply convert JS Date types to string and remove undefined values.
 * A combination of {@link json} and {@link found}
 *
 * Content-Type: `application/json`
 * Status: `302`
 *
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonFound<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 302;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(found({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link json} and {@link seeOther}
 *
 * Content-Type: `application/json`
 * Status: `303`
 *
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonSeeOther<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 303;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(seeOther({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * Deeply convert JS Date types to string and remove undefined values.
 * A combination of {@link json} and {@link badRequest}
 *
 * Content-Type: `application/json`
 * Status: `400`
 *
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonBadRequest<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 400;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(badRequest({ body, headers }));
}
/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * Deeply convert JS Date types to string and remove undefined values.
 * A combination of {@link json} and {@link unauthorized}
 *
 * Content-Type: `application/json`
 * Status: `401`
 *
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonUnauthorized<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 401;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(unauthorized({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * Deeply convert JS Date types to string and remove undefined values.
 * A combination of {@link json} and {@link forbidden}
 *
 * Content-Type: `application/json`
 * Status: `403`
 *
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonForbidden<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 403;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(forbidden({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * Deeply convert JS Date types to string and remove undefined values.
 * A combination of {@link json} and {@link notFound}
 *
 * Content-Type: `application/json`
 * Status: `404`
 *
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonNotFound<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 404;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(notFound({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * Deeply convert JS Date types to string and remove undefined values.
 * A combination of {@link json} and {@link internalServerError}
 *
 * Content-Type: `application/json`
 * Status: `500`
 *
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function jsonInternalServerError<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 500;
  body: Json<TResponseBody>;
  headers: { 'content-type': 'application/json' } & OutgoingHttpHeaders;
} {
  return json(internalServerError({ body, headers }));
}

/**
 * Text
 * ===========================================================================================
 */

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link ok}
 *
 * Content-Type: `text/plain`
 * Status: `200`
 *
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textOk<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 200;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(ok({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link noContent}
 * No body is specified as this response should not have any content
 *
 * Content-Type: `text/plain`
 * Status: `204`
 *
 * The server successfully processed the request, and is not returning any content.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textNoContent(
  headers: OutgoingHttpHeaders = {},
): {
  status: 204;
  body: undefined;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(noContent({ body: undefined, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link movedPermanently}
 *
 * Content-Type: `text/plain`
 * Status: `301`
 *
 * This and all future requests should be directed to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textMovedPermanently<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 301;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(movedPermanently({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link found}
 *
 * Content-Type: `text/plain`
 * Status: `302`
 *
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textFound<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 302;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(found({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link seeOther}
 *
 * Content-Type: `text/plain`
 * Status: `303`
 *
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textSeeOther<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 303;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(seeOther({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link badRequest}
 *
 * Content-Type: `text/plain`
 * Status: `400`
 *
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textBadRequest<TResponseBody>(body: TResponseBody, headers: OutgoingHttpHeaders = {}) {
  return text(badRequest({ body, headers }));
}
/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link unauthorized}
 *
 * Content-Type: `text/plain`
 * Status: `401`
 *
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textUnauthorized<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 401;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(unauthorized({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link forbidden}
 *
 * Content-Type: `text/plain`
 * Status: `403`
 *
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textForbidden<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 403;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(forbidden({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link notFound}
 *
 * Content-Type: `text/plain`
 * Status: `404`
 *
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textNotFound<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 404;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(notFound({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link text} and {@link internalServerError}
 *
 * Content-Type: `text/plain`
 * Status: `500`
 *
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function textInternalServerError<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 500;
  body: TResponseBody;
  headers: { 'content-type': 'text/plain' } & OutgoingHttpHeaders;
} {
  return text(internalServerError({ body, headers }));
}

/**
 * Html
 * ===========================================================================================
 */

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link ok}
 *
 * Content-Type: `text/html`
 * Status: `200`
 *
 * Standard response for successful HTTP requests.
 * The actual response will depend on the request method used. In a GET request, the response will contain an entity corresponding to the requested resource. In a POST request, the response will contain an entity describing or containing the result of the action.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlOk<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 200;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(ok({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link noContent}
 * No body is specified as this response should not have any content
 *
 * Content-Type: `text/html`
 * Status: `204`
 *
 * The server successfully processed the request, and is not returning any content.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlNoContent(
  headers: OutgoingHttpHeaders = {},
): {
  status: 204;
  body: undefined;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(noContent({ body: undefined, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link movedPermanently}
 *
 * Content-Type: `text/html`
 * Status: `301`
 *
 * This and all future requests should be directed to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlMovedPermanently<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 301;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(movedPermanently({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link found}
 *
 * Content-Type: `text/html`
 * Status: `302`
 *
 * Tells the client to look at (browse to) another URL. 302 has been superseded by 303 and 307.
 * This is an example of industry practice contradicting the standard.
 * The HTTP/1.0 specification (RFC 1945) required the client to perform a temporary redirect (the original describing phrase was "Moved Temporarily"),
 * but popular browsers implemented 302 with the functionality of a 303 See Other.
 * Therefore, HTTP/1.1 added status codes 303 and 307 to distinguish between the two behaviours.
 * However, some Web applications and frameworks use the 302 status code as if it were the 303.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlFound<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 302;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(found({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link seeOther}
 *
 * Content-Type: `text/html`
 * Status: `303`
 *
 * The response to the request can be found under another URI using the GET method.
 * When received in response to a POST (or PUT/DELETE), the client should presume that the server has received the data and should issue a new GET request to the given URI.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlSeeOther<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 303;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(seeOther({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link badRequest}
 *
 * Content-Type: `text/html`
 * Status: `400`
 *
 * The server cannot or will not process the request due to an apparent client error (e.g., malformed request syntax, size too large, invalid request message framing, or deceptive request routing).
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlBadRequest<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 400;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(badRequest({ body, headers }));
}
/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link unauthorized}
 *
 * Content-Type: `text/html`
 * Status: `401`
 *
 * Similar to 403 Forbidden, but specifically for use when authentication is required and has failed or has not yet been provided.
 * The response must include a WWW-Authenticate header field containing a challenge applicable to the requested resource.
 * See Basic access authentication and Digest access authentication.
 * 401 semantically means "unauthorised", the user does not have valid authentication credentials for the target resource.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlUnauthorized<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 401;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(unauthorized({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link forbidden}
 *
 * Content-Type: `text/html`
 * Status: `403`
 *
 * The request contained valid data and was understood by the server, but the server is refusing action.
 * This may be due to the user not having the necessary permissions for a resource or needing an account of some sort, or attempting a prohibited action (e.g. creating a duplicate record where only one is allowed).
 * This code is also typically used if the request provided authentication by answering the WWW-Authenticate header field challenge, but the server did not accept that authentication.
 * The request should not be repeated.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlForbidden<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 403;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(forbidden({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link notFound}
 *
 * Content-Type: `text/html`
 * Status: `404`
 *
 * The requested resource could not be found but may be available in the future.
 * Subsequent requests by the client are permissible.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlNotFound<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 404;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(notFound({ body, headers }));
}

/**
 * A helper to create a {@link HttpResponse} object with specific type literal constants for Status and Content-Type Header.
 * A combination of {@link html} and {@link internalServerError}
 *
 * Content-Type: `text/html`
 * Status: `500`
 *
 * A generic error message, given when an unexpected condition was encountered and no more specific message is suitable.
 *
 * @typeParam TResponseBody Strictly type the response body
 *
 * @category HttpResponse
 */
export function htmlInternalServerError<TResponseBody>(
  body: TResponseBody,
  headers: OutgoingHttpHeaders = {},
): {
  status: 500;
  body: TResponseBody;
  headers: { 'content-type': 'text/html' } & OutgoingHttpHeaders;
} {
  return html(internalServerError({ body, headers }));
}
