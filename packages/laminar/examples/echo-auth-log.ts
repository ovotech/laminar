import { HttpMiddleware, HttpApp, textForbidden, textOk, HttpServer, start } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: HttpApp = async (req) => textOk(req.body);

const server = new HttpServer({ app: log(auth(app)) });

start([server], console);
