import { inspect } from 'util';

/**
 * An axios error for easier testing.
 */
export class AxiosError extends Error {
  public readonly code: number;
  public readonly body: { message: string; [key: string]: unknown };
  public readonly stack?: string;

  public constructor(code: number, body: { message: string; [key: string]: unknown }, stack?: string) {
    super(`HttpError ${code}\nBody: ${inspect(body, { depth: 10 })}\n`);
    this.code = code;
    this.body = body;
    this.stack = stack;
  }
}
