import { HttpServer, response, start } from '@ovotech/laminar';

const server = new HttpServer({ app: async ({ body }) => response({ body }) });

start([server], console);
