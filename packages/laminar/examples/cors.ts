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
