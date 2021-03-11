import { HttpServer, HttpApp, textOk, BodyParser, concatStream, defaultBodyParsers, start } from '@ovotech/laminar';

const csvParser: BodyParser = {
  match: (contentType) => contentType === 'text/csv',
  parse: async (body) => String(await concatStream(body)).split(','),
};

const app: HttpApp = async ({ body }) => textOk(JSON.stringify(body));

const server = new HttpServer({
  app,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

start([server], console);
