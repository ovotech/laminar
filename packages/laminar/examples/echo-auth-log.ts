import { HttpMiddleware, HttpApp, textForbidden, textOk, HttpServer } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: HttpApp = (req) => textOk(req.body);

const server = new HttpServer({ app: log(auth(app)) });
server.start().then((server) => console.log(server.describe()));
