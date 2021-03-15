import { get, put, HttpService, router, jsonOk, requestLoggingMiddleware, init } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const logging = requestLoggingMiddleware(console);

const http = new HttpService({
  listener: logging(
    router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      get('/users', async () => jsonOk(users)),
      get('/users/{id}', async ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', async ({ path, body, logger }) => {
        logger.info('putting');
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});

init({ services: [http], logger: console });
