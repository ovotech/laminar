import { toHttpRequest } from './request';
import { HttpListener, IncommingMessageResolver } from './types';
import { errorsMiddleware, HttpErrorHandler } from './middleware/errors.middleware';
import { responseParserMiddleware, ResponseParser } from './middleware/response-parser.middleware';
import { bodyParserMiddleware, BodyParser } from './middleware/body-parser.middleware';
import * as http from 'http';
import * as https from 'https';
import { toArray } from '../helpers';
import { Readable } from 'stream';
import { Service } from '../types';

/**
 * Options supplied when creating the laminar application with {@link httpServer} (or {@link httpsServer}).
 * Would be passed down to the appropriate components.
 */
export interface IncommingMessageResolverParams {
  /**
   * Convert a response body into a string / buffer / readable stream
   *
   * Default parsers:
   *
   *  - json
   *  - url encoded
   *
   * Each parser would be checked in turn, calling the match function with contentType as argument
   * If it returns true, would call the parse function on it
   *
   * If no parser is matched, would call String() on the response body
   */
  responseParsers?: ResponseParser[];

  /**
   * Parse incomming request body
   *
   * Default parsers:
   *
   *  - json
   *  - url encoded
   *  - text
   */
  bodyParsers?: BodyParser[];

  /**
   * Global error handler
   */
  errorHandler?: HttpErrorHandler;

  listener: HttpListener;
}

/**
 * Combine all the components into a single middleware, and allow passing options to individual component
 */
export function toIncommingMessageResolver({
  responseParsers,
  bodyParsers,
  errorHandler,
  listener,
}: IncommingMessageResolverParams): IncommingMessageResolver {
  const parseBody = bodyParserMiddleware(bodyParsers);
  const parseResponse = responseParserMiddleware(responseParsers);
  const handleErrors = errorsMiddleware(errorHandler);
  const resolver = parseResponse(handleErrors(parseBody(listener)));

  return async function (incommingMessage) {
    return resolver(toHttpRequest(incommingMessage));
  };
}

/**
 * Creeate a request listner to be used for [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
 *
 * A {@link HttpResolver} would convert an incomingRequest to a {@link HttpResponse} object.
 * This function would also use the parameters of the {@link HttpResponse} to set the statusCode, headers and body in the Request Listener
 * Multiple headers are supported. If the response body is a [Readable Stream](https://nodejs.org/api/stream.html#stream_readable_streams) it would stream it as a response directly
 */
export function toRequestListener(resolver: IncommingMessageResolver): http.RequestListener {
  return async function (incommingMessage, serverResponse) {
    const response = await resolver(incommingMessage);

    for (const [headerName, headerValue] of Object.entries(response.headers)) {
      const values = toArray(headerValue).map((item) => String(item));
      if (values.length) {
        serverResponse.setHeader(headerName.toLowerCase(), values);
      }
    }

    serverResponse.statusCode = response.status;

    response.body instanceof Readable ? response.body.pipe(serverResponse) : serverResponse.end(response.body);
  };
}

export interface HttpParams {
  /**
   * Node http server timeout setting, set using setTimeout()
   *
   * https://nodejs.org/api/http.html#http_server_settimeout_msecs_callback
   */
  timeout?: number;

  /**
   * Port number, defaults to 3300
   */
  port?: number;

  /**
   * Hostname, defaults to localhost
   */
  hostname?: string;
}

export interface HttpServiceParams extends IncommingMessageResolverParams, HttpParams {
  /**
   * Options passed directly to [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
   */
  http?: http.ServerOptions;
}

export interface HttpsServiceParams extends IncommingMessageResolverParams, HttpParams {
  /**
   * Options passed directly to [https.createServer](https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener)
   */
  https: https.ServerOptions;
}

export class HttpService implements Service {
  public port: number;
  public hostname: string;
  public server: https.Server | http.Server;

  constructor(public params: HttpServiceParams | HttpsServiceParams) {
    this.port = params.port ?? (process.env.LAMINAR_HTTP_PORT ? Number(process.env.LAMINAR_HTTP_PORT) : 3300);
    this.hostname = process.env.LAMINAR_HTTP_HOST ?? 'localhost';

    const requestListener = toRequestListener(toIncommingMessageResolver(params));

    this.server =
      'https' in params
        ? https.createServer(params.https, requestListener)
        : http.createServer(params.http ?? {}, requestListener);

    if (params.timeout !== undefined) {
      this.server.setTimeout(params.timeout);
    }
  }

  start(): Promise<this> {
    return new Promise((resolve) => this.server.listen(this.port, this.hostname, () => resolve(this)));
  }

  stop(): Promise<this> {
    return new Promise((resolve, reject) => this.server.close((err) => (err ? reject(err) : resolve(this))));
  }

  url(): string {
    return `${'https' in this.params ? 'https' : 'http'}://${this.hostname}:${this.port}`;
  }

  describe(): string {
    return `⛲ Laminar: ${this.url() ?? '-'}`;
  }
}
