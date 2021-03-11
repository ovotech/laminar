import { openApiTyped } from './__generated__/petstore';
import { pathPetsGet, pathPetsIdGet, pathPetsIdDelete, pathPetsPost } from './paths';
import { join } from 'path';
import { jwtSecurityResolver, verifyToken } from '@ovotech/laminar-jwt';
import { HttpApp, LoggerLike, loggingMiddleware } from '@ovotech/laminar';
import { petsDbMiddleware, RequestPetsDb } from './middleware';
import { PgPoolService, pgPoolMiddleware, RequestPgPool } from '@ovotech/laminar-pg';

export interface Options {
  pool: PgPoolService;
  secret: string;
  logger: LoggerLike;
}

/**
 * Create the http server to be started and stopped by the main executor
 * Separating it this way allows us to test it easily
 */
export const createApp = async (options: Options): Promise<HttpApp> => {
  const jwtVerify = { secret: options.secret };

  const oapi = await openApiTyped<RequestPgPool & RequestPetsDb>({
    api: join(__dirname, '../petstore.yaml'),
    security: {
      /**
       * Since JWT tokens are a common case, we have an easy wrapper function to handle it
       */
      BearerAuth: jwtSecurityResolver(jwtVerify),

      /**
       * Everything else can use the `verifyToken` method that handles raw jwt tokens
       * It returns either a response object or a securityOk object, containing the authenticated user
       */
      ApiKeyAuth: ({ headers, scopes }) => verifyToken(jwtVerify, headers['x-api-key'], scopes),
      CookieAuth: ({ cookies, scopes }) => verifyToken(jwtVerify, cookies.auth, scopes),
      QueryAuth: ({ query, scopes }) => verifyToken(jwtVerify, query.token, scopes),
    },
    paths: {
      '/pets': {
        get: pathPetsGet,
        post: pathPetsPost,
      },
      '/pets/{id}': {
        get: pathPetsIdGet,
        delete: pathPetsIdDelete,
      },
    },
  });

  /**
   * The pool middleware will provide access to the postgres pool
   * While pets db middleware would use a connection from that pool to save / load pets
   *
   * They are separate this way since we want to have an isolated connection _per request_
   * so no one request can accidentally get data from another.
   *
   * Pg Pool would get a connection from the pool for each request,
   * and pets db would use that to pass a object to manipulate the model safely
   *
   * Their internal types make sure all dependencies are met at compile time.
   */
  const pgPool = pgPoolMiddleware(options.pool);
  const petsDb = petsDbMiddleware();
  const logging = loggingMiddleware(options.logger);

  // Apply the middlewares.
  // The typescript types will ensure they are applied in the right order, and no dependencies are missing
  return logging(pgPool(petsDb(oapi)));
};
