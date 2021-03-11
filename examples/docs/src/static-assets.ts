import { router, jsonOk, get, staticAssets, start, HttpServer } from '@ovotech/laminar';
import { join } from 'path';

// << app

const app = router(
  get('/.well-known/health-check', async () => jsonOk({ success: 'ok' })),
  /**
   * All the files from the 'assets' directory are going to be served
   */
  staticAssets('/my-assets', join(__dirname, '../assets')),
);

// app

/**
 * Start the http service
 */
start([new HttpServer({ app })], console);
