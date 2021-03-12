import axios from 'axios';
import {
  del,
  get,
  HttpServer,
  options,
  patch,
  post,
  put,
  redirect,
  router,
  responseTimeMiddleware,
  HttpMiddleware,
  httpLoggingMiddleware,
  staticAssets,
  jsonOk,
  textOk,
  LoggerLike,
  RequestLogging,
  jsonNotFound,
  file,
  HttpError,
  HttpApp,
  start,
  stop,
} from '../src';
import { join } from 'path';
import { readFileSync, createReadStream } from 'fs';
import { Agent } from 'https';
import { URLSearchParams } from 'url';

describe('Integration', () => {
  it('Should respect timeout', async () => {
    const app: HttpApp = () => new Promise((resolve) => setTimeout(() => resolve(textOk('OK')), 100));
    const port = 8051;

    const server = new HttpServer({ port, app, timeout: 50 });
    try {
      await start([server]);

      const error = await axios.get(`http://localhost:${port}`).catch((error) => error);
      expect(error.message).toEqual('socket hang up');
    } finally {
      await stop([server]);
    }
  });

  it('Should allow TLS', async () => {
    const app = jest.fn().mockReturnValue(textOk('TLS Test'));
    const port = 8051;
    const key = readFileSync(join(__dirname, '../examples/key.pem'));
    const cert = readFileSync(join(__dirname, '../examples/cert.pem'));
    const ca = readFileSync(join(__dirname, '../examples/ca.pem'));

    const server = new HttpServer({ port, app, https: { key, cert } });
    try {
      await server.start();

      const response = await axios.get(`https://localhost:${port}`, {
        httpsAgent: new Agent({ ca }),
      });
      expect(response.data).toEqual('TLS Test');
    } finally {
      await server.stop();
    }
  });

  it('Should process response', async () => {
    const loggerMock: LoggerLike = { info: jest.fn(), error: jest.fn(), debug: jest.fn(), warn: jest.fn() };
    const logging = httpLoggingMiddleware(loggerMock);
    const responseTime = responseTimeMiddleware();

    interface DBRequest {
      getUser: (id: string) => string | undefined;
      delUser: (id: string) => void;
      setUser: (id: string, name: string) => void;
    }

    const db: HttpMiddleware<DBRequest> = (next) => {
      const users: { [key: string]: string } = {
        10: 'John',
        20: 'Tom',
      };

      const dbReq: DBRequest = {
        getUser: (id) => users[id],
        setUser: (id, name) => {
          users[id] = name;
        },
        delUser: (id) => {
          delete users[id];
        },
      };

      return (req) => next({ ...req, ...dbReq });
    };

    const app = router<RequestLogging & DBRequest>(
      staticAssets('/assets', join(__dirname, '../examples/assets')),
      get('/.well-known/health-check', async () => jsonOk({ health: 'ok' })),
      get('/link', async () => redirect('http://localhost:8050/destination')),
      get('/http-error', async () => {
        throw new HttpError(
          302,
          { message: 'Redirect to http://localhost:8050/destination' },
          { location: 'http://localhost:8050/destination' },
        );
      }),
      get('/link-other', async () =>
        redirect('http://localhost:8050/destination', { headers: { Authorization: 'Bearer 123' } }),
      ),
      get('/destination', async () => jsonOk({ arrived: true })),
      get('/stream-file', async () => textOk(createReadStream(join(__dirname, '../examples/assets/texts/one.txt')))),
      get('/return-file', async () => file(join(__dirname, '../examples/assets/texts/one.txt'), {})),
      get('/error', () => {
        throw new Error('unknown');
      }),
      options('/users/{id}', async () =>
        textOk('', {
          'Access-Control-Allow-Origin': 'http://localhost:8050',
          'Access-Control-Allow-Methods': 'GET,POST,DELETE',
        }),
      ),
      get('/users/{id}', async ({ path, logger, getUser }) => {
        logger.info(`Getting id ${path.id}`);
        const user = getUser(path.id);

        if (user) {
          return Promise.resolve(jsonOk({ id: path.id, name: user }));
        } else {
          return jsonNotFound({ message: 'No User Found' });
        }
      }),
      put('/users', async ({ body, logger, setUser }) => {
        logger.info(`Test Body ${body.name}`);
        setUser(body.id, body.name);
        return jsonOk({ added: true });
      }),
      patch('/users/{id}', async ({ path, body, getUser, setUser }) => {
        const user = getUser(path.id);
        if (user) {
          setUser(body.id, body.name);
          return jsonOk({ patched: true });
        } else {
          return jsonNotFound({ message: 'No User Found' });
        }
      }),
      post('/users/{id}', async ({ path, body, getUser, setUser }) => {
        const user = getUser(path.id);
        if (user) {
          setUser(path.id, body.name);
          return jsonOk({ saved: true });
        } else {
          return jsonNotFound({ message: 'No User Found' });
        }
      }),
      del('/users/{id}', async ({ path, getUser, delUser }) => {
        const user = getUser(path.id);
        if (user) {
          delUser(path.id);
          return jsonOk({ deleted: true });
        } else {
          return jsonNotFound({ message: 'No User Found' });
        }
      }),
      async ({ url }) => jsonNotFound(`Test url ${url.pathname} not found`),
    );

    const server = new HttpServer({ port: 8050, app: responseTime(db(logging(app))) });
    try {
      await server.start();

      const api = axios.create({ baseURL: 'http://localhost:8050' });

      await expect(api.get('/unknown-url').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: 'Test url /unknown-url not found',
      });

      await expect(api.get('/error').catch((error) => error.response)).resolves.toMatchObject({
        status: 500,
        data: { message: 'unknown' },
      });

      await expect(api.get('/return-file')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/plain' },
        data: 'one\n',
      });

      await expect(api.get('/stream-file')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/plain' },
        data: 'one\n',
      });

      await expect(api.get('/assets/star.svg')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'image/svg+xml' },
        data: readFileSync(join(__dirname, '../examples/assets/star.svg'), 'utf8'),
      });

      await expect(api.get('/assets/svg.svg')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'image/svg+xml' },
        data: readFileSync(join(__dirname, '../examples/assets/svg.svg'), 'utf8'),
      });

      await expect(api.get('/assets/texts/one.txt')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/plain' },
        data: readFileSync(join(__dirname, '../examples/assets/texts/one.txt'), 'utf8'),
      });

      await expect(api.get('/assets/texts/other.html')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: readFileSync(join(__dirname, '../examples/assets/texts/other.html'), 'utf8'),
      });

      await expect(api.get('/assets/texts/')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: readFileSync(join(__dirname, '../examples/assets/texts/index.html'), 'utf8'),
      });

      await expect(api.get('/assets/texts')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: readFileSync(join(__dirname, '../examples/assets/texts/index.html'), 'utf8'),
      });

      await expect(api.get('/assets/../assets/texts/../texts/./other.html')).resolves.toMatchObject({
        status: 200,
        headers: { 'content-type': 'text/html' },
        data: readFileSync(join(__dirname, '../examples/assets/texts/other.html'), 'utf8'),
      });

      await expect(api.get('/assets/../../test.html').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
      });

      await expect(api.get('/.well-known/health-check')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
      });

      await expect(api.get('/.well-known/health-check/')).resolves.toMatchObject({
        status: 200,
        data: { health: 'ok' },
      });

      await expect(api.get('/.well-known/health-check/other').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: 'Test url /.well-known/health-check/other not found',
      });

      await expect(api.get('/link')).resolves.toMatchObject({
        status: 200,
        data: { arrived: true },
      });

      await expect(api.get('/link', { maxRedirects: 0 }).catch((error) => error.response)).resolves.toMatchObject({
        status: 302,
        data: 'Redirecting to http://localhost:8050/destination',
      });

      await expect(api.get('/http-error')).resolves.toMatchObject({
        status: 200,
        data: { arrived: true },
      });

      await expect(api.get('/http-error', { maxRedirects: 0 }).catch((error) => error.response)).resolves.toMatchObject(
        {
          status: 302,
          data: { message: 'Redirect to http://localhost:8050/destination' },
        },
      );

      await expect(api.get('/link-other')).resolves.toMatchObject({
        status: 200,
        data: { arrived: true },
      });

      await expect(api.request({ url: '/users/10', method: 'OPTIONS' })).resolves.toMatchObject({
        status: 200,
        headers: expect.objectContaining({
          'access-control-allow-methods': 'GET,POST,DELETE',
          'access-control-allow-origin': 'http://localhost:8050',
        }),
      });

      await expect(api.get('/users/10')).resolves.toMatchObject({
        status: 200,
        data: { id: '10', name: 'John' },
      });

      await expect(api.get('/users/20')).resolves.toMatchObject({
        status: 200,
        data: { id: '20', name: 'Tom' },
      });

      await expect(api.get('/users/30').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: { message: 'No User Found' },
      });

      await expect(api.post('/users/10', { name: 'Kostas' })).resolves.toMatchObject({
        status: 200,
        data: { saved: true },
      });

      await expect(api.patch('/users/20', { name: 'Pathing' })).resolves.toMatchObject({
        status: 200,
        data: { patched: true },
      });

      await expect(api.patch('/users/20', new URLSearchParams({ name: 'Pathing2' }))).resolves.toMatchObject({
        status: 200,
        data: { patched: true },
      });

      await expect(api.get('/users/10')).resolves.toMatchObject({
        status: 200,
        data: { id: '10', name: 'Kostas' },
      });

      await expect(api.delete('/users/10')).resolves.toMatchObject({
        status: 200,
        data: { deleted: true },
      });

      await expect(api.get('/users/10').catch((error) => error.response)).resolves.toMatchObject({
        status: 404,
        data: { message: 'No User Found' },
      });

      await expect(api.put('/users', { id: 30, name: 'Added' })).resolves.toMatchObject({
        status: 200,
        data: { added: true },
      });

      await expect(api.get('/users/30')).resolves.toMatchObject({
        status: 200,
        data: { id: '30', name: 'Added' },
      });

      expect(loggerMock.info).toHaveBeenNthCalledWith(1, 'Request', {
        request: 'GET /unknown-url',
      });
      expect(loggerMock.info).toHaveBeenNthCalledWith(2, 'Response', {
        request: 'GET /unknown-url',
        status: 404,
        contentType: 'application/json',
      });
      expect(loggerMock.error).toHaveBeenNthCalledWith(1, 'Error', {
        request: 'GET /error',
        message: 'unknown',
        stack: expect.any(String),
      });
    } finally {
      await server.stop();
    }
  });
});
