import { HttpMiddleware, HttpListener, textForbidden, textOk, HttpService, init } from '@ovotech/laminar';

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

const app: HttpListener = async (req) => textOk(req.body);

const http = new HttpService({ listener: log(auth(app)) });

init({ services: [http], logger: console });
