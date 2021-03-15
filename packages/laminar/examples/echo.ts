import { HttpService, response, init } from '@ovotech/laminar';

const http = new HttpService({ listener: async ({ body }) => response({ body }) });

init({ services: [http], logger: console });
