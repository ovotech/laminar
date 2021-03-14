import { IncomingMessage } from 'http';
import { URLSearchParams } from 'url';
import { parseQueryObjects } from '../../helpers';
import { HttpMiddleware } from '../types';
import { Readable } from 'stream';
import { toMultipartBoundary, MultipartParser, toMultipartData } from '../multipart-parser';
import { HttpError } from '../http-error';

export interface BodyParser {
  /**
   * The name of the parseer, for debugging purposes
   */
  name: string;
  /**
   * If returns true for a given content type, then this body parser will be used
   */
  match: RegExp | ((contentType: string) => boolean);
  /**
   * Process a raw incomming message into a concrete parsed response
   */
  parse: (body: IncomingMessage) => Promise<unknown>;
}

/**
 * Convert a stream of text data into a single string. If there were no chunks in the stream, return undefined
 */
export function concatStream(stream: Readable): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream
      .on('data', (chunk) => chunks.push(chunk))
      .on('end', () => resolve(chunks.length ? String(Buffer.concat(chunks)) : undefined))
      .on('error', reject);
  });
}

export const parseJson: BodyParser = {
  name: 'JsonBodyParser',
  match: /^application\/([^\+\;]+\+)?json(\;.*)?/,
  parse: async (incommingMessage) => {
    const buffer = await concatStream(incommingMessage);
    return buffer === undefined ? undefined : JSON.parse(buffer);
  },
};

export const parseForm: BodyParser = {
  name: 'FormUrlEncodedBodyParser',
  match: /^application\/x-www-form-urlencoded(\;.*)?/,
  parse: async (incommingMessage) =>
    parseQueryObjects(new URLSearchParams((await concatStream(incommingMessage)) ?? '')),
};

export const parseText: BodyParser = {
  name: 'PlainTextBodyParser',
  match: /^text\/.*/,
  parse: async (incommingMessage) => await concatStream(incommingMessage),
};

export const multipartFormData: BodyParser = {
  name: 'MultipartFormDataBodyParser',
  match: /^multipart\/form-data/,
  parse: async (incommingMessage) => {
    const contentType = incommingMessage.headers['content-type'];
    const boundary = toMultipartBoundary(contentType);
    if (!boundary) {
      throw new Error(`Missing boundary in Content-Type header: ${contentType}`);
    }
    const parser = new MultipartParser(boundary);
    return await toMultipartData(incommingMessage.pipe(parser));
  },
};

export const parseDefault: BodyParser = {
  name: 'DefaultParser',
  match: () => true,
  parse: async (incommingMessage) => await concatStream(incommingMessage),
};

export const defaultBodyParsers: BodyParser[] = [parseJson, parseForm, parseText, multipartFormData, parseDefault];

export async function parseBody(incommingMessage: IncomingMessage, parsers = defaultBodyParsers): Promise<unknown> {
  const parser = parsers.find((parser) => {
    const contentType = incommingMessage.headers['content-type'] || '';
    return parser.match instanceof RegExp ? parser.match.test(contentType) : parser.match(contentType);
  });

  return parser
    ? await parser.parse(incommingMessage).catch((error) => {
        throw new HttpError(400, {
          message: `Error Parsing Request Body: "${error.message}" with parser: ${parser.name}`,
        });
      })
    : incommingMessage;
}

/**
 * Parse the incommingMessage request into a javascript object
 *
 * Supports contentTypes by default for:
 *
 *  - json
 *  - url encoded
 *  - text content
 *
 * @param parsers replace with custom parsers, can use [...defaultBodyParsers, newParser] to add
 */
export function bodyParserMiddleware(parsers = defaultBodyParsers): HttpMiddleware {
  return (next) => async (req) => next({ ...req, body: await parseBody(req.incommingMessage, parsers) });
}
