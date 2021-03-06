import { start, router, get, post, httpServer, describe } from '@ovotech/laminar';
import { handlebarsMiddleware } from '@ovotech/laminar-handlebars';
import { join } from 'path';

const handlebars = handlebarsMiddleware({ dir: join(__dirname, 'templates-html') });

const server = httpServer({
  app: handlebars(
    router(
      get('/', ({ hbs }) => hbs('index')),
      post('/result', ({ hbs, body: { name } }) => hbs('result', { name })),
    ),
  ),
});

start(server).then(() => console.log(describe(server)));
