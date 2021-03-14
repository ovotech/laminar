import { Readable, Transform, TransformCallback } from 'stream';

export interface MultipartItem {
  data: Buffer;
  filename?: string;
  name: string;
  type?: string;
}

export interface MultipartData {
  [key: string]: MultipartItem[] | string;
}

export function toMultipartBoundary(contentType: string | undefined): string | undefined {
  return contentType?.split('; boundary=')?.[1];
}

/**
 * Converts a stream generated from multipart parser into a MultipartData object.
 *
 * @param stream from {@link MultipartParser }
 */
export function toMultipartData(stream: Readable): Promise<MultipartData> {
  return new Promise((resolve, reject) => {
    let res: MultipartData = {};
    stream
      .on('data', (data: Array<MultipartItem>) => {
        for (const item of data) {
          const prev = res[item.name];
          res[item.name] = item.type ? [...((prev ?? []) as MultipartItem[]), item] : item.data.toString();
        }
      })
      .on('end', () => resolve(res))
      .on('error', reject);
  });
}

enum State {
  /**
   * Initial state, active while we've not found the first boundary
   */
  Start,
  /**
   * The http headers of the form data part, would terminate on a double new line
   */
  Headers,
  /**
   * The body of the form data. This can contain new lines and other binary info. Will stop only at boundary.
   */
  Body,
}

/**
 * Convert header lines into key: value object
 * Content-Type: text/plain -> { 'content-type': 'text/plain' }
 *
 * @param headerLines
 */
function toHeaders(headerLines: string[]): Record<string, string> {
  return headerLines
    .map((header) => header.split(':', 2))
    .reduce((acc, [name, value]) => ({ ...acc, [name.toLowerCase()]: value?.trim() }), {});
}

/**
 * Convert content disposition to its params
 * form-data; name="test"; filename="test.html" -> { name: 'test', filename: 'test.html' }
 *
 * @param contentDisposition the value of the content-disposition header
 */
function toContentDispositionParams(contentDisposition?: string): Record<string, string> | undefined {
  return contentDisposition
    ?.split('; ')
    .slice(1)
    .map((item) => item?.split('='))
    .reduce((acc, [name, value]) => ({ ...acc, [name]: value?.split('"')?.[1] }), {});
}

/**
 * Check if a buffer ends with a given template buffer, at a specific position
 */
function endsWith(end: Buffer, index: number, buffer: Buffer): boolean {
  return buffer.slice(index - end.length, index).equals(end);
}

const newLine = Buffer.from('\r\n');
const newLineDouble = Buffer.from('\r\n\r\n');

export class MultipartParser extends Transform {
  private headers = '';
  private state: State = State.Start;
  private boundary: Buffer;
  private index = 0;
  private remainingChunk: Buffer | undefined;

  /**
   * Retrieve the boundary using {@link toMultipartBoundary }
   *
   * @param boundary Boundary string, retrieved from content-type
   */
  constructor(boundary: string) {
    super({ readableObjectMode: true });
    this.boundary = Buffer.from(`--${boundary}`);
  }

  /**
   * Parse header lines.
   * Headers are guaranteed to have "content-disposition", and optionally content-type
   *
   * @param headers Header lines
   */
  private parseHeaders(headersText: string): Omit<MultipartItem, 'data'> {
    const headers = toHeaders(headersText.split('\n'));
    const params = toContentDispositionParams(headers['content-disposition']);

    return { name: params?.name ?? '', filename: params?.filename, type: headers['content-type'] };
  }

  /**
   * Transform incomming chunks into MultipartItem[].
   *
   * We are either parsing http header, that are new line terminated, or the body, which is terminated by the boundary string.
   * That's why we need to keep track which state we're currently in.
   *
   * Depending on the state, for each index in the buffer we check for the termination string, and if matches, save eithere the header or the body.
   *
   * All operations are performed with buffer.slice, which does not allocate new memory for the objects.
   */
  _transform(chunk: Buffer, encoding: BufferEncoding, done: TransformCallback) {
    const multipartItems: MultipartItem[] = [];
    const buffer = this.remainingChunk ? Buffer.concat([this.remainingChunk, chunk]) : chunk;

    for (let index = 0; index < buffer.length; index++) {
      switch (this.state) {
        case State.Start:
          if (endsWith(this.boundary, index, buffer)) {
            this.state = State.Headers;
            this.index = index + newLine.length;
          }
          break;

        case State.Headers:
          if (endsWith(newLineDouble, index, buffer)) {
            this.headers = buffer.slice(this.index, index - newLineDouble.length).toString();
            this.state = State.Body;
            this.index = index;
          }
          break;

        case State.Body:
          if (endsWith(this.boundary, index, buffer)) {
            multipartItems.push({
              ...this.parseHeaders(this.headers),
              data: buffer.slice(this.index, index - this.boundary.length - newLine.length),
            });

            this.headers = '';
            this.index = index + newLine.length;
            this.state = State.Headers;
          }
          break;
      }
    }
    this.remainingChunk = chunk.slice(this.index);
    this.index = 0;

    done(undefined, multipartItems);
  }
}
