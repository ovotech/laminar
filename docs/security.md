# Implementing security for OpenAPI Schema

If you have this schema, that has `JWT` Security schema and uses it to protect the get method without any scopes:

> [examples/security/src/api.yaml](https://github.com/ovotech/laminar/tree/main/examples/security/src/api.yaml)

```yaml
openapi: '3.0.0'
info:
  title: 'Security Example'
  version: 1.0.0
paths:
  /user/{id}:
    get:
      # Using the JWT security, with no scopes
      security: [{ JWT: [] }]
      parameters:
        - name: 'id'
          in: 'path'
          required: true
          schema:
            type: 'string'
            pattern: '\d+'
      responses:
        200:
          description: 'User'
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
components:
  securitySchemes:
    # Defining the JWT security schema
    JWT:
      type: http
      scheme: bearer
  schemas:
    UserResponse:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
```

You can then implement the security, by writing a Security Resolver function, that would return either `securityOk` or any `Response` object.
If the user is authenticated, then laminar will add the user auth info in the `userAuth` property of hte request, otherwise it would just return the `Response` object, whatever it is.

> [examples/security/src/index.ts](https://github.com/ovotech/laminar/tree/main/examples/security/src/index.ts)

```typescript
import { HttpServer, start, jsonOk, jsonForbidden, securityOk } from '@ovotech/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api';

const findUser = (id: string) => ({ id, name: 'John' });

/**
 * A simple validate function that would return either SecurityOk or Response objects.
 * All security resolvers must do that.
 * If you return `securityOk` that means the user is validated
 * and the contents of `securityOk` would be passed to the `authInfo` property of the object
 *
 * Otherwise the Response would be returned directly
 */
const validate = (authorizaitonHeader?: string) =>
  authorizaitonHeader === 'Secret Pass'
    ? securityOk({ email: 'me@example.com' })
    : jsonForbidden({ message: 'Unkown user' });

const main = async () => {
  const app = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    security: {
      /**
       * Implementing the security
       */
      JWT: ({ headers }) => validate(headers.authorization),
    },
    paths: {
      '/user/{id}': {
        get: async ({ path }) => jsonOk(findUser(path.id)),
      },
    },
  });
  const server = new HttpServer({ app });
  await start([server], console);
};

main();
```

## JWT Security

If we had this oapi.yaml

> [packages/laminar-jwt/examples/oapi.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/session':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A session object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Session' }
  '/test':
    post:
      security:
        # Using the JWTSecurity with admin scopes
        - JWTSecurity: ['admin']
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }
    get:
      security:
        # Using the JWTSecurity with no scopes
        - JWTSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }

components:
  securitySchemes:
    # Defining the JWTSecurity schema to be used on the routes
    JWTSecurity:
      type: http
      scheme: bearer

  schemas:
    Session:
      additionalProperties: false
      properties:
        jwt:
          type: string
        user:
          $ref: '#/components/schemas/User'
      required:
        - jwt
        - user
    User:
      properties:
        email:
          type: string
        scopes:
          type: array
          items:
            type: string
      required:
        - email

    Test:
      properties:
        text:
          type: string
        user:
          $ref: '#/components/schemas/User'
      required:
        - text
```

And then implement it using the helper `jwtSecurityResolver`. That function would return a `securityOk` object if the jwt was validated, with the contents of the jwt, or a 403 error response.

> [packages/laminar-jwt/examples/oapi.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi.ts)

```typescript
import { HttpServer, start, jsonOk, openApi } from '@ovotech/laminar';
import { createSession, jwtSecurityResolver } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const app = await openApi({
    api: join(__dirname, 'oapi.yaml'),
    security: { JWTSecurity: jwtSecurityResolver({ secret }) },
    paths: {
      '/session': {
        post: async ({ body }) => jsonOk(createSession({ secret }, body)),
      },
      '/test': {
        get: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
        post: async ({ authInfo }) => jsonOk({ text: 'ok', user: authInfo }),
      },
    },
  });
  const server = new HttpServer({ app });
  await start([server], console);
};

main();
```

## Cookie Security

If you need the old school but still awesome cookie security, OpenAPI can handle that too - [docs for cookie auth with OpenAPI](https://swagger.io/docs/specification/authentication/cookie-authentication/). You can use the "apiKey" security to define it.

> [packages/laminar-jwt/examples/oapi-api-key.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-api-key.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/session':
    post:
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A session object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
          headers:
            Set-Cookie:
              schema:
                type: string
                example: auth=abcde12345; Path=/; HttpOnly
  '/test':
    post:
      description: Protected by CookieSecurity, no scopes
      security:
        - CookieSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
    get:
      description: Protected by CookieSecurity, no scopes
      security:
        - CookieSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }

components:
  securitySchemes:
    CookieSecurity:
      description: Security using the `auth` cookie. To be used in the routes.
      type: apiKey
      in: cookie
      name: auth

  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    Text:
      type: string
```

