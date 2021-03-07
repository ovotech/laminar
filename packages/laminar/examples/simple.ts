import { get, post, HttpServer, router, jsonOk, textOk } from '@ovotech/laminar';

const main = async () => {
  const server = new HttpServer({
    app: router(
      get('/.well-known/health-check', () => jsonOk({ health: 'ok' })),
      post('/test', () => textOk('submited')),
      get('/test', () => textOk('index')),
    ),
  });
  await server.start();

  console.log(server.describe());
};

main();
