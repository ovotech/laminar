import { HttpServer, start, textOk, corsMiddleware } from '@ovotech/laminar';

const app = async () => textOk('OK');

// << middleware

/**
 * Regex middleware, matching http://localhost, https://localhost, http://example.com, https://example.com
 */
const cors = corsMiddleware({ allowOrigin: /https?\:\/\/(localhost|example\.com)/ });

// middleware

/**
 * Apply cors and start http server
 */
start([new HttpServer({ app: cors(app) })], console);
