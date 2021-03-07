import { OutgoingHttpHeaders } from 'http';

/**
 * A generic exception.
 *
 * When thrown, the default laminar error handler will convert it to a response object, using the code for status and headers and body appropriately.
 */
export class HttpError extends Error {
  public readonly code: number;
  public readonly body: { message: string; [key: string]: unknown };
  public readonly headers?: OutgoingHttpHeaders;
  public readonly stack?: string;

  public constructor(
    code: number,
    body: { message: string; [key: string]: unknown },
    headers?: OutgoingHttpHeaders,
    stack?: string,
  ) {
    super(body.message);
    this.code = code;
    this.body = body;
    this.headers = headers;
    this.stack = stack;
  }
}
