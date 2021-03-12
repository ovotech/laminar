import { get, post, HttpServer, router, jsonOk, textOk, init } from '@ovotech/laminar';

const main = async () => {
  const server = new HttpServer({
    app: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      post('/test', async () => textOk('submited')),
      get('/test', async () => textOk('index')),
    ),
  });
  await init([server], console);
};

main();
