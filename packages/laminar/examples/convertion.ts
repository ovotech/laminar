import { HttpServer, jsonOk, openApi } from '@ovotech/laminar';
import { join } from 'path';

const api = join(__dirname, 'convertion.yaml');

const main = async () => {
  const app = await openApi({
    api,
    paths: {
      '/user': {
        post: ({ body }) => jsonOk({ result: 'ok', user: body }),
        /**
         * The Date object will be converted to a string
         * undefined values will be cleaned up
         */
        get: () =>
          jsonOk({
            email: 'me@example.com',
            createdAt: new Date('2020-01-01T12:00:00Z'),
            title: undefined,
          }),
      },
    },
  });
  const server = new HttpServer({ app });
  await server.start();
  console.log(server.describe());
};

main();
