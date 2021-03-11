/**
 * Used throughout the project to express "empty object"
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Empty = {};

export interface Service {
  start(): Promise<this>;
  stop(): Promise<this>;
  describe(): string;
}

export type AbstractMiddleware<TRequest, TResponse, TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <
  TInherit extends TRequest
>(
  next: (req: TProvide & TRequire & TInherit) => Promise<TResponse>,
) => (req: TRequire & TInherit) => Promise<TResponse>;

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
export type Middleware<TProvide extends Empty = Empty, TRequire extends Empty = Empty> = <TInherit, TResponse>(
  next: (req: TProvide & TRequire & TInherit) => Promise<TResponse>,
) => (req: TRequire & TInherit) => Promise<TResponse>;

// interface Req {
//   name: string;
// }

// interface Res {
//   status: number;
// }

// interface Logger {
//   logger: Console;
// }
// export const loggerMiddleware = (logger: Console): Middleware<Logger> => (next) => async (ctx) =>
//   next({ ...ctx, logger });

// export const resMiddleware: Middleware = (next) => async (ctx) => {
//   const a = await next(ctx);
//   console.log(a);
//   return a;
// };

// const myMiddlewarelogger = loggerMiddleware(console);
// const cors = corsMiddleware();

// type App2 = (req: Req) => Promise<Res>;
// type App3 = (req: Req) => Promise<void>;

// const a1: HttpApp = (myMiddlewarelogger(resMiddleware(cors(async ({ url }) => jsonOk({ url })))));
// const a2: App3 = myMiddlewarelogger(resMiddleware(async ({ name }) => {
//   console.log(name);
// }));

// console.log(a1, a2);
