/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve, normalize, join } from 'path';
import { existsSync, statSync } from 'fs';
import { file, jsonNotFound, textNotFound, textForbidden } from '../response';
import { HttpContext, HttpListener } from '../types';
import { Empty } from '../../types';
import { toPathKeys, toPathRe } from '../../helpers';

/**
 * Adds the `path` property to the request, containing the captured path parameters.
 */
export interface RouteContext {
  /**
   * Captured path parameters to the route.
   *
   * If the route has a {some_name} in it it would be captured into `some_name` property.
   * If the route is a RegExp, would pass the capture groups as an array.
   */
  path: any;
}

/**
 * A function to check if a route matches. If it does, returns the captured path parameters, otherwsie - false.
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
type Matcher<TContext> = (req: TContext & HttpContext) => RouteContext | false;

/**
 * Captured path parameters to the route would be passed to the `path` property.
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
export type AppRoute<TContext extends Empty = Empty> = HttpListener<TContext & RouteContext>;

/**
 * A route object, containing a route mather and the route application
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
interface PathRoute<TContext extends Empty> {
  matcher: Matcher<TContext>;
  listener: AppRoute<TContext>;
}

/**
 * An options for a route
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
interface PathRouteOptions<TContext extends Empty> {
  /**
   * The http method to match. If omitted will match any method.
   */
  method?: string;
  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters.
   * You can have multiple parameters in the path, all of them will be extracted.
   *
   * You match pathnames with regex.
   * They need to start it with a ^ and should end it with $
   * Though that is not required and you can leave it out to create wildcard routes.
   */
  path: string | RegExp;

  /**
   * Would pass the captured path parameters to the `path` property
   */
  listener: HttpListener<TContext & RouteContext>;
}

/**
 * A route function to be called on a specific method and path.
 *
 * Used by:
 *
 * - {@link get}
 * - {@link post}
 * - {@link del}
 * - {@link patch}
 * - {@link put}
 * - {@link options}
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
export type Method = <TContext extends Empty = Empty>(
  /**
   * If a pathname has a {some_name} in it it would be captured and accessible with the `path` paramters.
   * You can have multiple parameters in the path, all of them will be extracted.
   *
   * You match pathnames with regex.
   * They need to start it with a ^ and should end it with $
   * Though that is not required and you can leave it out to create wildcard routes.
   */
  path: string | RegExp,

  /**
   * Would pass the captured path parameters to the `path` property
   */
  listener: HttpListener<TContext & RouteContext>,
) => PathRoute<TContext>;

/**
 * Options for {@link staticAssets}
 */
export interface StaticAssetsOptions {
  /**
   * If it is set to false, no Accept-Ranges header would be sent and the Range request headers would not be used. Defaults to true
   */
  acceptRanges?: boolean;
  /**
   * If a directory is requested, it would attempt to load this file inside of that directory. Defaults to index.html
   * To disable it set to undefined
   */
  index?: string;
  /**
   * Would be called if a file was not found at all.
   */
  fileNotFound?: HttpListener;
  /**
   * Would be called if a directory was requested, but index file was not found (or was disabled with `index: undefined`).
   */
  indexNotFound?: HttpListener;
}

