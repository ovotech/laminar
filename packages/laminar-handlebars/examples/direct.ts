import { init, router, get, post, HttpService } from '@ovotech/laminar';
import { handlebars } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const hbs = handlebars({ dir: join(__dirname, 'templates-html') });

const http = new HttpService({
  listener: router(
    get('/', async () => hbs('index')),
    post('/result', async ({ body: { name } }) => hbs('result', { name })),
  ),
});

init({ services: [http], logger: console });
