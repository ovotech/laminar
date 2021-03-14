import { HttpServer, HttpApp, textOk, BodyParser, concatStream, defaultBodyParsers, init } from '@ovotech/laminar';

const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => String(await concatStream(body)).split(','),
};

const app: HttpApp = async ({ body }) => textOk(JSON.stringify(body));

const http = new HttpServer({
  app,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

init({ services: [http], logger: console });
