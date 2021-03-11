import { router, jsonOk, get, staticAssets, htmlNotFound, start, HttpServer } from '@ovotech/laminar';
import { join } from 'path';

// << app

const app = router(
  get('/.well-known/health-check', async () => jsonOk({ success: 'ok' })),
  /**
   * You can pass configuration options
   */
  staticAssets('/my-assets', join(__dirname, '../assets'), {
    index: 'index.htm',
    acceptRanges: false,
    indexNotFound: async () => htmlNotFound('<html>Not Found</html>'),
    fileNotFound: async () => htmlNotFound('<html>No File</html>'),
  }),
);

// app

/**
 * Start the http service
 */
start([new HttpServer({ app })], console);
