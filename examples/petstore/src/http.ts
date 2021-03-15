import { join } from 'path';
import { openApiTyped } from './__generated__/petstore';
import { pathPetsGet, pathPetsIdGet, pathPetsIdDelete, pathPetsPost } from './paths';
import { jwtSecurityResolver, verifyToken } from '@ovotech/laminar-jwt';
import { HttpListener } from '@ovotech/laminar';
import { PetsDbContext } from './middleware';
import { EnvVars } from './env';

/**
 * Create the http server to be started and stopped by the main executor
 * Separating it this way allows us to test it easily
 */
export const createHttp = async <T>(env: EnvVars): Promise<HttpListener<PetsDbContext>> => {
  const jwtVerify = { secret: env.SECRET };

  return await openApiTyped<PetsDbContext>({
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
};
