import { get, put, HttpServer, router, jsonOk, httpLoggingMiddleware, init } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const logging = httpLoggingMiddleware(console);

const server = new HttpServer({
  app: logging(
    router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      get('/users', async () => jsonOk(users)),
      get('/users/{id}', async ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', async ({ path, body, logger }) => {
        logger.log('info', 'putting');
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});

init([server], console);
