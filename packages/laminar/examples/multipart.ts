import { HttpServer, jsonOk, init } from '@ovotech/laminar';

const http = new HttpServer({
  app: async ({ body }) => jsonOk({ name: body.name, file: body['my-file'][0].data.toString() }),
});

init({ services: [http], logger: console });
