import { get, put, HttpServer, router, jsonOk, jsonNotFound, start } from '@ovotech/laminar';

const users: Record<string, string> = {
  '1': 'John',
  '2': 'Foo',
};

const server = new HttpServer({
  app: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    get('/users', async () => jsonOk(users)),
    get('/users/{id}', async ({ path }) => jsonOk(users[path.id])),
    put('/users/{id}', async ({ path, body }) => {
      users[path.id] = body;
      return jsonOk(users[path.id]);
    }),
    // Default URL handler
    async ({ url }) => jsonNotFound({ message: `This url ${url} was not found` }),
  ),
});

start([server], console);
