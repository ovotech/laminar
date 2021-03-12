# Laminar

Building OpenApi backed REST APIs in TypeScript. Automatic validation of request / response based on the api schema.
Generate Types using a cli. This is an attempt to implement the concepts of [Design-First, Evolve with Code](https://apisyouwonthate.com/blog/api-design-first-vs-code-first) principles cleanly.

## Installation

You'll need to install `@ovotech/laminar` package:

```shell
yarn add @ovotech/laminar
```

Additionally, if you want to take advantage of the type generation:

```shell
yarn add @ovotech/laminar-cli
```

## A tutorial to get started.

You'll need a very simple OpenAPI schema file, something like:

> [examples/simple/src/api.yaml](https://github.com/ovotech/laminar/tree/main/examples/simple/src/api.yaml)

```yaml
openapi: '3.0.0'
info:
  title: 'Simple Example'
  version: 1.0.0
paths:
  /user/{id}:
    get:
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
  schemas:
    UserResponse:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
```

First we'll generate the types for its so its easier to implement it. Since we've already installed `@ovotech/laminar-cli` we can:

```shell
yarn laminar api --file api.yaml --output __generated__/api.ts
```

> [examples/simple/src/index.ts](https://github.com/ovotech/laminar/tree/main/examples/simple/src/index.ts)

```typescript
import { HttpServer, start, jsonOk } from '@ovotech/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api';

/**
 * A simple function to get some data out of a data store
 */
const findUser = (id: string) => ({ id, name: 'John' });

const main = async () => {
  /**
   * Since we've already generated this using the api file, the paths,
   * all of its request and response data would be properly typed
   */
  const app = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/user/{id}': {
        get: async ({ path }) => {
          /**
           * Our types would require us to return a json response specifically,
           * otherwise it would not compile
           */
          return jsonOk(findUser(path.id));
        },
      },
    },
  });

  /**
   * Now we've cerated the server, but it has not yet been started.
   * Default port is 3300
   */
  const server = new HttpServer({ app });

  /**
   * The http server now should be running and indicate that the server is now running
   */
  await start([server], console);
};

main();
```

## API

Detailed api for laminar and supporting packages: https://ovotech.github.com/laminar/api/index.html

## Functioning examples

You can dive in directly with some example apps:

- [examples/simple](https://github.com/ovotech/laminar/tree/main/examples/simple) Where you see how the most minimal laminar app with generated types can look like
- [examples/security](https://github.com/ovotech/laminar/tree/main/examples/security) With some simple security built in
- [examples/petstore](https://github.com/ovotech/laminar/tree/main/examples/petstore) A minimal but functional petstore implementation - with working jwt security and database access

## Packages in this monorepo

Laminar includes packages that are used internally or are additions to its core features.

- [@ovotech/laminar](https://github.com/ovotech/laminar/tree/packages/laminar) - [OpenAPI](https://swagger.io/docs/) http server
- [@ovotech/laminar-cli](https://github.com/ovotech/laminar/tree/packages/laminar-cli) - [OpenAPI](https://swagger.io/docs/) type generation
- [@ovotech/laminar-handlebars](https://github.com/ovotech/laminar/tree/packages/laminar-handlebars) - [handlebars](https://github.com/wycats/handlebars.js/) middleware
- [@ovotech/laminar-jwt](https://github.com/ovotech/laminar/tree/packages/laminar-handlebars) - [JSON Web Token](https://github.com/auth0/node-jsonwebtoken) middleware
- [@ovotech/json-schema](https://github.com/ovotech/laminar/tree/packages/json-schema) - Lightweight json-schema validator
- [@ovotech/axios-oapi-cli](https://github.com/ovotech/laminar/tree/packages/axios-oapi-cli) - Generate typescript types for axios, using OpenApi schema
