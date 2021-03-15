/* eslint-disable @typescript-eslint/no-explicit-any */
import { IncomingHttpHeaders, IncomingMessage, OutgoingHttpHeaders } from 'http';
import { Readable } from 'stream';
import { URL } from 'url';
import { Empty, AbstractMiddleware } from '../types';

/**
 * The initial Request that comes from node's [http.createServer](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener)
 */
export interface HttpContext {
  incommingMessage: IncomingMessage;

  /**
   * The host header, takes proxies into account using x-forwarded-host into account
   */
  host: string;

  /**
   * Check if the incommingMessage is from a TLSSocket or Socket
   */
  protocol: 'http' | 'https';

  /**
   * http.IncomingHttpHeaders from the incommingMessage
   */
  headers: IncomingHttpHeaders;

  /**
   * The full url of the request, with host and protocol information
   */
  url: URL;

  /**
   * http.IncomingHttpHeaders.method
   */
  method: string;

  /**
   * Parsed url search query.
   *
   * Supports arrays with name[]=&name[]= or comma separated values
   * Works with nested names too.
   */
  query: any;

  /**
   * Values from the parsed cookie header. In the format: { [cookie name]: value }
   */
  cookies: Record<string, string> | undefined;

  /**
   * The parsed body of the request. Parsed using the provided body parsers.
   *
   * Supported:
   *  - text
   *  - json
   *  - url encoded
   *
   * You can add additional parser / modify existing ones
   */
  body: any;
}
/**
 * A response that can be rendered by Laminar direcrectly, and would not need to be processed.
 * All response bodies should be converted to tbis
 */
export type HttpResponseBody = Readable | Buffer | string;

/**
 * A strongly typed response object.
 * You can use the various response helpers to produce / modfiy those objects.
 *
 * For example those helpers would return a response type object: {@link response}, {@link jsonOk}, {@link jsonNotFound}, {@link htmlOk}
 *
 * @typeParam Content The strict type of the content. Used by type generators to specify the required body type as a type literal
 * @typeParam Status The strict status type. Used by type generators to specify the status as a type literal, for example `302 | 200`
 * @category Response
 */
export interface HttpResponse<Content = unknown, Status = number> {
  /**
   * The body content. Should be {@link HttpResponseBody} or anything that the {@link responseParserComponent} can parse.
   * You can add custom response parser to be able to process different types of objects.
   */
  body: Content;

  /**
   * HTTP status. for example 200 or 404
   * https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
   */
  status: Status;

  /**
   * An object that would be set to the [http.ServerResponse](https://nodejs.org/api/http.html#http_class_http_serverresponse)
   *
   * Multiple values are supported as well, using an array `string[]`.
   *
   * For more examples look at [http.ServerResponse.setHeader](https://nodejs.org/api/http.html#http_response_setheader_name_value)
   */
  headers: OutgoingHttpHeaders;
}

/**
 * A pure function to convert an {@link HttpRequest} into a {@link Response} object
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export type HttpListener<TRequest extends Empty = Empty> = (req: HttpContext & TRequest) => Promise<HttpResponse>;

// export type HttpMiddleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <
//   TInherit extends HttpRequest
// >(
//   next: (req: TProvide & TRequire & TInherit) => Promise<HttpResponse>,
// ) => (req: TRequire & TInherit) => Promise<HttpResponse>;

/**
 * An middleware that uses {@link HttpRequest} and modifies it to be used by the app or the downstream middlewares
 *
 * You can compose middlewares in order to build a larger app.
 * Each middlewares would process the request parameters and add new ones, that would be available to downstream components.
 *
 * ```typescript
 * const app: App = ...;
 *
 * const middleware1: Middleware = ...;
 * const middleware2: Middleware = ...;
 *
 * const appWithMiddlewares = middleware1(middleware2(app));
 * ```
 *
 * @typeParam TProvide Specify what parameters the component would add into the {@link HttpRequest}.
 * @typeParam TRequire Specify what parameters to require from the {@link HttpRequest}.
 * @typeParam TInherit A helper type to allow Typescript to correctly infer the types of all the previous / next middleware in the flow
 * @returns A function to compose with other middlewares over an app
 */
export type HttpMiddleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = AbstractMiddleware<
  HttpContext,
  HttpResponse,
  TProvide,
  TRequire
>;

export type IncommingMessageResolver = (incommingMessage: IncomingMessage) => Promise<HttpResponse>;
