import { HttpServer, start, textOk, corsMiddleware } from '@ovotech/laminar';

const app = async () => textOk('OK');

// << middleware

const cors = corsMiddleware({
  /**
   * Allow origin can be a simple string
   */
  allowOrigin: 'http://localhost',
  /**
   * Allow credentials header
   */
  allowCredentials: true,
  /**
   * Allow methods header
   */
  allowMethods: ['POST', 'GET'],
  /**
   * Allow headers header
   */
  allowHeaders: ['Authorization', 'X-Authorization'],
});

// middleware

/**
 * Apply cors and start http server
 */
start([new HttpServer({ app: cors(app) })], console);
