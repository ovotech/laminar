import { IncomingMessage } from 'http';
import { URLSearchParams } from 'url';
import { parseQueryObjects } from '../../helpers';
import { HttpMiddleware } from '../types';
import { Readable } from 'stream';

export interface BodyParser {
  /**
   * If returns true for a given content type, then this body parser will be used
   */
  match: (contentType: string) => boolean;
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

const parseJsonRegExp = /^application\/([^\+\;]+\+)?json(\;.*)?/;
const parseFormRegExp = /^application\/x-www-form-urlencoded(\;.*)?/;

export const parseJson: BodyParser = {
  match: (contentType) => parseJsonRegExp.test(contentType),
  parse: async (incommingMessage) => {
    const buffer = await concatStream(incommingMessage);
    return buffer === undefined ? undefined : JSON.parse(buffer);
  },
};

export const parseForm: BodyParser = {
  match: (contentType) => parseFormRegExp.test(contentType),
  parse: async (incommingMessage) =>
    parseQueryObjects(new URLSearchParams((await concatStream(incommingMessage)) ?? '')),
};

const parseTextRegx = /^text\/.*/;

export const parseText: BodyParser = {
  match: (contentType) => parseTextRegx.test(contentType),
  parse: async (incommingMessage) => await concatStream(incommingMessage),
};

export const parseDefault: BodyParser = {
  match: () => true,
  parse: async (incommingMessage) => await concatStream(incommingMessage),
};

export const defaultBodyParsers: BodyParser[] = [parseJson, parseForm, parseText, parseDefault];

export async function parseBody(incommingMessage: IncomingMessage, parsers = defaultBodyParsers): Promise<unknown> {
  const parser = parsers.find((parser) => parser.match(incommingMessage.headers['content-type'] || ''));

  return parser ? await parser.parse(incommingMessage) : incommingMessage;
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
