import { get, HttpServer, router, staticAssets, jsonOk, start } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const server = new HttpServer({
    app: router(
      staticAssets('/my-folder', join(__dirname, 'assets')),
      get('/', async () => jsonOk({ health: 'ok' })),
    ),
  });
  await start([server], console);
};

main();
