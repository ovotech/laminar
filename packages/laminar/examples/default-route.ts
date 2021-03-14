import { get, router, init, jsonOk, textNotFound, HttpServer } from '@ovotech/laminar';

const http = new HttpServer({
  app: router(
    get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
    async () => textNotFound('Woopsy'),
  ),
});

init({ services: [http], logger: console });
