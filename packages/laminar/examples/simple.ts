import { get, post, HttpServer, router, jsonOk, textOk, init } from '@ovotech/laminar';

const main = async () => {
  const http = new HttpServer({
    app: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      post('/test', async () => textOk('submited')),
      get('/test', async () => textOk('index')),
    ),
  });
  await init({ services: [http], logger: console });
};

main();
