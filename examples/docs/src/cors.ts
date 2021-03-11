import { HttpServer, start, jsonOk, openApi, corsMiddleware } from '@ovotech/laminar';
import { join } from 'path';

const findUser = (id: string) => ({ id, name: 'John' });

/**
 * Define cors with all of its options
 */
const cors = corsMiddleware({ allowOrigin: ['http://localhost', 'http://example.com'] });

const main = async () => {
  const app = await openApi({
    api: join(__dirname, '../schema/api.yaml'),
    paths: {
      '/user/{id}': { get: async ({ path }) => jsonOk(findUser(path.id)) },
    },
  });

  /**
   * Apply cors
   */
  const server = new HttpServer({ app: cors(app) });
  await start([server], console);
};

main();
