import { loggerMiddleware, HttpService, init, pgMiddleware, PgService } from '@ovotech/laminar';
import { Pool } from 'pg';
import { routes } from './routes';

const main = async () => {
  if (process.env.PG === undefined) {
    throw new Error('Need PG env variable');
  }

  if (process.env.PORT === undefined) {
    throw new Error('Need PORT env variable');
  }

  const pg = new PgService(new Pool({ connectionString: process.env.PG }));

  const withLogger = loggerMiddleware(console);
  const withPg = pgMiddleware(pg);

  const listener = withLogger(withPg(routes));

  const server = new HttpService({ listener, port: Number(process.env.PORT) });
  await init({ services: [pg, server], logger: console });
};

main();
