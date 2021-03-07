# Laminar

A minimal nodejs http server, built around the concept of strictly typed middlewares.

### Usage

```shell
yarn add @ovotech/laminar
```

Docs for open api itself: https://swagger.io/docs/

> [examples/oapi.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/oapi.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Simple API
  version: 1.0.0
servers:
  - url: 'http: //localhost:3333'
paths:
  '/user':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              '$ref': '#/components/schemas/User'
      responses:
        '200':
          description: Newly Created User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/NewUser'
    get:
      responses:
        '200':
          description: Loaded User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/User'
components:
  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    NewUser:
      properties:
        result:
          type: string
        user:
          '$ref': '#/components/schemas/User'
      required:
        - result
        - user
```

> [examples/oapi.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/oapi.ts)

```typescript
import { HttpServer, jsonOk, openApi } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const app = await openApi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const server = new HttpServer({ app });
  await server.start();
  console.log(server.describe());
};

main();
```

### Additional options

`api` can be a filename, that would be loaded and parsed (json or yaml). Or it can be the an object representing OpenAPI schema directly. Typescript types would be used to validate that object, as well as using the official json schema to validate it at runtime as well.

`paths` an object closely following the oapi `paths` config, with the "method" function being the actual resolver.

All the validations in open api would be run before executing it.

Validations on the response object shape would also be run, and would result in a 500 error if it doesn't match. This would mean that any clients of this api can be 100% certain they would receive objects in the specified shape.

`security` An object implementing the security requirements, specified in the open api config. More on this later.

### Security

When you define OpenAPI security, you can configure a function that implements that security, and it will be automatically applied to all paths / methods that require it.

> [examples/oapi-security.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/oapi-security.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Simple API
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/user':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              '$ref': '#/components/schemas/User'
      security:
        - MySecurity:
            - admin
      responses:
        '200':
          description: Newly Created User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/NewUser'
    get:
      security:
        - MySecurity: []
      responses:
        '200':
          description: Loaded User
          content:
            application/json:
              schema:
                '$ref': '#/components/schemas/User'
components:
  securitySchemes:
    MySecurity:
      type: http
      scheme: bearer
  schemas:
    User:
      properties:
        email:
          type: string
      required:
        - email
    NewUser:
      properties:
        result:
          type: string
        user:
          '$ref': '#/components/schemas/User'
      required:
        - result
        - user
```

> [examples/oapi-security.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/oapi-security.ts)

```typescript
import { HttpServer, jsonOk, jsonUnauthorized, openApi, securityOk } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi-security.yaml');

const main = async () => {
  const app = await openApi({
    api,
    security: {
      MySecurity: ({ headers }) =>
        headers.authorization === 'Bearer my-secret-token'
          ? securityOk({ email: 'me@example.com' })
          : jsonUnauthorized({ message: 'Unauthorized user' }),
    },
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const server = new HttpServer({ app });
  await server.start();
  console.log(server.describe());
};

main();
```

The security function would also receive the scopes defined in OpenAPI in the second argument, so you can make the authentication more specific

```typescript
const MySecurity = ({ headers }, { scopes }) => {
  // ...
};
```

### Generating types

You can use [@ovotech/lamina-cli](../lamina-cli) package to generate types.

### Json Type Convertion

