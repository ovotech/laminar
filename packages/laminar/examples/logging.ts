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
