# It's all about flows

Why "Laminar"? From phisics (well wikipedia really) laminar flow is characterized by fluid particles following smooth paths in layers with each layer moving smoothly past the adjacent layers with little or no mixing.

I wanted to create a way to write rest apis in node using the full power of TypeScript so you can know at compile time if anything is wrong.

This will take a couple of steps to explain properly, but I promise it'll be worth it.

Lets see the simplest possible app with laminar, a very simple echo app

> [packages/laminar/examples/echo.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo.ts)

```typescript
import { HttpServer, response, start } from '@ovotech/laminar';

const server = new HttpServer({ app: async ({ body }) => response({ body }) });

start([server], console);
```

It consists of a function that gets the body of the request from the current request context, and returns it as a response. Echo.
No paths, routes or other complications.

Pretty simple, but what if we wanted to add some authentication? This is usually done by having extra code run just before the response processing, to determine if we should execute it or not. Basic stuff I know but bear with me.

Lets just assume that if Authorization header is `Me` then it's me and its fine, otherwise it must be someone else.
We can go ahead and write a middleware, that would do stuff just before passing stuff to the next middleware.

> [packages/laminar/examples/echo-auth.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo-auth.ts)

```typescript
import { HttpServer, textForbidden, textOk, HttpApp, HttpMiddleware, start } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const app: HttpApp = async (req) => textOk(req.url.toString());

const server = new HttpServer({ app: auth(app) });

start([server], console);
```

Notice that we actually execute the next middleware _inside_ our auth middleware. This allows us to do stuff before and after whatever follows. For example say we wanted to log what the request and response was.

> [packages/laminar/examples/echo-auth-log.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo-auth-log.ts)

```typescript
import { HttpMiddleware, HttpApp, textForbidden, textOk, HttpServer, start } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: HttpApp = async (req) => textOk(req.body);

const server = new HttpServer({ app: log(auth(app)) });

start([server], console);
```

You can see how we can string those middlewares along `log(auth(app))` as just function calls. But that's not all that impressive. Where this approach really shines is when we want to modify the context to pass state to middlewares downstream, and we want to make sure that is statically typed. E.g. we want typescript to complain and bicker if we attempt to use a middleware that requires something from the context, that hasn't yet been set.

A simple example would be access to an external resource, say a database. We want a middleware that creates a connection, passes that connection to all the middlewares downstream that would make use of it like checking users. But we'd like to be sure that middleware has actually executed, so we don't accidentally try to access a connection that's not there.

Lets see how we can go about doing that.

> [packages/laminar/examples/echo-auth-log-db.ts](https://github.com/ovotech/laminar/tree/main/packages/laminar/examples/echo-auth-log-db.ts)

```typescript
import { HttpMiddleware, HttpApp, textForbidden, jsonOk, HttpServer, start } from '@ovotech/laminar';

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

const auth: HttpMiddleware = (next) => async (req) =>
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
const app: HttpApp<RequestDB> = async (req) => jsonOk({ url: req.url.toString(), user: req.db.getValidUser() });

const db = createDbMiddleware();

const server = new HttpServer({ app: log(db(auth(app))) });

start([server], console);
```

We have a convenience type `Middleware<TProvide, TRequre>` that state what context does it provide to all the middleware downstream of it, and what context does it require from the one upstream of it.

This allows you to be absolutely sure that the middlewares are executed, and in the right order. If you try to play around with them - you'll see that if for example you put db after auth or remove it altogether, then it won't compile at all.

So its a flow of context down the middlewares, but since its an ordered flow, we call it "laminar".

That `log(db(auth(app)))` bit is your whole application and it is just converting the request context (body, headers, path, etc) to the appropriate response. A laminar http server is nothing more than:

```typescript
import { createServer } from 'http';

const resolver = log(db(auth(app)));

createServer(async (request, response) => {
  const result = await resolver(request);
  response.statusCode = result.status;
  response.end(result.body);
});
```