Implementing it involves reading the cookie and validating its contents.

> [packages/laminar-jwt/examples/oapi-api-key.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-api-key.ts)

```typescript
import { HttpServer, start, openApi, textOk, setCookie } from '@ovotech/laminar';
import { createSession, verifyToken } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const app = await openApi({
    api: join(__dirname, 'oapi-api-key.yaml'),
    security: {
      /**
       * Implement cookie security.
       */
      CookieSecurity: ({ cookies, scopes }) => verifyToken({ secret }, cookies?.auth, scopes),
    },
    paths: {
      '/session': {
        post: async ({ body }) => setCookie({ auth: createSession({ secret }, body).jwt }, textOk('Cookie Set')),
      },
      '/test': {
        get: async () => textOk('OK'),
        post: async ({ authInfo }) => textOk(`OK ${authInfo.email}`),
      },
    },
  });
  const server = new HttpServer({ app });
  await start([server], console);
};

main();
```

## Custom security resolvers

OpenApi supports more security methods, and they can be implemented with a security resolver.
Since a security resolver is just a function that gets request properties and returns either `securityOk` or a `Response` object, we can do a lot of custom things.

> [packages/laminar-jwt/examples/oapi-custom.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-custom.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/session':
    post:
      requestBody:
        required: true
        content:
          application/x-www-form-urlencoded:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A session object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
          headers:
            Set-Cookie:
              schema:
                type: string
                example: auth=abcde12345; Path=/; HttpOnly
  '/test':
    post:
      description: Either CookieSecurity or CloudSchedulerSecurity should match, no scopes
      security:
        - CookieSecurity: []
        - CloudSchedulerSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
    get:
      description: Only CookieSecurity can be used for this route, no scopes, no scopes
      security:
        - CookieSecurity: []
      responses:
        '200':
          description: A Test Object
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }
  '/unauthorized':
    get:
      responses:
        '403':
          description: Forbidden
          content:
            text/plain:
              schema: { $ref: '#/components/schemas/Text' }

components:
  securitySchemes:
    CookieSecurity:
      description: Security using the `auth` cookie. To be used in the routes.
      type: apiKey
      in: cookie
      name: auth
    CloudSchedulerSecurity:
      description: Security using the `X-CloudScheduler` header. To be used in the routes.
      type: apiKey
      in: header
      name: 'x-cloudscheduler'

  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    Text:
      type: string
```

> [packages/laminar-jwt/examples/oapi-custom.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-jwt/examples/oapi-custom.ts)

```typescript
import {
  HttpServer,
  start,
  openApi,
  redirect,
  isSecurityOk,
  securityOk,
  textOk,
  textForbidden,
  setCookie,
} from '@ovotech/laminar';
import { createSession, verifyToken } from '@ovotech/laminar-jwt';
import { join } from 'path';

const main = async () => {
  const secret = '123';
  const app = await openApi({
    api: join(__dirname, 'oapi-custom.yaml'),
    security: {
      /**
       * Implement additional cookie security.
       * In an event of a failure, we'd want to redirect to an error page, instead of returning a 403 response
       */
      CookieSecurity: async ({ cookies, scopes }) => {
        const result = await verifyToken({ secret }, cookies?.auth, scopes);
        return isSecurityOk(result) ? result : redirect('/unauthorized');
      },
      /**
       * Cloud Scheduler would ensure that this header is never sent outside of the app engine environment,
       * so we're safe just checking for the existance of the header.
       */
      CloudSchedulerSecurity: ({ headers }) =>
        headers['x-cloudscheduler'] ? securityOk({}) : textForbidden('Not Cloud Scheduler Job'),
    },
    paths: {
      '/session': {
        post: async ({ body }) => setCookie({ auth: createSession({ secret }, body).jwt }, textOk('Cookie Set')),
      },
      '/test': {
        get: async () => textOk('OK'),
        post: async ({ authInfo }) => textOk(`OK ${authInfo.email}`),
      },
      '/unauthorized': { get: async () => textForbidden('Forbidden!') },
    },
  });
  const server = new HttpServer({ app });
  await start([server], console);
};

main();
```
