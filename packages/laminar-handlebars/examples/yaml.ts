import { init, router, get, HttpService } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({
  dir: join(__dirname, 'templates-yaml'),
  views: 'yaml',
  extension: 'hbr',
  headers: { 'Content-type': 'text/yaml' },
});

const http = new HttpService({
  listener: handlebars(
    router(
      get('/', async ({ hbs }) => hbs('index.yaml', {}, { status: 400, headers: { 'X-Index': 'true' } })),
      get('/swagger.yaml', async ({ hbs }) => hbs('swagger.yaml', { version: 10 })),
    ),
  ),
});

init({ services: [http], logger: console });