JSON and JS object are not _exactly_ the same, as you can [read to your horror at MDN docs](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify#Description). Laminar tries to follow that spec, converting your JS objects into stuff that your json-schema can validate. For example Date objects are converted to iso strings and undefined fields are omitted from the object.

This works on type level too. If the types generated from the OpenApi schema would match JS objects passed to the helper functions `jsonOk`, `jsonNotFound` etc.

> [examples/convertion.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/convertion.ts)

```typescript
import { HttpServer, jsonOk, openApi } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'convertion.yaml');

const main = async () => {
  const app = await openApi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        /**
         * The Date object will be converted to a string
         * undefined values will be cleaned up
         */
        get: () =>
          jsonOk({
            email: 'me@example.com',
            createdAt: new Date('2020-01-01T12:00:00Z'),
            title: undefined,
          }),
      },
    },
  });
  const server = new HttpServer({ app });
  await server.start();
  console.log(server.describe());
};

main();
```

### Undocumented types

You can define additional types that are not defined by openapi schema. You can use the laminar router for that, by placing the routes before the app, so they take precedence.

> [examples/oapi-undocumented-routes.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/oapi-undocumented-routes.ts)

```typescript
import { HttpServer, jsonOk, router, get, redirect, openApi } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const app = await openApi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
    notFound: router(
      get('/old/{id}', ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
      get('/old/{id}/pdf', ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    ),
  });

  const server = new HttpServer({
    app,
  });
  await server.start();
  console.log(server.describe());
};

main();
```

### Usage without Open API

To create an http server that responds to `GET .well-known/health-check`, `GET test` and `POST test`

> [examples/simple.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/simple.ts)

```typescript
import { get, post, HttpServer, router, jsonOk, textOk } from '@ovotech/laminar';

const main = async () => {
  const server = new HttpServer({
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      post('/test', () => textOk('submited')),
      get('/test', () => textOk('index')),
    ),
  });
  await server.start();

  console.log(server.describe());
};

main();
```

### It's all about flows

Well it's more about typescript types that automatically apply over middlewares, but we'll get to that in a minute.

Lets see the simplest possible app with laminar, a very simple echo app

> [examples/echo.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo.ts)

```typescript
import { HttpServer, response } from '@ovotech/laminar';

const server = new HttpServer({ app: ({ body }) => response({ body }) });

server.start().then((server) => console.log(server.describe()));
```

It consists of a function that gets the body of the request from the current request context, and returns it as a response. Echo.
No paths, routes or other complications.

Pretty simple, but what if we wanted to add some authentication? This is usually done by having extra code run just before the response processing, to determine if we should execute it or not. Basic stuff I know but bear with me.

Lets just assume that if Authorization header is `Me` then it's me and its fine, otherwise it must be someone else.
We can go ahead and write a middleware, that would do stuff just before passing stuff to the next middleware.

> [examples/echo-auth.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo-auth.ts)

```typescript
import { HttpServer, textForbidden, textOk, HttpApp, HttpMiddleware } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const app: HttpApp = (req) => textOk(req.url.toString());

const server = new HttpServer({ app: auth(app) });

server.start().then((server) => console.log(server.describe()));
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to do stuff before and after whatever follows. For example say we wanted to log what the request and response was.

> [examples/echo-auth-log.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo-auth-log.ts)

```typescript
import { HttpMiddleware, HttpApp, textForbidden, textOk, HttpServer } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: HttpApp = (req) => textOk(req.body);

const server = new HttpServer({ app: log(auth(app)) });
server.start().then((server) => console.log(server.describe()));
```

You can see how we can string those middlewares along `log(auth(main))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

A simple example would be access to an external resource, say a database. We want a middleware that creates a connection, passes that connection to all the middlewares downstream that would make use of it like checking users. But we'd like to be sure that middleware has actually executed, so we don't accidentally try to access a connection that's not there.

Lets see how we can go about doing that.

> [examples/echo-auth-log-db.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo-auth-log-db.ts)

```typescript
import { HttpMiddleware, HttpApp, textForbidden, jsonOk, HttpServer } from '@ovotech/laminar';

/**
 * Its a very simple database, that only has one function:
 * Return the user that is valid, e.g. Me
 */
interface DB {
  getValidUser: () => string;
}

interface RequestDB {
  db: DB;
}

/**
 * Since any database would need to create a connection first,
 * We'll need to have a "middleware creator" function that executes
 * and returns the actual middleware
 */
const createDbMiddleware = (): HttpMiddleware<RequestDB> => {
  const db: DB = { getValidUser: () => 'Me' };
  return (next) => (req) => next({ ...req, db });
};

const auth: HttpMiddleware = (next) => (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

/**
 * We can now require this app to have the middleware.
 * If the propper ones are not executed later, TypeScript will inform us at compile time.
 */
const app: HttpApp<RequestDB> = (req) => jsonOk({ url: req.url.toString(), user: req.db.getValidUser() });

const db = createDbMiddleware();

const server = new HttpServer({ app: log(db(auth(app))) });
server.start().then((server) => console.log(server.describe()));
```

We have a convenience type `Middleware<TProvide, TRequre>` that state what context does it provide to all the middleware downstream of it, and what context does it require from the one upstream of it.

This allows you to be absolutely sure that the middlewares are executed, and in the right order. If you try to play around with them - you'll see that if for example you put db after auth or remove it altogether, then it won't compile at all.

So its a flow of context down the middlewares, but since its an ordered flow, we call it `laminar`.

### BodyParser

By default bodyParser has parsers for json, urlencoded and plain text. If nothing is matched, the `body` parameter object would be the actual readable stream http.IncomingMessage.

You can write and add your own parsers. Each one has a 'match' function and a 'parse' function. Parse also gets the raw http.IncomingMessage from node.

> [examples/body-parser.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/body-parser.ts)

```typescript
import { HttpServer, HttpApp, textOk, BodyParser, concatStream, defaultBodyParsers } from '@ovotech/laminar';

const csvParser: BodyParser = {
  match: (contentType) => contentType === 'text/csv',
  parse: async (body) => String(await concatStream(body)).split(','),
};

const app: HttpApp = ({ body }) => textOk(JSON.stringify(body));

const server = new HttpServer({
  app,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

server.start().then((server) => console.log(server.describe()));
```

### Streaming Data

By default the body parser will concat the incoming request body stream into a string object and pass that around into your app. Sometimes you'd want to not do that for certain content types, like csv data for example.

You can achieve that by writing your own parser that will preserve the `Readable` body object and just pass it inside.

> [examples/streaming-parser.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/streaming-parser.ts)

```typescript
import { HttpServer, HttpApp, BodyParser, defaultBodyParsers, csv, ok } from '@ovotech/laminar';
import { pipeline, Readable, Transform } from 'stream';
import * as parse from 'csv-parse';
import * as stringify from 'csv-stringify';

const csvParser: BodyParser = {
  match: (contentType) => contentType === 'text/csv',
  parse: async (body) => body,
};

const upperCaseTransform = new Transform({
  objectMode: true,
  transform: (row: string[], encoding, callback) =>
    callback(
      undefined,
      row.map((item) => item.toUpperCase()),
    ),
});

/**
 * A function that will convert a readable stream of a csv into one with all items upper cased.
 * Using node's [pipeline](https://nodejs.org/api/stream.html#stream_stream_pipeline_streams_callback) function to handle the streams
 */
const transformCsv = (body: Readable): Readable =>
  pipeline(body, parse(), upperCaseTransform, stringify(), (err) => (err ? console.error(err.message) : undefined));

const app: HttpApp = ({ body }) => csv(ok({ body: transformCsv(body) }));

const server = new HttpServer({
  app,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

server.start().then((server) => console.log(server.describe()));
```

Alternatively, you can also set `bodyParsers` option to an empty array (`[]`), and use `bodyParserComponent` as a middleware, selectively only on specific routes.

### Router

The router middleware allows you to respond to requests based on what path was requested, as well as extract information from that path for use in processing your request.

> [examples/router.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/router.ts)

```typescript
import { get, put, HttpServer, router, jsonOk, jsonNotFound } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const server = new HttpServer({
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    get('/users', () => jsonOk(users)),
    get('/users/{id}', ({ path }) => jsonOk(users[path.id])),
    put('/users/{id}', ({ path, body }) => {
      users[path.id] = body;
      return jsonOk(users[path.id]);
    }),
    // Default URL handler
    ({ url }) => jsonNotFound({ message: `This url ${url} was not found` }),
  ),
});

server.start().then((server) => console.log(server.describe()));
```

Path parameters are written in `{nameOfParameter}` style, and each name is extracted and its value passed in the `path` context property.

If none of the routes match, the router would return a generic 404. You can modify that by using `defaultRoute` at the end of all the matchers. You can also use `response` helper to set custom status code.

> [examples/default-route.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/default-route.ts)

```typescript
import { get, router, jsonOk, textNotFound, HttpServer } from '@ovotech/laminar';

const server = new HttpServer({
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    () => textNotFound('Woopsy'),
  ),
});

server.start().then((server) => console.log(server.describe()));
```

You can also configure a route to ba a static folder with assets. Works with nested folders as well, does not support index pages.

> [examples/static-assets.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/static-assets.ts)

```typescript
import { get, HttpServer, router, staticAssets, jsonOk } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const server = new HttpServer({
    app: router(
      staticAssets('/my-folder', join(__dirname, 'assets')),
      get('/', () => jsonOk({ health: 'ok' })),
    ),
  });
  await server.start();
  console.log(server.describe());
};

main();
```

All the available route matchers are:

| Matcher   | Description                   |
| --------- | ----------------------------- |
| get       | Match path with http `GET`    |
| put       | Match path with http `PUT`    |
| post      | Match path with http `POST`   |
| del       | Match path with http `DELETE` |
| patch     | Match path with http `PATCH`  |
| option    | Match path with http `OPTION` |
| index     | Match any route or path       |
| directory | Resolve paths to static files |

### Response

Each laminar app must return a response object. Response objects are created with the various helpers. Example how it all looks like:

> [examples/cors.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/response.ts)

```typescript
import {
  get,
  HttpServer,
  router,
  jsonOk,
  jsonNotFound,
  redirect,
  jsonForbidden,
  file,
  jsonBadRequest,
  htmlBadRequest,
  htmlForbidden,
  htmlNotFound,
  htmlOk,
  json,
  csv,
  ok,
  badRequest,
  textOk,
} from '@ovotech/laminar';
import { createReadStream } from 'fs';
import { join } from 'path';

const server = new HttpServer({
  app: router(
    // Redirects
    get('/redirect', () => redirect('http://my-new-location.example.com', { headers: { 'X-Other': 'Other' } })),

    // Static files
    get('/static-file', () => file(join(__dirname, 'assets/start.svg'))),

    // Different stream types
    get('/text-stream', () => textOk(createReadStream(join(__dirname, 'assets/texts/one.txt')))),
    get('/html-stream', () => htmlOk(createReadStream(join(__dirname, 'assets/texts/other.html')))),

    // JSON Responses
    get('/json/forbidden', () => jsonForbidden({ message: 'Not Authorized' })),
    get('/json/object', () => jsonOk({ health: 'ok' })),
    get('/json/not-found-response', () => jsonNotFound({ message: 'not found' })),
    get('/json/bad-request', () => jsonBadRequest({ message: 'not found' })),

    // Custom status code
    get('/json/208', () => json({ body: { message: 'custom response' }, status: 208 })),

    // HTML Responses
    get('/json/forbidden', () => htmlForbidden('<html>Forbidden</html>')),
    get('/html/object', () => htmlOk('<html>OK</html>')),
    get('/html/not-found-response', () => htmlNotFound('<html>Not Found</html>')),
    get('/html/bad-request', () => htmlBadRequest('<html>Bad Request</html>')),

    // Additional Types
    get('/csv/ok', () => csv(ok({ body: 'one,two,three' }))),
    get('/csv/error', () => csv(badRequest({ body: 'error,error2,error3' }))),
  ),
});

server.start().then((server) => console.log(server.describe()));
```

Helpers that set the status code are as follows:

| Helper              | Status Code |
| ------------------- | ----------- |
| ok                  | `200`       |
| movedPermanently    | `301`       |
| found               | `302`       |
| seeOther            | `303`       |
| notModified         | `304`       |
| badRequest          | `400`       |
| unauthorized        | `401`       |
| forbidden           | `403`       |
| notFound            | `404`       |
| internalServerError | `500`       |

Helpers that set the content type header are:

| Helper | Content Type Header                 |
| ------ | ----------------------------------- |
| json   | `application/json`                  |
| yaml   | `application/yaml`                  |
| binary | `application/octet-stream`          |
| form   | `application/x-www-form-urlencoded` |
| pdf    | `application/pdf`                   |
| xml    | `application/xml`                   |
| text   | `text/plain`                        |
| html   | `text/html`                         |
| css    | `text/css`                          |
| csv    | `text/csv`                          |

You can combine them any way you like:

```typescript
text(ok('My text'));
xml(badRequest('<request type="bad"></request>'));
internalServerError(yaml('message: error'));
```

Since they are used often, there are combined shelpers for text, json and html - `jsonOk`, `jsonBadRequest`, `textNotFound`, `htmlNotModified` ...

There are also 2 special helpers: redirect and file

redirect(location, options);

> Create a response object that will redirect to a given location.
> Sets the 'Location' header.

file(filename, options);

> Return a file response.
> Setting the 'content-type', 'content-length', 'last-modified' headers based on the file itself.
> Supports content ranges as well, if you pass the incommingMessage from the request, so it can determine the range.

### Cors Middleware

A cors handling middleware comes with laminar as well.

For example this would allow only 'example.com' and 'localhost' as origins.

> [examples/cors.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/cors.ts)

```typescript
import { jsonOk, get, put, HttpServer, router, corsMiddleware } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const cors = corsMiddleware({
  allowOrigin: (origin) => ['http://example.com', 'http://localhost'].includes(origin),
});

const server = new HttpServer({
  app: cors(
    router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users', () => jsonOk(users)),
      get('/users/{id}', ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', ({ path, body }) => {
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});
server.start().then((server) => console.log(server.describe()));
```

### Logging Middleware

There's a simple middleware that allows you to log requests, responses and pass in a your own logger as a context.

> [examples/logging.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/logging.ts)

```typescript
import { get, put, HttpServer, router, jsonOk, loggingMiddleware } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const logging = loggingMiddleware(console);

const server = new HttpServer({
  app: logging(
    router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      get('/users', () => jsonOk(users)),
      get('/users/{id}', ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', ({ path, body, logger }) => {
        logger.log('info', 'putting');
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});
server.start().then((server) => console.log(server.describe()));
```

### HTTPS (TLS) Support

laminar can use node's https server.

> [examples/simple-https.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/simple-https.ts)

```typescript
import { get, post, HttpServer, router, textOk, jsonOk } from '@ovotech/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const server = new HttpServer({
    port: 8443,
    https: {
      key: readFileSync(join(__dirname, 'key.pem')),
      cert: readFileSync(join(__dirname, 'cert.pem')),
    },
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      post('/test', () => textOk('submited')),
      get('/test', () => textOk('index')),
    ),
  });
  await server.start();

  console.log(server.describe());
};

main();
```

## Running the tests

You can run the tests with:

```bash
yarn test
```

### Coding style (linting, etc) tests

Style is maintained with prettier and eslint

```
yarn lint
```

## Deployment

Deployment is preferment by lerna automatically on merge / push to main, but you'll need to bump the package version numbers yourself. Only updated packages with newer versions will be pushed to the npm registry.

## Contributing

Have a bug? File an issue with a simple example that reproduces this so we can take a look & confirm.

Want to make a change? Submit a PR, explain why it's useful, and make sure you've updated the docs (this file) and the tests (see [test folder](test)).

## License

This project is licensed under Apache 2 - see the [LICENSE](LICENSE) file for details
