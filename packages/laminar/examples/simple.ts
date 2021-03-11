import { get, post, HttpServer, router, jsonOk, textOk, start } from '@ovotech/laminar';

const main = async () => {
  const server = new HttpServer({
    app: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      post('/test', async () => textOk('submited')),
      get('/test', async () => textOk('index')),
    ),
  });
  await start([server], console);
};

main();
