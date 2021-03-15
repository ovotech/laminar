import { HttpService, init, jsonOk } from '@ovotech/laminar';
import { openApiTyped } from './__generated__/convertion.yaml';
import { join } from 'path';

const api = join(__dirname, 'convertion.yaml');

const main = async () => {
  const listener = await openApiTyped({
    api,
    paths: {
      '/user': {
        post: async ({ body }) => jsonOk({ result: 'ok', user: body }),
        /**
         * The Date object will be converted to a string
         * undefined values will be cleaned up
         */
        get: async () =>
          jsonOk({
            email: 'me@example.com',
            createdAt: new Date('2020-01-01T12:00:00Z'),
            title: undefined,
          }),
      },
    },
  });
  const server = new HttpService({ listener });
  await init({ services: [server], logger: console });
};

main();
