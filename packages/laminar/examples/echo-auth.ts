import { HttpServer, textForbidden, textOk, HttpApp, HttpMiddleware } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const app: HttpApp = (req) => textOk(req.url.toString());

const server = new HttpServer({ app: auth(app) });

server.start().then((server) => console.log(server.describe()));
