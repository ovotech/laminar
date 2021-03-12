import { HttpServer, textForbidden, textOk, HttpApp, HttpMiddleware, init } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const app: HttpApp = async (req) => textOk(req.url.toString());

const server = new HttpServer({ app: auth(app) });

init([server], console);
