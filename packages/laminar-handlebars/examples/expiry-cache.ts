import { init, router, get, post, HttpServer } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html'), cacheType: 'expiry' });

const server = new HttpServer({
  app: handlebars(
    router(
      get('/', async ({ hbs }) => hbs('index')),
      post('/result', async ({ hbs, body: { name } }) => hbs('result', { name })),
    ),
  ),
});

init({ services: [server], logger: console });
