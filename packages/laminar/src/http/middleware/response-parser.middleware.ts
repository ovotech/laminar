/* eslint-disable @typescript-eslint/no-explicit-any */
import { URLSearchParams } from 'url';
import { Readable } from 'stream';
import { HttpMiddleware, HttpResponseBody, HttpResponse } from '../types';

/**
 * Convert a response body into a string / buffer / readable stream
 */
export interface ResponseParser {
  /**
   * If returns true for a given content type, this parser will be used
   */
  match: (contentType: string) => boolean;
  parse: (body: any) => HttpResponseBody;
}

const jsonResponseParserRegex = /^application\/([^\+\;]+\+)?json(\;.*)?/;

export const jsonResponseParser: ResponseParser = {
  match: (contentType) => jsonResponseParserRegex.test(contentType),
  parse: (body) => JSON.stringify(body),
};

export const formResponseParser: ResponseParser = {
  match: (contentType) => contentType === 'application/x-www-form-urlencoded',
  parse: (body) => new URLSearchParams(body).toString(),
};

export const defaultResponseParsers: ResponseParser[] = [jsonResponseParser, formResponseParser];

const toContentLength = (body: unknown): number | undefined =>
  body instanceof Buffer || typeof body === 'string' ? Buffer.byteLength(body) : undefined;

export const parseResponse = (res: HttpResponse, parsers = defaultResponseParsers): HttpResponse => {
  const contentType = res.headers['content-type'] as string | undefined;
  const parser = parsers.find((parser) => parser.match(contentType ?? ''));
  const body = parser
    ? parser.parse(res.body)
    : res.body instanceof Readable || res.body instanceof Buffer
    ? res.body
    : String(res.body);

  const contentLength = res.headers['content-length'] ?? toContentLength(body);

  return { ...res, body, headers: { ...res.headers, 'content-length': contentLength } };
};

/**
 * Parse the response body using the provided parsers.
 * By default support
 *
 *  - json
 *  - url encoded
 *
 * @param parsers
 *
 * @category component
 */
export const responseParserMiddleware = (parsers = defaultResponseParsers): HttpMiddleware => (next) => async (req) =>
  parseResponse(await next(req), parsers);
