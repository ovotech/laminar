# Laminar Oapi CLI

A CLI for the Open Api implementation for the laminar http server.

## Usage

```
yarn add @ovotech/laminar-cli
```

Given a OpenAPI config file:

> [examples/api.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/api.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: http://localhost:3333
paths:
  '/test':
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }
    get:
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }

components:
  schemas:
    User:
      additionalProperties: false
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

We can run:

```
yarn laminar api --file examples/api.yaml --output examples/__generated__/api.yaml.ts
```

Which would convert a given `api.yaml` file to a `api.yaml.ts`. Any external urls, referenced in it would be downloaded, and any local file references would be loaded as well.

Then you can load the types like this:

> [examples/api.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/api.ts)

```typescript
import { HttpServer, start, jsonOk } from '@ovotech/laminar';
import { join } from 'path';
import { openApiTyped } from './__generated__/api.yaml';

const main = async () => {
  const app = await openApiTyped({
    api: join(__dirname, 'api.yaml'),
    paths: {
      '/test': {
        post: async ({ body }) => jsonOk({ text: 'ok', user: body }),
        get: async () => jsonOk({ text: 'ok', user: { email: 'me@example.com' } }),
      },
    },
  });
  const server = new HttpServer({ app });
  await start([server], console);
};

main();
```

## Watching for changes

You can also watch for changes and regenerate the typescript types with the `--watch` flag

```
yarn laminar --watch --file examples/api.yaml --output examples/__generated__/api.yaml.ts
```

When you update the source yaml file, or any of the local files it references, `laminar` would rebuild the typescript files.

## Axios type generation

Given this OpenApi file:

> [examples/axios.yaml](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/axios.yaml)

```yaml
---
openapi: 3.0.0
info:
  title: Test
  version: 1.0.0
servers:
  - url: https://simple.example.com
paths:
  '/test/{id}':
    parameters:
      - name: id
        in: path
        schema:
          type: string
        required: true

    post:
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: '#/components/schemas/User' }
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }
    get:
      responses:
        '200':
          description: A Test Object
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Test' }

components:
  schemas:
    User:
      additionalProperties: false
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

You can run

```sh
yarn laminar axios --file examples/axios.yaml --output examples/__generated__/axios.yaml.ts
```

And would then have:

> [examples/\_\_generated\_\_/axios.yaml.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/__generated__/axios.yaml.ts)

```typescript
import { AxiosRequestConfig, AxiosInstance, AxiosResponse } from 'axios';

/**
 * Test
 *
 * Version: 1.0.0
 */
export const axiosOapi = (api: AxiosInstance): AxiosOapiInstance => ({
  'POST /test/{id}': (id, data, config) => api.post<Test>(`/test/${id}`, data, config),
  'GET /test/{id}': (id, config) => api.get<Test>(`/test/${id}`, config),
  api: api,
});

export interface User {
  email: string;
  scopes?: string[];
}

export interface Test {
  text: string;
  user?: User;
  [key: string]: unknown;
}

export interface AxiosOapiInstance {
  'POST /test/{id}': (id: string, data: User, config?: AxiosRequestConfig) => Promise<AxiosResponse<Test>>;
  'GET /test/{id}': (id: string, config?: AxiosRequestConfig) => Promise<AxiosResponse<Test>>;
  api: AxiosInstance;
}
```

And you can then use it like this:

> [examples/axios.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/axios.ts)

```typescript
import axios from 'axios';
import { axiosOapi } from './__generated__/axios.yaml';
import * as nock from 'nock';

/**
 * Mock the simple rest api so we can test it out
 */
nock('http://simple.example.com')
  .get('/test/20')
  .reply(200, { text: 'test' })
  .post('/test/30')
  .reply(200, { text: 'test', user: { email: 'test@example.com' } });

/**
 * Wrap an axios instance. This will add typed functions with the name of the paths
 */
const simple = axiosOapi(axios.create({ baseURL: 'http://simple.example.com' }));

simple['GET /test/{id}']('20').then(({ data }) => console.log(data));

simple['POST /test/{id}']('30', { email: 'test2example.com' }).then(({ data }) =>
  console.log(data),
);
```

## Complex example

If we use swagger's [petstore.json](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/petstore.json) example, we can generate the [petstore types](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/__generated__/petstore.json.ts) and use them like this:

> [examples/axios-petstore.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar-cli/examples/axios-petstore.ts)

```typescript
import { axiosOapi } from './__generated__/petstore.json';
import axios from 'axios';

const petstore = axiosOapi(axios.create({ baseURL: 'https://petstore.swagger.io/v2' }));

const main = async () => {
  const { data: pixel } = await petstore['PUT /pet']({
    name: 'Pixel',
    photoUrls: ['https://placekitten.com/g/200/300'],
    tags: [{ name: 'axios-oapi-cli' }],
  });

  console.log('SAVED', pixel);

  const { data: retrievedPixel } = await petstore['GET /pet/{petId}'](pixel.id!);

  console.log('RETRIEVED', retrievedPixel);

  // Use the underlying api to perform custom requests
  const { data: inventory } = await petstore.api.get('/store/inventory');
  console.log('INVENTORY', inventory);
};

main();
```

## STDIN / STDOUT and piping

If you don't include "output" the cli will output to stdout. You can use this to chain with other processors like prettier

```sh
yarn laminar axios --file examples/simple.yaml | prettier --stdin-filepath examples/simple.types.ts > examples/simple.types.ts
```

If you omit the "file" option, stdin will be used. This can be used to pipe the file contents from somewhere else (like curl). By default it will asume the content to be json.

```sh
curl http://example.com/simple.json | yarn laminar axios --output examples/simple.types.ts
```

You can specify that the openapi content is yaml too:

```sh
curl http://example.com/simple.yaml | yarn laminar axios --output examples/simple.types.ts --stdin-type yaml
```
