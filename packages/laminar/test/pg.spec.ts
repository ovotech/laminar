import axios from 'axios';
import {
  HttpService,
  LoggerLike,
  Middleware,
  run,
  router,
  post,
  jsonOk,
  get,
  jsonNotFound,
  pgMiddleware,
  PgService,
} from '../src';
import { Pool } from 'pg';

export interface LoggerContext {
  logger: LoggerLike;
}

export const loggerMiddleware = (logger: LoggerLike): Middleware<LoggerContext> => (next) => (ctx) =>
  next({ ...ctx, logger });

describe('Integration', () => {
  it('Should start and stop services', async () => {
    const port = 10060;
    const loggerMock = {
      info: jest.fn(),
      error: jest.fn(),
      log: jest.fn(),
      notice: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    };
    const withLogger = loggerMiddleware(loggerMock);

    const pool = new PgService(
      new Pool({
        connectionString: 'postgres://example-admin:example-pass@localhost:5432/example',
        max: 5,
      }),
    );
    const withPool = pgMiddleware(pool);

    const http = new HttpService({
      port,
      listener: withLogger(
        withPool(
          router(
            post('/create', async ({ logger, db, body }) => {
              logger.info('create', body);
              const result = await db.query<{ id: number }>('INSERT INTO animals (name) VALUES ($1) RETURNING id', [
                body.name,
              ]);
              return jsonOk({ id: result.rows?.[0].id });
            }),
            get('/pet/{id}', async ({ logger, db, path: { id } }) => {
              const result = await db.query('SELECT * FROM animals WHERE id = $1', [id]);
              logger.info('get', result.rows?.[0]?.name);
              return result.rows.length ? jsonOk(result.rows?.[0]) : jsonNotFound({ message: 'Pet not found ' });
            }),
          ),
        ),
      ),
    });

    await run({ services: [pool, http] }, async () => {
      const names = [...Array(100).keys()].map((key) => `test-${key}`);

      const results = await Promise.all(names.map((name) => axios.post(`http://localhost:${port}/create`, { name })));

      await Promise.all(results.map(({ data: { id } }) => axios.get(`http://localhost:${port}/pet/${id}`)));
    });
  });
});
