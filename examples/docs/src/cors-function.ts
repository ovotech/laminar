import { HttpServer, start, textOk, corsMiddleware } from '@ovotech/laminar';

const app = async () => textOk('OK');

// << middleware

/**
 * allowOrigin can be a function
 */
const cors = corsMiddleware({ allowOrigin: (origin) => origin.endsWith('.com') });

// middleware

/**
 * Apply cors and start http server
 */
start([new HttpServer({ app: cors(app) })], console);
