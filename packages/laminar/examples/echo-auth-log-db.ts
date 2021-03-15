import { HttpMiddleware, HttpListener, textForbidden, jsonOk, HttpService, init } from '@ovotech/laminar';

/**
 * Its a very simple database, that only has one function:
 * Return the user that is valid, e.g. Me
 */
interface DB {
  getValidUser: () => string;
}

interface DBContext {
  db: DB;
}

/**
 * Since any database would need to create a connection first,
 * We'll need to have a "middleware creator" function that executes
 * and returns the actual middleware
 */
const createDbMiddleware = (): HttpMiddleware<DBContext> => {
  const db: DB = { getValidUser: () => 'Me' };
  return (next) => (req) => next({ ...req, db });
};

const auth: HttpMiddleware = (next) => async (req) =>
  req.headers.authorization === 'Me' ? next(req) : textForbidden('Not Me');

const log: HttpMiddleware = (next) => (req) => {
  console.log('Requested', req.body);
  const response = next(req);
  console.log('Responded', response);
  return response;
};

/**
 * We can now require this app to have the middleware.
 * If the propper ones are not executed later, TypeScript will inform us at compile time.
 */
const app: HttpListener<DBContext> = async (req) => jsonOk({ url: req.url.toString(), user: req.db.getValidUser() });

const db = createDbMiddleware();

const http = new HttpService({ listener: log(db(auth(app))) });

init({ services: [http], logger: console });
