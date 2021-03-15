import { HttpService, jsonOk, init } from '@ovotech/laminar';

const http = new HttpService({
  listener: async ({ body }) => jsonOk({ name: body.name, file: body['my-file'][0].data.toString() }),
});

init({ services: [http], logger: console });
