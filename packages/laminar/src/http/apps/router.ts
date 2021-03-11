/* eslint-disable @typescript-eslint/no-explicit-any */
import { resolve, normalize, join } from 'path';
import { existsSync, statSync } from 'fs';
import { file, jsonNotFound, textNotFound, textForbidden } from '../response';
import { HttpRequest, HttpApp } from '../types';
import { Empty } from '../../types';
import { toPathKeys, toPathRe } from '../../helpers';

/**
 * Adds the `path` property to the request, containing the captured path parameters.
 */
export interface RequestRoute {
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
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
type Matcher<TRequest> = (req: TRequest & HttpRequest) => RequestRoute | false;

/**
 * Captured path parameters to the route would be passed to the `path` property.
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export type AppRoute<TRequest extends Empty = Empty> = HttpApp<TRequest & RequestRoute>;

/**
 * A route object, containing a route mather and the route application
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
interface PathRoute<TRequest extends Empty> {
  matcher: Matcher<TRequest>;
  app: AppRoute<TRequest>;
}

/**
 * An options for a route
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
interface PathRouteOptions<TRequest extends Empty> {
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
  app: HttpApp<TRequest & RequestRoute>;
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
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export type Method = <TRequest extends Empty = Empty>(
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
  app: HttpApp<TRequest & RequestRoute>,
) => PathRoute<TRequest>;

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
  fileNotFound?: HttpApp;
  /**
   * Would be called if a directory was requested, but index file was not found (or was disabled with `index: undefined`).
   */
  indexNotFound?: HttpApp;
}

/**
 * A generic route function. If you omit the method, would match any method.
 *
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export const route = <TRequest extends Empty = Empty>({
  method,
  path,
  app,
}: PathRouteOptions<TRequest>): PathRoute<TRequest> => {
  const keys = typeof path === 'string' ? toPathKeys(path) : undefined;
  const re = typeof path === 'string' ? toPathRe(path) : path;
  const uppercaseMethod = method?.toUpperCase();

  const matcher: Matcher<TRequest> = (req) => {
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

  return { matcher, app };
};

/**
 * If the route's matcher matches the current request,
 * extract the path parameters and return them along with the matched route's app
 *
 * @param req
 * @param routes An array of routes to be checked sequentially
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
const selectRoute = <TRequest extends Empty = Empty>(
  req: TRequest & HttpRequest,
  routes: (PathRoute<TRequest> | AppRoute<TRequest>)[],
): false | { path: any; app: HttpApp<TRequest & RequestRoute> } => {
  for (const route of routes) {
    if ('matcher' in route) {
      const params = route.matcher(req);
      if (params) {
        return { app: route.app, ...params };
      }
    } else {
      return { app: route, path: {} };
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
 * const app:App = router(
 *   get('/route1/{id}', ({ path: { id }}) => {
 *     // ...
 *   }),
 *   post('/other-route', ({ body }) => {
 *     // ...
 *   })
 * )
 * ```
 * @typeParam TRequest pass the request properties that the app requires. Usually added by the middlewares
 */
export function router<TRequest extends Empty = Empty>(
  ...routes: (PathRoute<TRequest> | AppRoute<TRequest>)[]
): HttpApp<TRequest> {
  return async (req) => {
    const selected = selectRoute<TRequest>(req, routes);
    return selected
      ? selected.app({ ...req, path: selected.path })
      : jsonNotFound({ message: `Path ${req.method} ${req.url.pathname} not found` });
  };
}

export const get: Method = (path, app) => route({ method: 'GET', path, app });
export const post: Method = (path, app) => route({ method: 'POST', path, app });
export const del: Method = (path, app) => route({ method: 'DELETE', path, app });
export const patch: Method = (path, app) => route({ method: 'PATCH', path, app });
export const put: Method = (path, app) => route({ method: 'PUT', path, app });
export const options: Method = (path, app) => route({ method: 'OPTIONS', path, app });

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
    app: async (req) => {
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
