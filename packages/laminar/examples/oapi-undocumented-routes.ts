import { HttpService, jsonOk, router, get, redirect, openApi, init } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'oapi.yaml');

const main = async () => {
  const listener = await openApi({
    api,
    paths: {
      '/user': {
        post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
        get: async () => jsonOk({ email: 'me@example.com' }),
      },
    },
    notFound: router(
      get('/old/{id}', async ({ path: { id } }) => redirect(`http://example.com/new/${id}`)),
      get('/old/{id}/pdf', async ({ path: { id } }) => redirect(`http://example.com/new/${id}/pdf`)),
    ),
  });

  const http = new HttpService({
    listener,
  });
  await init({ services: [http], logger: console });
};

main();
