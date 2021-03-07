import { get, router, jsonOk, textNotFound, HttpServer } from '@ovotech/laminar';

const server = new HttpServer({
  app: router(
    get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
    () => textNotFound('Woopsy'),
  ),
});

server.start().then((server) => console.log(server.describe()));
