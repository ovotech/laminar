import { jsonOk, get, put, HttpService, router, corsMiddleware, init } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const cors = corsMiddleware({
  allowOrigin: (origin) => ['http://example.com', 'http://localhost'].includes(origin),
});

const http = new HttpService({
  listener: cors(
    router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      get('/users', async () => jsonOk(users)),
      get('/users/{id}', async ({ path }) => jsonOk(users[path.id])),
      put('/users/{id}', async ({ path, body }) => {
        users[path.id] = body;
        return jsonOk(users[path.id]);
      }),
    ),
  ),
});
init({ services: [http], logger: console });
