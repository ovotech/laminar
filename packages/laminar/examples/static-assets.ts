import { get, HttpServer, router, staticAssets, jsonOk, init } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const http = new HttpServer({
    app: router(
      staticAssets('/my-folder', join(__dirname, 'assets')),
      get('/', async () => jsonOk({ health: 'ok' })),
    ),
  });
  await init({ services: [http], logger: console });
};

main();
