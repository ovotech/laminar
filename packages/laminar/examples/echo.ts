import { HttpServer, response, init } from '@ovotech/laminar';

const server = new HttpServer({ app: async ({ body }) => response({ body }) });

init([server], console);