/**
 * A generic route function. If you omit the method, would match any method.
 *
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
export const route = <TContext extends Empty = Empty>({
  method,
  path,
  listener,
}: PathRouteOptions<TContext>): PathRoute<TContext> => {
  const keys = typeof path === 'string' ? toPathKeys(path) : undefined;
  const re = typeof path === 'string' ? toPathRe(path) : path;
  const uppercaseMethod = method?.toUpperCase();

  const matcher: Matcher<TContext> = (req) => {
    if (!req.url || (uppercaseMethod && uppercaseMethod !== req.method)) {
      return false;
    }

    const pathMatch = re.exec(req.url.pathname);
    if (pathMatch) {
      return {
        path: keys ? pathMatch.slice(1).reduce((all, val, i) => ({ [keys[i]]: val, ...all }), {}) : pathMatch.slice(1),
      };
    }

    return false;
  };

  return { matcher, listener };
};

/**
 * If the route's matcher matches the current request,
 * extract the path parameters and return them along with the matched route's listener
 *
 * @param req
 * @param routes An array of routes to be checked sequentially
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
const selectRoute = <TContext extends Empty = Empty>(
  req: TContext & HttpContext,
  routes: (PathRoute<TContext> | AppRoute<TContext>)[],
): false | { path: any; listener: HttpListener<TContext & RouteContext> } => {
  for (const route of routes) {
    if ('matcher' in route) {
      const params = route.matcher(req);
      if (params) {
        return { listener: route.listener, ...params };
      }
    } else {
      return { listener: route, path: {} };
    }
  }
  return false;
};

/**
 * Use different routes to call different parts of the application.
 *
 * If you have route parameter in the path, like `/test1/{id}` would pass them down in the `path` property of the request.
 *
 * ```typescript
 * const listener:App = router(
 *   get('/route1/{id}', ({ path: { id }}) => {
 *     // ...
 *   }),
 *   post('/other-route', ({ body }) => {
 *     // ...
 *   })
 * )
 * ```
 * @typeParam TContext pass the request properties that the listener requires. Usually added by the middlewares
 */
export function router<TContext extends Empty = Empty>(
  ...routes: (PathRoute<TContext> | AppRoute<TContext>)[]
): HttpListener<TContext> {
  return async (req) => {
    const selected = selectRoute<TContext>(req, routes);
    return selected
      ? selected.listener({ ...req, path: selected.path })
      : jsonNotFound({ message: `Path ${req.method} ${req.url.pathname} not found` });
  };
}

export const get: Method = (path, listener) => route({ method: 'GET', path, listener });
export const post: Method = (path, listener) => route({ method: 'POST', path, listener });
export const del: Method = (path, listener) => route({ method: 'DELETE', path, listener });
export const patch: Method = (path, listener) => route({ method: 'PATCH', path, listener });
export const put: Method = (path, listener) => route({ method: 'PUT', path, listener });
export const options: Method = (path, listener) => route({ method: 'OPTIONS', path, listener });

/**
 * Validate if a filename is attempting to a file outside of the root
 */
const parentPathRegEx = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

/**
 * You can serve a directory of static assesets with `staticAssets` helper.
 *
 * @param prefixPath The pathname where the directory would be located, example: '/assets'
 * @param root The directory containing the files
 * @param param2 Options
 */
export function staticAssets<T extends Empty = Empty>(
  prefixPath: string,
  root: string,
  {
    index = 'index.html',
    acceptRanges = true,
    indexNotFound = async () => textNotFound('Index file not found'),
    fileNotFound = async () => textNotFound('File not found'),
  }: StaticAssetsOptions = {},
): PathRoute<T> {
  const allwoedMethods = ['GET', 'HEAD'];

  return {
    matcher: (req) => {
      return allwoedMethods.includes(req.incommingMessage.method ?? '') &&
        req.incommingMessage.url?.startsWith(prefixPath)
        ? { path: {} }
        : false;
    },
    listener: async (req) => {
      const relativePath = join('.', normalize(req.incommingMessage.url ?? '').substring(prefixPath.length));

      if (parentPathRegEx.test(relativePath)) {
        return textForbidden('Access Denied');
      }

      const filename = resolve(normalize(root), relativePath);
      const incommingMessage = acceptRanges ? req.incommingMessage : undefined;

      if (existsSync(filename)) {
        const stats = statSync(filename);
        if (stats.isDirectory()) {
          if (index) {
            const indexname = join(filename, index);
            if (existsSync(indexname)) {
              return file(indexname, { incommingMessage });
            }
          }
          return indexNotFound(req);
        } else {
          return file(filename, { incommingMessage, stats });
        }
      } else {
        return fileNotFound(req);
      }
    },
  };
}
