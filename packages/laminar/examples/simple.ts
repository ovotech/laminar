import { get, post, HttpService, router, jsonOk, textOk, init } from '@ovotech/laminar';

const main = async () => {
  const http = new HttpService({
    listener: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      post('/test', async () => textOk('submited')),
      get('/test', async () => textOk('index')),
    ),
  });
  await init({ services: [http], logger: console });
};

main();
