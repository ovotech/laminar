import { HttpServer, jsonOk, openApi } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const app = await openApi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const server = new HttpServer({ app });
  await server.start();
  console.log(server.describe());
};

main();
