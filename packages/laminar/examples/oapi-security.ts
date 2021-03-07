import { HttpServer, jsonOk, jsonUnauthorized, openApi, securityOk } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi-security.yaml');

const main = async () => {
  const app = await openApi({
    api,
    security: {
      MySecurity: ({ headers }) =>
        headers.authorization === 'Bearer my-secret-token'
          ? securityOk({ email: 'me@example.com' })
          : jsonUnauthorized({ message: 'Unauthorized user' }),
    },
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
