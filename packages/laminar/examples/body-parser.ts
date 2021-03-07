import { HttpServer, HttpApp, textOk, BodyParser, concatStream, defaultBodyParsers } from '@ovotech/laminar';

const csvParser: BodyParser = {
  match: (contentType) => contentType === 'text/csv',
  parse: async (body) => String(await concatStream(body)).split(','),
};

const app: HttpApp = ({ body }) => textOk(JSON.stringify(body));

const server = new HttpServer({
  app,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

server.start().then((server) => console.log(server.describe()));
