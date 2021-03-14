import { HttpServer, response, init } from '@ovotech/laminar';

const http = new HttpServer({ app: async ({ body }) => response({ body }) });

init({ services: [http], logger: console });
