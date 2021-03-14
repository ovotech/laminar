import { init, router, get, post, HttpServer } from '@ovotech/laminar';
import { handlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const hbs = handlebars({ dir: join(__dirname, 'templates-html') });

const server = new HttpServer({
  app: router(
    get('/', async () => hbs('index')),
    post('/result', async ({ body: { name } }) => hbs('result', { name })),
  ),
});

init({ services: [server], logger: console });
