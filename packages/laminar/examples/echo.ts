import { HttpServer, response } from '@ovotech/laminar';

const server = new HttpServer({ app: ({ body }) => response({ body }) });

server.start().then((server) => console.log(server.describe()));
