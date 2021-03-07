import { get, HttpServer, router, staticAssets, jsonOk } from '@ovotech/laminar';
import { join } from 'path';

const main = async () => {
  const server = new HttpServer({
    app: router(
      staticAssets('/my-folder', join(__dirname, 'assets')),
      get('/', () => jsonOk({ health: 'ok' })),
    ),
  });
  await server.start();
  console.log(server.describe());
};

main();
