import { HttpService, jsonOk, jsonUnauthorized, openApi, securityOk, init } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi-security.yaml');

const main = async () => {
  const listener = await openApi({
    api,
    security: {
      MySecurity: ({ headers }) =>
        headers.authorization === 'Bearer my-secret-token'
          ? securityOk({ email: 'me@example.com' })
          : jsonUnauthorized({ message: 'Unauthorized user' }),
    },
    paths: {
      '/user': {
        post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: async () => jsonOk({ email: 'me@example.com' }),
      },
    },
  });
  const http = new HttpService({ listener });
  await init({ services: [http], logger: console });
};

main();
