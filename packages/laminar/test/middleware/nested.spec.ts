import axios from 'axios';
import { HttpServer, HttpMiddleware, HttpApp, jsonOk } from '../../src';

interface One {
  one: string;
}
interface Two {
  two: number;
}
interface Three {
  three: boolean;
}

const withOne: HttpMiddleware<One> = (next) => async (req) => next({ ...req, one: 'one' });

const withTwo: HttpMiddleware<Two, One> = (next) => (req) => next({ ...req, two: 2 });

const withThree: HttpMiddleware<Three> = (next) => async (req) => next({ ...req, three: false });

const httpApp: HttpApp<One & Two & Three> = async (req) => {
  const { one, two, three, url } = req;
  return jsonOk({ one, two, three, url: url.pathname });
};

const app: HttpApp = withOne(withTwo(withThree(httpApp)));

const appWithAutoAssign: HttpApp = withOne(
  withTwo(
    withThree(async (req) => {
      const { one, two, three, url } = req;
      return jsonOk({ one, two, three, url: url.pathname });
    }),
  ),
);

describe('Nested middleware', () => {
  it('Should propagate multiple middlewarres ', async () => {
    const server = new HttpServer({ app, port: 8095 });
    await server.start();
    const api = axios.create({ baseURL: 'http://localhost:8095' });
    try {
      const result = await api.get('/test2');

      expect(result.data).toEqual({ one: 'one', two: 2, three: false, url: '/test2' });
    } finally {
      await server.stop();
    }
  });

  it('Should be able to pass context automatically', async () => {
    const server = new HttpServer({ app: appWithAutoAssign, port: 8095 });
    const api = axios.create({ baseURL: 'http://localhost:8095' });
    try {
      await server.start();

      const result = await api.get('/test2');

      expect(result.data).toEqual({ one: 'one', two: 2, three: false, url: '/test2' });
    } finally {
      await server.stop();
    }
  });
});
