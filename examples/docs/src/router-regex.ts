import { router, jsonOk, get, put, HttpServer, start } from '@ovotech/laminar';

// << app

const items: Record<string, string> = { 10: 'Dave', 20: 'Bob' };

/**
 * Returns a laminar App object
 */
const app = router(
  /**
   * You match pathnames with regex.
   * They need to start it with a ^ and should end it with $
   * Though that is not required and you can leave it out to create wildcard routes
   */
  get(/^\/names$/, async () => jsonOk(items)),

  /**
   * If a pathname has a capture group in it it would be captured and accessible with the `path` paramters array
   */
  get(/\/names\/(\d+)/, async ({ path: [id] }) => jsonOk(items[id])),

  /**
   * You can use other method helpers: get, post, del, patch, put, options are available
   */
  put(/^\/names$/, async ({ body }) => {
    items[body.id] = body.name;
    return jsonOk({ success: true });
  }),
);

// app

/**
 * Start the http service
 */
start([new HttpServer({ app })], console);
