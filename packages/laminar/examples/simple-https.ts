import { get, post, HttpService, router, textOk, jsonOk, init } from '@ovotech/laminar';
import { readFileSync } from 'fs';
import { join } from 'path';

const main = async () => {
  const http = new HttpService({
    port: 8443,
    https: {
      key: readFileSync(join(__dirname, 'key.pem')),
      cert: readFileSync(join(__dirname, 'cert.pem')),
    },
    listener: router(
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      post('/test', async () => textOk('submited')),
      get('/test', async () => textOk('index')),
    ),
  });
  await init({ services: [http], logger: console });
};

main();
