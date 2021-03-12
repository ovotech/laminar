# Customizing Http Server

Lets see how we can configure the http server function.

By default laminar has a few middleware built in. They work just as normal middleware and are responsible for parsing the request body, the response, URL, cookies and query string and error handling. This is all done under the hood, but you can configure some aspects of it using `options`

## Custom body parsers

The default body parsers handle json, url encoded (application/x-www-form-urlencoded) and any text request bodies. You can add / modify the parsers using the `bodyParsers` array in the options:

> [examples/docs/src/custom-body-parser.ts:(app)](https://github.com/ovotech/laminar/tree/main/examples/docs/src/custom-body-parser.ts#L2-L25)

```typescript
import * as YAML from 'yaml';

const app: HttpApp = async ({ body }) => jsonOk(body);

const yamlParser: BodyParser = {
  match: (contentType) => contentType === 'application/yaml',
  /**
   * The data comes as a raw http.incommingMessage so we need to convert it to a string first
   * Some parsers could take advantage of this and use a streaming parser instead for added performance
   */
  parse: async (stream) => YAML.parse((await concatStream(stream)) ?? ''),
};

const server = new HttpServer({
  app,
  /**
   * You can configure the request body parsers using `bodyParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers too
   */
  bodyParsers: [yamlParser, ...defaultBodyParsers],
});
```

## Custom response parsers

You can add custom response parsers as well. That way you can pass the response body as any object you need, and based on the content type you can convert it to a string to be sent over the wire.

> [examples/docs/src/custom-response-parser.ts:(app)](https://github.com/ovotech/laminar/tree/main/examples/docs/src/custom-response-parser.ts#L2-L22)

```typescript
import * as YAML from 'yaml';

const app: HttpApp = async () => yaml(ok({ body: { example: { test: 'msg' } } }));

const yamlParser: ResponseParser = {
  match: (contentType) => contentType === 'application/yaml',
  parse: (yaml) => YAML.stringify(yaml),
};

const server = new HttpServer({
  app,
  /**
   * You can configure the response parsers using `responseParsers`
   * If we want to keep all the default ones though, so we pass the default body parsers first
   */
  responseParsers: [...defaultResponseParsers, yamlParser],
});
```

## Custom error handler

You can define a default error handler if you want a more customised way to handle errors.

> [examples/docs/src/custom-error-handler.ts:(app)](https://github.com/ovotech/laminar/tree/main/examples/docs/src/custom-error-handler.ts#L2-L16)

```typescript
const app: HttpApp = () => {
  throw new Error('Testing error');
};

const errorHandler: HttpErrorHandler = async ({ error }) => htmlInternalServerError(`<html>${error.message}</html>`);

const server = new HttpServer({
  app,
  /**
   * You can configure the default error handler with `errorHandler`
   */
  errorHandler,
});
```

## Custom everything

If you want to skip the default parser / processors, you can combine all the pieces in a different configuration, customizing everything

> [examples/docs/src/custom-everything.ts](https://github.com/ovotech/laminar/tree/main/examples/docs/src/custom-everything.ts)

```typescript
import { toRequestListener, response, HttpApp, errorsMiddleware, toHttpRequest } from '@ovotech/laminar';
import { createServer } from 'http';

/**
 * A resolver is a function that gets a raw request and returns a Response object.
 * By default the requestListener would supply only the raw unprocessed incomming message
 */
const app: HttpApp = async ({ incommingMessage }) => response({ body: incommingMessage.url });

export const server = createServer(
  {},
  toRequestListener((msg) => app(toHttpRequest(msg))),
);

/**
 * We can add back a few the default components for our app
 */
const errorHandler = errorsMiddleware();
const appWithErrorHandler = errorHandler(app);

export const serverWithErrorHandling = createServer(
  {},
  toRequestListener((msg) => appWithErrorHandler(toHttpRequest(msg))),
);
```
