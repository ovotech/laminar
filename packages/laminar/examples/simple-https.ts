import { get, post, HttpServer, router, textOk, jsonOk } from '@ovotech/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const server = new HttpServer({
    port: 8443,
    https: {
      key: readFileSync(join(__dirname, 'key.pem')),
      cert: readFileSync(join(__dirname, 'cert.pem')),
    },
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
