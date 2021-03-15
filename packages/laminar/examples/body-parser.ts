import {
  HttpService,
  HttpListener,
  textOk,
  BodyParser,
  concatStream,
  defaultBodyParsers,
  init,
} from '@ovotech/laminar';

const csvParser: BodyParser = {
  name: 'CsvParser',
  match: /text\/csv/,
  parse: async (body) => String(await concatStream(body)).split(','),
};

const listener: HttpListener = async ({ body }) => textOk(JSON.stringify(body));

const http = new HttpService({
  listener,
  bodyParsers: [csvParser, ...defaultBodyParsers],
});

init({ services: [http], logger: console });
