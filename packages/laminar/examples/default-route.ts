import { get, router, start, jsonOk, textNotFound, HttpServer } from '@ovotech/laminar';

const server = new HttpServer({
  app: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    async () => textNotFound('Woopsy'),
  ),
});

start([server], console);
