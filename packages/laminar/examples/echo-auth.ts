import { HttpService, textForbidden, textOk, HttpListener, HttpMiddleware, init } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const app: HttpListener = async (req) => textOk(req.url.toString());

const http = new HttpService({ listener: auth(app) });

init({ services: [http], logger: console });
